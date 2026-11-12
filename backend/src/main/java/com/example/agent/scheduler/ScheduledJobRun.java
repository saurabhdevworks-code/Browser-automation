package com.example.agent.scheduler;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduled_job_runs")
public class ScheduledJobRun {
    @Id
    private UUID id;

    @Column(name = "scheduled_job_id", nullable = false)
    private UUID scheduledJobId;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "matched_count", nullable = false)
    private int matchedCount;

    @Column(name = "applied_count", nullable = false)
    private int appliedCount;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    protected ScheduledJobRun() {}

    public ScheduledJobRun(UUID scheduledJobId, UUID taskId, String status) {
        this.id = UUID.randomUUID();
        this.scheduledJobId = scheduledJobId;
        this.taskId = taskId;
        this.status = status;
        this.matchedCount = 0;
        this.appliedCount = 0;
        this.startedAt = Instant.now();
    }

    public void complete(String status, int matchedCount, int appliedCount, String summary) {
        this.status = status;
        this.matchedCount = matchedCount;
        this.appliedCount = appliedCount;
        this.summary = summary;
        this.finishedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getScheduledJobId() { return scheduledJobId; }
    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }
    public String getStatus() { return status; }
    public int getMatchedCount() { return matchedCount; }
    public int getAppliedCount() { return appliedCount; }
    public String getSummary() { return summary; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
}
