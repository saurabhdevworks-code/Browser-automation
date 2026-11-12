package com.example.agent.connection;

import com.example.agent.approval.ApprovalRepository;
import com.example.agent.auth.AuthInterceptor;
import com.example.agent.file.FileRepository;
import com.example.agent.task.ActionRepository;
import com.example.agent.task.AgentTask;
import com.example.agent.task.TaskRepository;
import com.example.agent.task.WorkerClient;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.net.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/connections")
public class ConnectionController {
    private final ConnectionRepository repository;
    private final WorkerClient worker;
    private final TaskRepository taskRepository;
    private final ActionRepository actionRepository;
    private final FileRepository fileRepository;
    private final ApprovalRepository approvalRepository;

    public ConnectionController(
            ConnectionRepository repository,
            WorkerClient worker,
            TaskRepository taskRepository,
            ActionRepository actionRepository,
            FileRepository fileRepository,
            ApprovalRepository approvalRepository
    ) {
        this.repository = repository;
        this.worker = worker;
        this.taskRepository = taskRepository;
        this.actionRepository = actionRepository;
        this.fileRepository = fileRepository;
        this.approvalRepository = approvalRepository;
    }

    public record CreateConnection(@NotBlank @Size(max = 160) String name, @NotBlank @Size(max = 2048) String websiteUrl) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateConnection request, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        URI uri = URI.create(request.websiteUrl());
        if (!List.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Only absolute HTTP/HTTPS URLs without embedded credentials are accepted.");
        }

        String normalizedIncoming = normalizeUrl(uri.toString());
        String incomingName = request.name().trim();

        for (var existing : repository.findByUserIdOrderByCreatedAtAsc(userId)) {
            if (existing.getName().trim().equalsIgnoreCase(incomingName)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "A connection with name '" + existing.getName() + "' is already registered."));
            }
            if (normalizeUrl(existing.getWebsiteUrl()).equalsIgnoreCase(normalizedIncoming)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Website '" + existing.getName() + "' (" + existing.getWebsiteUrl() + ") is already connected. Duplicate websites are not allowed."));
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(repository.save(new WebsiteConnection(userId, request.name(), uri.toString())));
    }

    private static String normalizeUrl(String url) {
        if (url == null) return "";
        String clean = url.trim().toLowerCase(Locale.ROOT);
        clean = clean.replaceFirst("^https?://", "");
        clean = clean.replaceFirst("^www\\.", "");
        clean = clean.replaceAll("/+$", "");
        return clean;
    }

    @GetMapping
    public List<WebsiteConnection> list(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        return repository.findByUserIdOrderByCreatedAtAsc(userId);
    }

    private void deleteOwnedConnection(UUID id, UUID userId) {
        Optional<WebsiteConnection> owned = repository.findByIdAndUserId(id, userId);
        if (owned.isEmpty()) return;
        List<AgentTask> connTasks = taskRepository.findByConnectionIdAndUserId(id, userId);
        for (AgentTask t : connTasks) {
            actionRepository.deleteByTaskId(t.getId());
            fileRepository.deleteByTaskId(t.getId());
            approvalRepository.deleteByTaskId(t.getId());
        }
        taskRepository.deleteAll(connTasks);
        repository.deleteById(id);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        if (repository.findByIdAndUserId(id, userId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        deleteOwnedConnection(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch-delete")
    @Transactional
    public ResponseEntity<?> batchDelete(@RequestBody List<UUID> ids, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        if (ids != null) {
            for (UUID id : ids) {
                deleteOwnedConnection(id, userId);
            }
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/launch-login")
    public ResponseEntity<?> launchLogin(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        var conn = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Connection not found"));
        var res = worker.launchLogin(conn.getWebsiteUrl(), userId);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{id}/confirm-login")
    public ResponseEntity<?> confirmLogin(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        var conn = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Connection not found"));
        var res = worker.confirmLogin(userId);
        conn.setStatus("AUTHENTICATED");
        repository.save(conn);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{id}/cancel-login")
    public ResponseEntity<?> cancelLogin(@PathVariable UUID id, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Connection not found"));
        var res = worker.cancelLogin(userId);
        return ResponseEntity.ok(res);
    }
}
