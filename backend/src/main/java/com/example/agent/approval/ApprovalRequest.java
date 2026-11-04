package com.example.agent.approval;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approval_requests")
public class ApprovalRequest {
    @Id
    private UUID id;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(nullable = false)
    private String platform;

    @Column(name = "action_description", nullable = false, length = 1000)
    private String actionDescription;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    @Column(name = "approval_status", nullable = false)
    private String approvalStatus;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Column(length = 500)
    private String consequences;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected ApprovalRequest() {}

    public ApprovalRequest(UUID taskId, String platform, String actionDescription, String riskLevel, String payload, String consequences) {
        this.id = UUID.randomUUID();
        this.taskId = taskId;
        this.platform = platform;
        this.actionDescription = actionDescription;
        this.riskLevel = riskLevel;
        this.approvalStatus = "PENDING";
        this.payload = payload;
        this.consequences = consequences;
        this.requestedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public String getPlatform() { return platform; }
    public String getActionDescription() { return actionDescription; }
    public String getRiskLevel() { return riskLevel; }
    public String getApprovalStatus() { return approvalStatus; }
    public String getPayload() { return payload; }
    public String getConsequences() { return consequences; }
    public Instant getRequestedAt() { return requestedAt; }
    public Instant getResolvedAt() { return resolvedAt; }

    public void resolve(String status) {
        this.approvalStatus = status;
        this.resolvedAt = Instant.now();
    }
}
