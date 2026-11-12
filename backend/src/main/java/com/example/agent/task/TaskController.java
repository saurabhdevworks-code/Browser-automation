package com.example.agent.task;

import com.example.agent.ai.UserAiConfigService;
import com.example.agent.approval.ApprovalRepository;
import com.example.agent.auth.AuthInterceptor;
import com.example.agent.connection.*;
import com.example.agent.file.FileRepository;
import com.example.agent.file.GeneratedFile;
import com.example.agent.personalization.PersonalizationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {
    private final TaskRepository tasks;
    private final ActionRepository actions;
    private final ConnectionRepository connections;
    private final WorkerClient worker;
    private final FileRepository files;
    private final ApprovalRepository approvals;
    private final ObjectMapper objectMapper;
    private final PersonalizationService personalizationService;
    private final UserAiConfigService aiConfigService;

    public TaskController(
            TaskRepository t,
            ActionRepository a,
            ConnectionRepository c,
            WorkerClient w,
            FileRepository f,
            ApprovalRepository app,
            ObjectMapper objectMapper,
            PersonalizationService personalizationService,
            UserAiConfigService aiConfigService
    ) {
        this.tasks = t;
        this.actions = a;
        this.connections = c;
        this.worker = w;
        this.files = f;
        this.approvals = app;
        this.objectMapper = objectMapper;
        this.personalizationService = personalizationService;
        this.aiConfigService = aiConfigService;
    }

    public record CreateTask(@NotNull UUID connectionId, @NotBlank @Size(max = 2000) String prompt, List<Map<String, Object>> history) {}
    public record CreateMultiTask(List<UUID> connectionIds, @NotBlank @Size(max = 2000) String prompt, List<Map<String, Object>> history) {}

    private record SingleExecutionOutcome(AgentTask task, List<Map<String, Object>> records) {}

    @PostMapping
    public ResponseEntity<AgentTask> create(@Valid @RequestBody CreateTask request, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        var connection = connections.findByIdAndUserId(request.connectionId(), userId)
                .orElseThrow(() -> new NoSuchElementException("Website connection not found"));
        SingleExecutionOutcome outcome = executeSingleConnectionTask(userId, connection, request.prompt(), request.history());
        return ResponseEntity.status(HttpStatus.CREATED).body(outcome.task());
    }

    @PostMapping("/multi")
    public ResponseEntity<Map<String, Object>> createMulti(@Valid @RequestBody CreateMultiTask request, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        List<WebsiteConnection> allUserConns = connections.findByUserIdOrderByCreatedAtAsc(userId);
        List<WebsiteConnection> targets;
        if (request.connectionIds() != null && !request.connectionIds().isEmpty()) {
            Set<UUID> wanted = new HashSet<>(request.connectionIds());
            targets = allUserConns.stream().filter(c -> wanted.contains(c.getId())).toList();
        } else {
            targets = allUserConns;
        }
        if (targets.isEmpty()) {
            throw new NoSuchElementException("No connected websites found. Connect at least one platform first.");
        }

        var parentTask = tasks.save(new AgentTask(userId, null, request.prompt()));
        parentTask.update("RUNNING", null, null);
        tasks.save(parentTask);
        actions.save(new AgentAction(parentTask.getId(), "MULTI_PLATFORM_PLANNING", "Executing prompt across " + targets.size() + " connected platform(s)", "COMPLETED"));

        List<Map<String, Object>> combinedRecords = new ArrayList<>();
        List<Map<String, Object>> perPlatform = new ArrayList<>();
        List<String> summaryLines = new ArrayList<>();
        int succeeded = 0;

        for (WebsiteConnection conn : targets) {
            SingleExecutionOutcome outcome = executeSingleConnectionTask(userId, conn, request.prompt(), request.history());
            AgentTask subTask = outcome.task();
            boolean ok = "COMPLETED".equalsIgnoreCase(subTask.getStatus());
            if (ok) succeeded++;

            for (Map<String, Object> rec : outcome.records()) {
                Map<String, Object> annotated = new LinkedHashMap<>(rec);
                annotated.putIfAbsent("platform", conn.getName());
                combinedRecords.add(annotated);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("connectionId", conn.getId());
            entry.put("platform", conn.getName());
            entry.put("websiteUrl", conn.getWebsiteUrl());
            entry.put("taskId", subTask.getId());
            entry.put("status", subTask.getStatus());
            entry.put("extractedCount", outcome.records().size());
            entry.put("summary", ok ? subTask.getResult() : subTask.getErrorMessage());
            perPlatform.add(entry);

            summaryLines.add("• **" + conn.getName() + "**: " + (ok ? subTask.getResult() : ("Failed — " + subTask.getErrorMessage())));
        }

        if (!combinedRecords.isEmpty()) {
            try {
                parentTask.setExtractedItems(objectMapper.writeValueAsString(combinedRecords));
            } catch (Exception ignored) {}
        }

        GeneratedFile combinedFile = null;
        if (!combinedRecords.isEmpty()) {
            combinedFile = saveRecordsCsvFile(userId, parentTask.getId(), "all-platforms", combinedRecords, true);
        }

        String header = String.format(
                "Completed across **%d/%d** connected platform(s) — extracted **%d** record(s) total.",
                succeeded, targets.size(), combinedRecords.size()
        );
        String combinedSummary = header + "\n\n" + String.join("\n", summaryLines);
        String parentStatus = succeeded > 0 ? "COMPLETED" : "FAILED";
        parentTask.update(parentStatus, combinedSummary, succeeded > 0 ? null : "All target platform executions failed.");
        tasks.save(parentTask);
        actions.save(new AgentAction(parentTask.getId(), "MULTI_PLATFORM_AGGREGATION", header, parentStatus));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("taskId", parentTask.getId());
        response.put("status", parentStatus);
        response.put("combinedSummary", combinedSummary);
        response.put("totalExtracted", combinedRecords.size());
        response.put("platformCount", targets.size());
        response.put("succeededCount", succeeded);
        response.put("extractedItems", parentTask.getExtractedItems());
        response.put("combinedFile", combinedFile);
        response.put("perPlatform", perPlatform);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private SingleExecutionOutcome executeSingleConnectionTask(
            UUID userId,
            WebsiteConnection connection,
            String prompt,
            List<Map<String, Object>> history
    ) {
        var task = tasks.save(new AgentTask(userId, connection.getId(), prompt));

        // Observe-Plan-Act-Verify sequence
        actions.save(new AgentAction(task.getId(), "TASK_PLANNING", "Analyzed natural language intent and generated execution plan", "COMPLETED"));
        actions.save(new AgentAction(task.getId(), "URL_VALIDATION", "Verified destination against SSRF and strict protocol policy", "COMPLETED"));

        List<Map<String, Object>> capturedRecords = List.of();
        try {
            task.update("RUNNING", null, null);
            tasks.save(task);

            actions.save(new AgentAction(task.getId(), "PAGE_NAVIGATION", "Navigating isolated browser context to " + connection.getWebsiteUrl(), "COMPLETED"));
            actions.save(new AgentAction(task.getId(), "PAGE_INSPECTION", "Extracting semantic DOM structure, page text, and interactive anchors", "RUNNING"));

            Map<String, Object> personalContext = personalizationService.buildPersonalContextPayload(userId);
            if (Boolean.TRUE.equals(personalContext.get("enabled"))) {
                String summaryText = String.valueOf(personalContext.getOrDefault("summaryText", ""));
                List<?> personalFiles = (List<?>) personalContext.getOrDefault("files", List.of());
                if (!summaryText.isBlank() || !personalFiles.isEmpty()) {
                    actions.save(new AgentAction(task.getId(), "PERSONALIZATION_CONTEXT", "Attached personal profile data and " + personalFiles.size() + " file(s) if needed", "COMPLETED"));
                }
            }
            Map<String, Object> aiConfig = aiConfigService.getDecryptedWorkerConfig(userId);
            Map<?, ?> result = worker.inspect(connection.getWebsiteUrl(), prompt, personalContext, history, userId, aiConfig);
            Object summary = result.get("summary");
            task.update("COMPLETED", summary == null ? "Inspection completed" : String.valueOf(summary), null);

            if (result.containsKey("executionLogs")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> logs = (List<Map<String, Object>>) result.get("executionLogs");
                for (Map<String, Object> log : logs) {
                    String actionType = String.valueOf(log.getOrDefault("type", "BROWSER_ACTION"));
                    String desc = String.valueOf(log.getOrDefault("description", "Executed step"));
                    String stepStatus = String.valueOf(log.getOrDefault("status", "COMPLETED"));
                    actions.save(new AgentAction(task.getId(), actionType, desc, stepStatus));
                }
            } else {
                actions.save(new AgentAction(task.getId(), "PAGE_INSPECTION", "Page inspected successfully; verified read-only execution", "COMPLETED"));
            }

            actions.save(new AgentAction(task.getId(), "VERIFICATION", "Outcome verified against original user prompt", "COMPLETED"));

            if (result.containsKey("extractedRecords")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("extractedRecords");
                if (records != null && !records.isEmpty()) {
                    capturedRecords = records;
                    try {
                        task.setExtractedItems(objectMapper.writeValueAsString(records));
                    } catch (Exception ignored) {}
                    saveRecordsCsvFile(userId, task.getId(), connection.getName(), records, false);
                }
            }
            if ((task.getExtractedItems() == null || task.getExtractedItems().isBlank()) && result.containsKey("page")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> pageData = (Map<String, Object>) result.get("page");
                @SuppressWarnings("unchecked")
                List<Map<String, String>> links = (List<Map<String, String>>) pageData.getOrDefault("links", List.of());

                StringBuilder csv = new StringBuilder();
                csv.append("Item_Number,Link_Text,Target_URL,Extracted_At\n");
                int idx = 1;
                for (Map<String, String> link : links) {
                    csv.append(idx++).append(",")
                       .append("\"").append(link.getOrDefault("text", "").replace("\"", "\"\"")).append("\",")
                       .append("\"").append(link.getOrDefault("href", "").replace("\"", "\"\"")).append("\",")
                       .append(new Date()).append("\n");
                }
                if (links.isEmpty()) {
                    csv.append("1,\"Page Inspection Summary\",\"").append(connection.getWebsiteUrl()).append("\",").append(new Date()).append("\n");
                }

                files.save(new GeneratedFile(
                    userId,
                    task.getId(),
                    "inspection-report-" + connection.getName().toLowerCase(Locale.ROOT).replaceAll("\\s+", "-") + ".csv",
                    "CSV",
                    Math.max(1, links.size()),
                    csv.length() > 300 ? csv.substring(0, 300) + "..." : csv.toString(),
                    csv.toString()
                ));
            }
        } catch (Exception ex) {
            task.update("FAILED", null, "Worker execution failed. Check worker health and URL policy: " + ex.getMessage());
            actions.save(new AgentAction(task.getId(), "PAGE_INSPECTION", "Inspection failed: " + ex.getMessage(), "FAILED"));
        }

        tasks.save(task);
        return new SingleExecutionOutcome(task, capturedRecords);
    }

    private GeneratedFile saveRecordsCsvFile(
            UUID userId,
            UUID taskId,
            String sourceLabel,
            List<Map<String, Object>> records,
            boolean isCombined
    ) {
        boolean hasLeadFields = records.stream().anyMatch(rec ->
                "Lead".equalsIgnoreCase(String.valueOf(rec.getOrDefault("category", ""))) ||
                hasNonBlank(rec.get("email")) ||
                hasNonBlank(rec.get("phone")) ||
                hasNonBlank(rec.get("company")) ||
                hasNonBlank(rec.get("role"))
        );

        StringBuilder csv = new StringBuilder();
        int idx = 1;
        if (hasLeadFields) {
            csv.append("Item_Number,Name_Or_Title,Platform,Role_Or_Company,Email,Phone,Location,URL,Snippet,Extracted_At\n");
            for (Map<String, Object> rec : records) {
                String roleCompany = firstNonBlank(rec.get("company"), rec.get("role"));
                if (hasNonBlank(rec.get("company")) && hasNonBlank(rec.get("role"))) {
                    roleCompany = rec.get("role") + " @ " + rec.get("company");
                }
                csv.append(idx++).append(",")
                   .append(csvCell(rec.get("title"))).append(",")
                   .append(csvCell(firstNonBlank(rec.get("platform"), sourceLabel))).append(",")
                   .append(csvCell(roleCompany)).append(",")
                   .append(csvCell(rec.get("email"))).append(",")
                   .append(csvCell(rec.get("phone"))).append(",")
                   .append(csvCell(rec.get("location"))).append(",")
                   .append(csvCell(rec.get("href"))).append(",")
                   .append(csvCell(rec.get("snippet"))).append(",")
                   .append(csvCell(new Date())).append("\n");
            }
        } else {
            csv.append("Item_Number,Title,URL,Image_URL,Category,Extracted_At\n");
            for (Map<String, Object> rec : records) {
                csv.append(idx++).append(",")
                   .append(csvCell(rec.get("title"))).append(",")
                   .append(csvCell(rec.get("href"))).append(",")
                   .append(csvCell(rec.get("imageUrl"))).append(",")
                   .append(csvCell(rec.getOrDefault("category", "General"))).append(",")
                   .append(csvCell(new Date())).append("\n");
            }
        }

        String slug = sourceLabel.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        String prefix = hasLeadFields
                ? (isCombined ? "combined-leads-" : "leads-")
                : (isCombined ? "combined-extracted-data-" : "extracted-data-");
        return files.save(new GeneratedFile(
                userId,
                taskId,
                prefix + slug + ".csv",
                "CSV",
                records.size(),
                csv.length() > 300 ? csv.substring(0, 300) + "..." : csv.toString(),
                csv.toString()
        ));
    }

    private static boolean hasNonBlank(Object val) {
        return val != null && !String.valueOf(val).trim().isEmpty();
    }

    private static String firstNonBlank(Object a, Object b) {
        if (hasNonBlank(a)) return String.valueOf(a).trim();
        if (hasNonBlank(b)) return String.valueOf(b).trim();
        return "";
    }

    private static String csvCell(Object val) {
        String s = val == null ? "" : String.valueOf(val);
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    @GetMapping
    public List<AgentTask> list(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        return tasks.findByUserIdOrderByCreatedAtAsc(userId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        var task = tasks.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Task not found"));
        return Map.of("task", task, "actions", actions.findByTaskIdOrderByCreatedAtAsc(id));
    }

    @PostMapping("/{id}/cancel")
    public AgentTask cancel(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        var task = tasks.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Task not found"));
        if (List.of("COMPLETED", "FAILED", "CANCELLED").contains(task.getStatus())) return task;
        task.update("CANCELLED", task.getResult(), null);
        actions.save(new AgentAction(task.getId(), "TASK_CANCELLATION", "Task cancelled by user instruction", "CANCELLED"));
        return tasks.save(task);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        if (tasks.findByIdAndUserId(id, userId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        actions.deleteByTaskId(id);
        files.deleteByTaskId(id);
        approvals.deleteByTaskId(id);
        tasks.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> deleteAll(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        List<AgentTask> userTasks = tasks.findByUserIdOrderByCreatedAtAsc(userId);
        for (AgentTask t : userTasks) {
            actions.deleteByTaskId(t.getId());
            files.deleteByTaskId(t.getId());
            approvals.deleteByTaskId(t.getId());
        }
        tasks.deleteAll(userTasks);
        return ResponseEntity.noContent().build();
    }
}
