package com.example.agent.scheduler;

import com.example.agent.ai.UserAiConfigService;
import com.example.agent.connection.ConnectionRepository;
import com.example.agent.connection.WebsiteConnection;
import com.example.agent.file.FileRepository;
import com.example.agent.file.GeneratedFile;
import com.example.agent.personalization.PersonalizationService;
import com.example.agent.task.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class ScheduledAutomationService {
    private static final Logger log = LoggerFactory.getLogger(ScheduledAutomationService.class);
    private static final Pattern JOB_INTENT_PATTERN = Pattern.compile(
            "\\b(job|jobs|vacancy|vacancies|opening|openings|career|careers|naukri|indeed|internshala|foundit|auto-apply)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private final ScheduledJobRepository jobRepo;
    private final ScheduledJobRunRepository runRepo;
    private final ConnectionRepository connectionRepo;
    private final TaskRepository taskRepo;
    private final ActionRepository actionRepo;
    private final FileRepository fileRepo;
    private final PersonalizationService personalizationService;
    private final UserAiConfigService aiConfigService;
    private final WorkerClient workerClient;
    private final ObjectMapper objectMapper;
    private final Set<UUID> runningJobIds = ConcurrentHashMap.newKeySet();

    public ScheduledAutomationService(
            ScheduledJobRepository jobRepo,
            ScheduledJobRunRepository runRepo,
            ConnectionRepository connectionRepo,
            TaskRepository taskRepo,
            ActionRepository actionRepo,
            FileRepository fileRepo,
            PersonalizationService personalizationService,
            UserAiConfigService aiConfigService,
            WorkerClient workerClient,
            ObjectMapper objectMapper
    ) {
        this.jobRepo = jobRepo;
        this.runRepo = runRepo;
        this.connectionRepo = connectionRepo;
        this.taskRepo = taskRepo;
        this.actionRepo = actionRepo;
        this.fileRepo = fileRepo;
        this.personalizationService = personalizationService;
        this.aiConfigService = aiConfigService;
        this.workerClient = workerClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Checks enabled schedules every 30 seconds across DAILY, WEEKDAYS, and HOURLY cadences.
     */
    @Scheduled(fixedDelay = 30000)
    public void tickSchedules() {
        List<ScheduledJob> enabledJobs = jobRepo.findByEnabledTrue();
        for (ScheduledJob job : enabledJobs) {
            if (job.getUserId() == null) {
                continue;
            }
            try {
                ZoneId zone = resolveZone(job.getTimezone());
                ZonedDateTime now = ZonedDateTime.now(zone);
                String cadence = ScheduledJob.normalizeCadence(job.getCadence());
                String todayStr = now.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
                String hourSlot = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HH"));

                if ("HOURLY".equals(cadence)) {
                    if (hourSlot.equals(job.getLastRunSlot())) {
                        continue;
                    }
                    LocalTime targetTime = LocalTime.parse(job.getScheduleTime());
                    if (now.getMinute() < targetTime.getMinute()) {
                        continue;
                    }
                    if (now.getMinute() - targetTime.getMinute() > 15) {
                        continue;
                    }
                } else {
                    if ("WEEKDAYS".equals(cadence)) {
                        DayOfWeek dow = now.getDayOfWeek();
                        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
                            continue;
                        }
                    }
                    if (todayStr.equals(job.getLastRunDate())) {
                        continue;
                    }
                    LocalTime targetTime = LocalTime.parse(job.getScheduleTime());
                    LocalTime currentTime = now.toLocalTime();
                    boolean inWindow = !currentTime.isBefore(targetTime) && currentTime.isBefore(targetTime.plusMinutes(15));
                    if (!inWindow) {
                        continue;
                    }
                }

                executeSchedule(job.getId(), false);
            } catch (Exception ex) {
                log.warn("[Scheduler] Failed evaluating schedule {}: {}", job.getId(), ex.getMessage());
            }
        }
    }

    public Map<String, Object> executeSchedule(UUID scheduleId, boolean manualRun) {
        if (!runningJobIds.add(scheduleId)) {
            throw new IllegalStateException("This scheduled task is already running.");
        }

        ScheduledJob job = jobRepo.findById(scheduleId)
                .orElseThrow(() -> new NoSuchElementException("Scheduled task not found"));

        UUID ownerUserId = job.getUserId();
        if (ownerUserId == null) {
            runningJobIds.remove(scheduleId);
            throw new SecurityException("Scheduled task has no owner user and cannot execute safely.");
        }

        WebsiteConnection connection = null;
        if (job.getConnectionId() != null) {
            connection = connectionRepo.findByIdAndUserId(job.getConnectionId(), ownerUserId)
                    .orElseThrow(() -> new NoSuchElementException("Target website connection not found"));
        }

        String effectiveMode = resolveEffectiveMode(job, connection);
        ZoneId zone = resolveZone(job.getTimezone());
        ZonedDateTime zonedNow = ZonedDateTime.now(zone);
        String todayStr = zonedNow.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String hourSlot = zonedNow.format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HH"));

        String portalLabel = connection != null ? connection.getName() : "General AI";
        String taskPrompt = "[Scheduler: " + job.getName() + "] " + job.getRequirements();
        AgentTask task = taskRepo.save(new AgentTask(
                ownerUserId,
                connection != null ? connection.getId() : null,
                taskPrompt.length() > 1950 ? taskPrompt.substring(0, 1950) : taskPrompt
        ));
        task.update("RUNNING", null, null);
        taskRepo.save(task);

        actionRepo.save(new AgentAction(
                task.getId(),
                manualRun ? "MANUAL_SCHEDULE_RUN" : "SCHEDULE_TRIGGER",
                "Started " + job.getCadence() + " " + effectiveMode + " schedule on " + portalLabel + " (" + job.getScheduleTime() + " " + job.getTimezone() + ")",
                "COMPLETED"
        ));

        ScheduledJobRun run = runRepo.save(new ScheduledJobRun(job.getId(), task.getId(), "RUNNING"));

        if (!manualRun) {
            job.setLastRunDate(todayStr);
            job.setLastRunSlot(hourSlot);
        }
        job.setLastStatus("RUNNING");
        job.setLastRunAt(Instant.now());
        job.touch();
        jobRepo.save(job);

        try {
            Map<String, Object> personalContext = personalizationService.buildPersonalContextPayload(ownerUserId);
            Map<String, Object> aiConfig = aiConfigService.getDecryptedWorkerConfig(ownerUserId);
            String summary;
            int extractedCount = 0;
            int appliedOrActionCount = 0;
            Object matchedJobsPayload = List.of();

            if ("AI_CHAT".equals(effectiveMode) || connection == null) {
                Map<String, Object> chatRes = workerClient.askChat(job.getRequirements(), personalContext, List.of(), aiConfig);
                summary = String.valueOf(chatRes.getOrDefault("reply", "Scheduled AI prompt completed."));
                actionRepo.save(new AgentAction(task.getId(), "AI_CHAT_RESPONSE", "Generated scheduled AI response", "COMPLETED"));
                appliedOrActionCount = 1;
            } else if ("JOB_AUTOMATION".equals(effectiveMode)) {
                Map<String, Object> result = workerClient.runJobAutomation(
                        connection.getWebsiteUrl(),
                        job.getRequirements(),
                        job.getPreferredLocation(),
                        job.isAutoApply(),
                        job.getMaxApplyPerRun(),
                        personalContext,
                        ownerUserId,
                        aiConfig
                );
                summary = String.valueOf(result.getOrDefault("summary", "Scheduled job automation finished."));
                appliedOrActionCount = ((Number) result.getOrDefault("appliedCount", 0)).intValue();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> matchedJobs = (List<Map<String, Object>>) result.getOrDefault("matchedJobs", List.of());
                matchedJobsPayload = matchedJobs;
                extractedCount = matchedJobs.size();
                recordExecutionLogs(task.getId(), result);
                persistExtractedItems(task, result);
                if (!matchedJobs.isEmpty()) {
                    saveJobCsvReport(ownerUserId, task.getId(), connection.getName(), todayStr, matchedJobs);
                }
            } else {
                Map<?, ?> result = workerClient.inspect(
                        connection.getWebsiteUrl(),
                        job.getRequirements(),
                        personalContext,
                        null,
                        ownerUserId,
                        aiConfig
                );
                Object rawSummary = result.get("summary");
                summary = rawSummary != null ? String.valueOf(rawSummary) : ("Scheduled browser task completed on " + connection.getName());
                recordExecutionLogs(task.getId(), result);
                persistExtractedItems(task, result);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> records = result.containsKey("extractedRecords")
                        ? (List<Map<String, Object>>) result.get("extractedRecords")
                        : List.of();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> logs = result.containsKey("executionLogs")
                        ? (List<Map<String, Object>>) result.get("executionLogs")
                        : List.of();
                extractedCount = records.size();
                appliedOrActionCount = logs.size();

                if (!records.isEmpty()) {
                    saveGeneralRecordsCsvReport(ownerUserId, task.getId(), connection.getName(), todayStr, records);
                }
            }

            task.update("COMPLETED", summary, null);
            taskRepo.save(task);

            job.setLastStatus("COMPLETED");
            job.setLastSummary(summary);
            job.setLastMatchedCount(extractedCount);
            job.setLastAppliedCount(appliedOrActionCount);
            job.setLastRunAt(Instant.now());
            job.touch();
            jobRepo.save(job);

            run.complete("COMPLETED", extractedCount, appliedOrActionCount, summary);
            runRepo.save(run);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "COMPLETED");
            response.put("mode", effectiveMode);
            response.put("summary", summary);
            response.put("matchedCount", extractedCount);
            response.put("appliedCount", appliedOrActionCount);
            response.put("matchedJobs", matchedJobsPayload);
            response.put("schedule", job);
            response.put("run", run);
            return response;
        } catch (Exception ex) {
            String errMsg = "Scheduled run failed: " + ex.getMessage();
            task.update("FAILED", null, errMsg);
            taskRepo.save(task);
            actionRepo.save(new AgentAction(task.getId(), "SCHEDULE_ERROR", errMsg.length() > 950 ? errMsg.substring(0, 950) : errMsg, "FAILED"));

            job.setLastStatus("FAILED");
            job.setLastSummary(errMsg);
            job.setLastRunAt(Instant.now());
            job.touch();
            jobRepo.save(job);

            run.complete("FAILED", 0, 0, errMsg);
            runRepo.save(run);

            Map<String, Object> errResp = new LinkedHashMap<>();
            errResp.put("status", "FAILED");
            errResp.put("mode", effectiveMode);
            errResp.put("summary", errMsg);
            errResp.put("matchedCount", 0);
            errResp.put("appliedCount", 0);
            errResp.put("schedule", job);
            errResp.put("run", run);
            return errResp;
        } finally {
            runningJobIds.remove(scheduleId);
        }
    }

    private String resolveEffectiveMode(ScheduledJob job, WebsiteConnection connection) {
        if (connection == null) return "AI_CHAT";
        String explicit = ScheduledJob.normalizeTaskMode(job.getTaskMode());
        if (!"AUTO".equals(explicit)) return explicit;

        String combined = (connection.getName() + " " + connection.getWebsiteUrl() + " " + job.getRequirements());
        if (job.isAutoApply() || JOB_INTENT_PATTERN.matcher(combined).find()) {
            return "JOB_AUTOMATION";
        }
        return "BROWSER_TASK";
    }

    @SuppressWarnings("unchecked")
    private void recordExecutionLogs(UUID taskId, Map<?, ?> result) {
        Object rawLogs = result.get("executionLogs");
        if (!(rawLogs instanceof List<?> list)) return;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> step)) continue;
            Object t = step.get("type");
            Object d = step.get("description");
            Object st = step.get("status");
            actionRepo.save(new AgentAction(
                    taskId,
                    t != null ? String.valueOf(t) : "BROWSER_STEP",
                    d != null ? String.valueOf(d) : "Executed scheduled step",
                    st != null ? String.valueOf(st) : "COMPLETED"
            ));
        }
    }

    private void persistExtractedItems(AgentTask task, Map<?, ?> result) {
        Object records = result.get("extractedRecords");
        if (records instanceof List<?> list && !list.isEmpty()) {
            try {
                task.setExtractedItems(objectMapper.writeValueAsString(list));
            } catch (Exception ignored) {}
        }
    }

    private void saveJobCsvReport(UUID userId, UUID taskId, String portalName, String todayStr, List<Map<String, Object>> matchedJobs) {
        StringBuilder csv = new StringBuilder();
        csv.append("Rank,Match_Score,Apply_Status,Job_Title,Company,Location,Experience,Salary,Match_Reason,Job_URL\n");
        int rank = 1;
        for (Map<String, Object> j : matchedJobs) {
            csv.append(rank++).append(",")
               .append(j.getOrDefault("matchScore", 0)).append("%,")
               .append(csvCell(j.get("applyStatus"))).append(",")
               .append(csvCell(j.get("title"))).append(",")
               .append(csvCell(j.get("company"))).append(",")
               .append(csvCell(j.get("location"))).append(",")
               .append(csvCell(j.get("experience"))).append(",")
               .append(csvCell(j.get("salary"))).append(",")
               .append(csvCell(j.get("matchReason"))).append(",")
               .append(csvCell(j.get("href"))).append("\n");
        }
        String safeName = portalName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        fileRepo.save(new GeneratedFile(
                userId,
                taskId,
                "scheduled-jobs-" + safeName + "-" + todayStr + ".csv",
                "CSV",
                matchedJobs.size(),
                csv.length() > 300 ? csv.substring(0, 300) + "..." : csv.toString(),
                csv.toString()
        ));
    }

    private void saveGeneralRecordsCsvReport(UUID userId, UUID taskId, String portalName, String todayStr, List<Map<String, Object>> records) {
        StringBuilder csv = new StringBuilder();
        csv.append("Item_Number,Title,Category,URL,Snippet\n");
        int idx = 1;
        for (Map<String, Object> rec : records) {
            csv.append(idx++).append(",")
               .append(csvCell(rec.get("title"))).append(",")
               .append(csvCell(rec.getOrDefault("category", "General"))).append(",")
               .append(csvCell(rec.get("href"))).append(",")
               .append(csvCell(rec.get("snippet"))).append("\n");
        }
        String safeName = portalName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        fileRepo.save(new GeneratedFile(
                userId,
                taskId,
                "scheduled-task-" + safeName + "-" + todayStr + ".csv",
                "CSV",
                records.size(),
                csv.length() > 300 ? csv.substring(0, 300) + "..." : csv.toString(),
                csv.toString()
        ));
    }

    private ZoneId resolveZone(String tz) {
        try {
            return (tz == null || tz.isBlank()) ? ZoneId.of("Asia/Kolkata") : ZoneId.of(tz);
        } catch (Exception ex) {
            return ZoneId.of("Asia/Kolkata");
        }
    }

    private String csvCell(Object val) {
        String s = val == null ? "" : String.valueOf(val);
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
