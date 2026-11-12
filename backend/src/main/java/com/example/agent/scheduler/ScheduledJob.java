package com.example.agent.scheduler;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduled_jobs")
public class ScheduledJob {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "connection_id")
    private UUID connectionId;

    @Column(name = "task_mode", nullable = false, length = 32)
    private String taskMode;

    @Column(nullable = false, length = 24)
    private String cadence;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "preferred_location", length = 255)
    private String preferredLocation;

    @Column(name = "schedule_time", nullable = false, length = 10)
    private String scheduleTime;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Column(name = "auto_apply", nullable = false)
    private boolean autoApply;

    @Column(name = "max_apply_per_run", nullable = false)
    private int maxApplyPerRun;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "last_run_date", length = 16)
    private String lastRunDate;

    @Column(name = "last_run_slot", length = 24)
    private String lastRunSlot;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "last_status", nullable = false, length = 32)
    private String lastStatus;

    @Column(name = "last_summary", columnDefinition = "TEXT")
    private String lastSummary;

    @Column(name = "last_matched_count", nullable = false)
    private int lastMatchedCount;

    @Column(name = "last_applied_count", nullable = false)
    private int lastAppliedCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ScheduledJob() {}

    public ScheduledJob(
            UUID userId,
            String name,
            UUID connectionId,
            String taskMode,
            String cadence,
            String requirements,
            String preferredLocation,
            String scheduleTime,
            String timezone,
            boolean autoApply,
            int maxApplyPerRun,
            boolean enabled
    ) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.connectionId = connectionId;
        this.taskMode = normalizeTaskMode(taskMode);
        this.cadence = normalizeCadence(cadence);
        this.requirements = requirements;
        this.preferredLocation = preferredLocation;
        this.scheduleTime = scheduleTime;
        this.timezone = (timezone == null || timezone.isBlank()) ? "Asia/Kolkata" : timezone;
        this.autoApply = autoApply;
        this.maxApplyPerRun = Math.max(1, Math.min(25, maxApplyPerRun));
        this.enabled = enabled;
        this.lastStatus = "IDLE";
        this.lastMatchedCount = 0;
        this.lastAppliedCount = 0;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public static String normalizeTaskMode(String m) {
        if (m == null) return "AUTO";
        String u = m.trim().toUpperCase();
        return switch (u) {
            case "BROWSER_TASK", "JOB_AUTOMATION", "AI_CHAT", "AUTO" -> u;
            default -> "AUTO";
        };
    }

    public static String normalizeCadence(String c) {
        if (c == null) return "DAILY";
        String u = c.trim().toUpperCase();
        return switch (u) {
            case "DAILY", "WEEKDAYS", "HOURLY" -> u;
            default -> "DAILY";
        };
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public UUID getConnectionId() { return connectionId; }
    public void setConnectionId(UUID connectionId) { this.connectionId = connectionId; }
    public String getTaskMode() { return taskMode; }
    public void setTaskMode(String taskMode) { this.taskMode = normalizeTaskMode(taskMode); }
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = normalizeCadence(cadence); }
    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }
    public String getPreferredLocation() { return preferredLocation; }
    public void setPreferredLocation(String preferredLocation) { this.preferredLocation = preferredLocation; }
    public String getScheduleTime() { return scheduleTime; }
    public void setScheduleTime(String scheduleTime) { this.scheduleTime = scheduleTime; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public boolean isAutoApply() { return autoApply; }
    public void setAutoApply(boolean autoApply) { this.autoApply = autoApply; }
    public int getMaxApplyPerRun() { return maxApplyPerRun; }
    public void setMaxApplyPerRun(int maxApplyPerRun) { this.maxApplyPerRun = Math.max(1, Math.min(25, maxApplyPerRun)); }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getLastRunDate() { return lastRunDate; }
    public void setLastRunDate(String lastRunDate) { this.lastRunDate = lastRunDate; }
    public String getLastRunSlot() { return lastRunSlot; }
    public void setLastRunSlot(String lastRunSlot) { this.lastRunSlot = lastRunSlot; }
    public Instant getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(Instant lastRunAt) { this.lastRunAt = lastRunAt; }
    public String getLastStatus() { return lastStatus; }
    public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }
    public String getLastSummary() { return lastSummary; }
    public void setLastSummary(String lastSummary) { this.lastSummary = lastSummary; }
    public int getLastMatchedCount() { return lastMatchedCount; }
    public void setLastMatchedCount(int lastMatchedCount) { this.lastMatchedCount = lastMatchedCount; }
    public int getLastAppliedCount() { return lastAppliedCount; }
    public void setLastAppliedCount(int lastAppliedCount) { this.lastAppliedCount = lastAppliedCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void touch() { this.updatedAt = Instant.now(); }
}
