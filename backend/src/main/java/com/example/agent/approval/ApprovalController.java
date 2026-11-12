package com.example.agent.approval;

import com.example.agent.auth.AuthInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {
    private final ApprovalRepository repository;

    public ApprovalController(ApprovalRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ApprovalRequest> list(@RequestParam(required = false) String status, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        if (status != null && !status.isBlank()) {
            return repository.findByUserIdAndApprovalStatusOrderByRequestedAtDesc(userId, status.toUpperCase(Locale.ROOT));
        }
        return repository.findByUserIdOrderByRequestedAtDesc(userId);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalRequest> approve(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        var req = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Approval request not found"));
        req.resolve("APPROVED");
        return ResponseEntity.ok(repository.save(req));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalRequest> reject(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        var req = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Approval request not found"));
        req.resolve("REJECTED");
        return ResponseEntity.ok(repository.save(req));
    }
}
