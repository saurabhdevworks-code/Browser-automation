package com.example.agent.scheduler;

import com.example.agent.auth.AuthInterceptor;
import com.example.agent.connection.ConnectionRepository;
import com.example.agent.connection.WebsiteConnection;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/schedules")
public class SchedulerController {
    private final ScheduledJobRepository jobRepo;
    private final ScheduledJobRunRepository runRepo;
    private final ConnectionRepository connectionRepo;
    private final ScheduledAutomationService automationService;

    public SchedulerController(
            ScheduledJobRepository jobRepo,
            ScheduledJobRunRepository runRepo,
            ConnectionRepository connectionRepo,
            ScheduledAutomationService automationService
    ) {
        this.jobRepo = jobRepo;
        this.runRepo = runRepo;
        this.connectionRepo = connectionRepo;
        this.automationService = automationService;
    }

    public record ScheduleRequest(
            @NotBlank @Size(max = 160) String name,
            UUID connectionId,
            String taskMode,
            String cadence,
            @NotBlank @Size(max = 2000) String requirements,
            @Size(max = 255) String preferredLocation,
            @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Time must be HH:mm") String scheduleTime,
            String timezone,
            Boolean autoApply,
            Integer maxApplyPerRun,
            Boolean enabled
    ) {}

    @GetMapping
    public Map<String, Object> list(HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        List<ScheduledJob> jobs = jobRepo.findByUserIdOrderByCreatedAtDesc(userId);
        Map<UUID, WebsiteConnection> connMap = new HashMap<>();
        for (WebsiteConnection c : connectionRepo.findByUserIdOrderByCreatedAtAsc(userId)) {
            connMap.put(c.getId(), c);
        }

        List<Map<String, Object>> enrichedJobs = new ArrayList<>();
        Map<UUID, ScheduledJob> jobById = new HashMap<>();
        for (ScheduledJob j : jobs) {
            jobById.put(j.getId(), j);
            WebsiteConnection conn = j.getConnectionId() != null ? connMap.get(j.getConnectionId()) : null;
            String connLabel = j.getConnectionId() == null
                    ? "General AI (No Portal)"
                    : (conn != null ? conn.getName() : "Removed Portal");

            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", j.getId());
            dto.put("name", j.getName());
            dto.put("connectionId", j.getConnectionId());
            dto.put("connectionName", connLabel);
            dto.put("websiteUrl", conn != null ? conn.getWebsiteUrl() : "");
            dto.put("taskMode", j.getTaskMode());
            dto.put("cadence", j.getCadence());
            dto.put("requirements", j.getRequirements());
            dto.put("preferredLocation", j.getPreferredLocation() != null ? j.getPreferredLocation() : "");
            dto.put("scheduleTime", j.getScheduleTime());
            dto.put("timezone", j.getTimezone());
            dto.put("autoApply", j.isAutoApply());
            dto.put("maxApplyPerRun", j.getMaxApplyPerRun());
            dto.put("enabled", j.isEnabled());
            dto.put("lastRunDate", j.getLastRunDate());
            dto.put("lastRunAt", j.getLastRunAt());
            dto.put("lastStatus", j.getLastStatus());
            dto.put("lastSummary", j.getLastSummary());
            dto.put("lastMatchedCount", j.getLastMatchedCount());
            dto.put("lastAppliedCount", j.getLastAppliedCount());
            dto.put("createdAt", j.getCreatedAt());
            enrichedJobs.add(dto);
        }

        List<ScheduledJobRun> runs = jobById.isEmpty()
                ? List.of()
                : runRepo.findTop25ByScheduledJobIdInOrderByStartedAtDesc(jobById.keySet());
        List<Map<String, Object>> enrichedRuns = new ArrayList<>();
        for (ScheduledJobRun r : runs) {
            ScheduledJob parent = jobById.get(r.getScheduledJobId());
            WebsiteConnection conn = (parent != null && parent.getConnectionId() != null)
                    ? connMap.get(parent.getConnectionId())
                    : null;
            String portalName = parent == null
                    ? ""
                    : (parent.getConnectionId() == null ? "General AI" : (conn != null ? conn.getName() : "Portal"));

            Map<String, Object> rDto = new LinkedHashMap<>();
            rDto.put("id", r.getId());
            rDto.put("scheduledJobId", r.getScheduledJobId());
            rDto.put("scheduleName", parent != null ? parent.getName() : "Deleted Schedule");
            rDto.put("connectionName", portalName);
            rDto.put("taskId", r.getTaskId());
            rDto.put("status", r.getStatus());
            rDto.put("matchedCount", r.getMatchedCount());
            rDto.put("appliedCount", r.getAppliedCount());
            rDto.put("summary", r.getSummary());
            rDto.put("startedAt", r.getStartedAt());
            rDto.put("finishedAt", r.getFinishedAt());
            enrichedRuns.add(rDto);
        }

        return Map.of("schedules", enrichedJobs, "runs", enrichedRuns);
    }

