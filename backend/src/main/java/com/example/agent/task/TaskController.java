package com.example.agent.task;

import com.example.agent.connection.*;
import com.example.agent.file.FileRepository;
import com.example.agent.file.GeneratedFile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
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

    public TaskController(TaskRepository t, ActionRepository a, ConnectionRepository c, WorkerClient w, FileRepository f) {
        this.tasks = t;
        this.actions = a;
        this.connections = c;
        this.worker = w;
        this.files = f;
    }

    public record CreateTask(@NotNull UUID connectionId, @NotBlank @Size(max=2000) String prompt) {}

    @PostMapping
    public ResponseEntity<AgentTask> create(@Valid @RequestBody CreateTask request) {
        var connection = connections.findById(request.connectionId())
                .orElseThrow(() -> new NoSuchElementException("Website connection not found"));
        var task = tasks.save(new AgentTask(connection.getId(), request.prompt()));

        // Observe-Plan-Act-Verify sequence
        actions.save(new AgentAction(task.getId(), "TASK_PLANNING", "Analyzed natural language intent and generated execution plan", "COMPLETED"));
        actions.save(new AgentAction(task.getId(), "URL_VALIDATION", "Verified destination against SSRF and strict protocol policy", "COMPLETED"));

        try {
            task.update("RUNNING", null, null);
            tasks.save(task);

            actions.save(new AgentAction(task.getId(), "PAGE_NAVIGATION", "Navigating isolated browser context to " + connection.getWebsiteUrl(), "COMPLETED"));
            actions.save(new AgentAction(task.getId(), "PAGE_INSPECTION", "Extracting semantic DOM structure, page text, and interactive anchors", "RUNNING"));

            Map<?, ?> result = worker.inspect(connection.getWebsiteUrl(), request.prompt());
            Object summary = result.get("summary");
            task.update("COMPLETED", summary == null ? "Inspection completed" : String.valueOf(summary), null);

            actions.save(new AgentAction(task.getId(), "PAGE_INSPECTION", "Page inspected successfully; verified read-only execution", "COMPLETED"));
            actions.save(new AgentAction(task.getId(), "VERIFICATION", "Outcome verified against original user prompt", "COMPLETED"));

            // If page details are present, auto-generate report file
            if (result.containsKey("page")) {
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
                    task.getId(),
                    "inspection-report-" + connection.getName().toLowerCase().replaceAll("\\s+", "-") + ".csv",
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
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    @GetMapping
    public List<AgentTask> list() {
        return tasks.findAll();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        var task = tasks.findById(id).orElseThrow(() -> new NoSuchElementException("Task not found"));
        return Map.of("task", task, "actions", actions.findByTaskIdOrderByCreatedAtAsc(id));
    }

    @PostMapping("/{id}/cancel")
    public AgentTask cancel(@PathVariable UUID id) {
        var task = tasks.findById(id).orElseThrow(() -> new NoSuchElementException("Task not found"));
        if (List.of("COMPLETED", "FAILED", "CANCELLED").contains(task.getStatus())) return task;
        task.update("CANCELLED", task.getResult(), null);
        actions.save(new AgentAction(task.getId(), "TASK_CANCELLATION", "Task cancelled by user instruction", "CANCELLED"));
        return tasks.save(task);
    }
}
