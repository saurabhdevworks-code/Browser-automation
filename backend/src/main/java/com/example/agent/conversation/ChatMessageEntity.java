package com.example.agent.conversation;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
public class ChatMessageEntity {
    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(name = "target_name", length = 120)
    private String targetName;

    @Column(columnDefinition = "text")
    private String prompt;

    @Column(columnDefinition = "text")
    private String content;

    @Column(nullable = false, length = 32)
    private String status = "COMPLETED";

    @Column(name = "task_id")
    private UUID taskId;

    @Column(name = "file_id")
    private UUID fileId;

    @Column(name = "scraped_items", columnDefinition = "text")
    private String scrapedItems;

    @Column(name = "is_schedule", nullable = false)
    private boolean isSchedule = false;

    @Column(name = "schedule_details", columnDefinition = "text")
    private String scheduleDetails;

    @Column(nullable = false)
    private int seq = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public ChatMessageEntity() {}

    public UUID getId() { return id; }
    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }
    public UUID getFileId() { return fileId; }
    public void setFileId(UUID fileId) { this.fileId = fileId; }
    public String getScrapedItems() { return scrapedItems; }
    public void setScrapedItems(String scrapedItems) { this.scrapedItems = scrapedItems; }
    public boolean isSchedule() { return isSchedule; }
    public void setSchedule(boolean schedule) { isSchedule = schedule; }
    public String getScheduleDetails() { return scheduleDetails; }
    public void setScheduleDetails(String scheduleDetails) { this.scheduleDetails = scheduleDetails; }
    public int getSeq() { return seq; }
    public void setSeq(int seq) { this.seq = seq; }
    public Instant getCreatedAt() { return createdAt; }
}