    @PostMapping
    public ResponseEntity<ScheduledJob> create(@Valid @RequestBody ScheduleRequest req, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        if (req.connectionId() != null && connectionRepo.findByIdAndUserId(req.connectionId(), userId).isEmpty()) {
            throw new NoSuchElementException("Selected portal connection not found");
        }

        boolean defaultAutoApply = Boolean.TRUE.equals(req.autoApply());
        ScheduledJob job = new ScheduledJob(
                userId,
                req.name().trim(),
                req.connectionId(),
                req.taskMode(),
                req.cadence(),
                req.requirements().trim(),
                req.preferredLocation() != null ? req.preferredLocation().trim() : "",
                req.scheduleTime().trim(),
                req.timezone() != null && !req.timezone().isBlank() ? req.timezone().trim() : "Asia/Kolkata",
                defaultAutoApply,
                req.maxApplyPerRun() != null ? req.maxApplyPerRun() : 5,
                req.enabled() == null || req.enabled()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(jobRepo.save(job));
    }

    @PutMapping("/{id}")
    public ScheduledJob update(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest req, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ScheduledJob job = jobRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Scheduled task not found"));
        if (req.connectionId() != null && connectionRepo.findByIdAndUserId(req.connectionId(), userId).isEmpty()) {
            throw new NoSuchElementException("Selected portal connection not found");
        }

        job.setName(req.name().trim());
        job.setConnectionId(req.connectionId());
        if (req.taskMode() != null) job.setTaskMode(req.taskMode());
        if (req.cadence() != null) job.setCadence(req.cadence());
        job.setRequirements(req.requirements().trim());
        job.setPreferredLocation(req.preferredLocation() != null ? req.preferredLocation().trim() : "");
        job.setScheduleTime(req.scheduleTime().trim());
        if (req.timezone() != null && !req.timezone().isBlank()) job.setTimezone(req.timezone().trim());
        if (req.autoApply() != null) job.setAutoApply(req.autoApply());
        if (req.maxApplyPerRun() != null) job.setMaxApplyPerRun(req.maxApplyPerRun());
        if (req.enabled() != null) job.setEnabled(req.enabled());
        job.touch();
        return jobRepo.save(job);
    }

    @PostMapping("/{id}/toggle")
    public ScheduledJob toggle(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ScheduledJob job = jobRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Scheduled task not found"));
        job.setEnabled(!job.isEnabled());
        job.touch();
        return jobRepo.save(job);
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<Map<String, Object>> runNow(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        if (jobRepo.findByIdAndUserId(id, userId).isEmpty()) {
            throw new NoSuchElementException("Scheduled task not found");
        }
        return ResponseEntity.ok(automationService.executeSchedule(id, true));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ScheduledJob job = jobRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Scheduled task not found"));
        jobRepo.delete(job);
        return ResponseEntity.noContent().build();
    }
}
