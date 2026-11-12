package com.example.agent.task;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_tasks")
public class AgentTask {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "connection_id")
    private UUID connectionId;

    @Column(nullable = false, length = 2000)
    private String prompt;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "text")
    private String result;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "extracted_items", columnDefinition = "text")
    private String extractedItems;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AgentTask() {}

    public AgentTask(UUID connectionId, String prompt) {
        this(null, connectionId, prompt);
    }

    public AgentTask(UUID userId, UUID connectionId, String prompt) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.connectionId = connectionId;
        this.prompt = prompt;
        this.status = "QUEUED";
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void update(String status, String result, String error) {
        this.status = status;
        this.result = result;
        this.errorMessage = error;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getConnectionId() { return connectionId; }
    public String getPrompt() { return prompt; }
    public String getStatus() { return status; }
    public String getResult() { return result; }
    public String getErrorMessage() { return errorMessage; }
    public String getExtractedItems() { return extractedItems; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setExtractedItems(String extractedItems) { this.extractedItems = extractedItems; }
    public Instant getCreatedAt() { return createdAt; }
}
