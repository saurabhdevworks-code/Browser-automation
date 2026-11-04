package com.example.agent.approval;

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
    public List<ApprovalRequest> list(@RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return repository.findByApprovalStatusOrderByRequestedAtDesc(status.toUpperCase());
        }
        return repository.findByOrderByRequestedAtDesc();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalRequest> approve(@PathVariable UUID id) {
        var req = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Approval request not found"));
        req.resolve("APPROVED");
        return ResponseEntity.ok(repository.save(req));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalRequest> reject(@PathVariable UUID id) {
        var req = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Approval request not found"));
        req.resolve("REJECTED");
        return ResponseEntity.ok(repository.save(req));
    }
}
