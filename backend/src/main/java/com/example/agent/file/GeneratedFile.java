package com.example.agent.file;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "generated_files")
public class GeneratedFile {
    @Id
    private UUID id;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "row_count", nullable = false)
    private int rowCount;

    @Column(name = "content_preview", columnDefinition = "TEXT")
    private String contentPreview;

    @Column(name = "download_url", length = 1024)
    private String downloadUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected GeneratedFile() {}

    public GeneratedFile(UUID taskId, String fileName, String fileType, int rowCount, String contentPreview, String downloadUrl) {
        this.id = UUID.randomUUID();
        this.taskId = taskId;
        this.fileName = fileName;
        this.fileType = fileType;
        this.rowCount = rowCount;
        this.contentPreview = contentPreview;
        this.downloadUrl = downloadUrl;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTaskId() { return taskId; }
    public String getFileName() { return fileName; }
    public String getFileType() { return fileType; }
    public int getRowCount() { return rowCount; }
    public String getContentPreview() { return contentPreview; }
    public String getDownloadUrl() { return downloadUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
