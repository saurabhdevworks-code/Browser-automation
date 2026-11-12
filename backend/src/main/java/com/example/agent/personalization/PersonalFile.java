package com.example.agent.personalization;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "personal_files")
public class PersonalFile {
    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", length = 160)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @JsonIgnore
    @Column(name = "storage_path", length = 1024)
    private String storagePath;

    @Column(name = "extracted_text", columnDefinition = "text")
    private String extractedText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public PersonalFile() {}

    public PersonalFile(UUID userId, String fileName, String contentType, long fileSize, String storagePath, String extractedText) {
        this.userId = userId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.storagePath = storagePath;
        this.extractedText = extractedText;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getFileName() { return fileName; }
    public String getContentType() { return contentType; }
    public long getFileSize() { return fileSize; }
    public String getStoragePath() { return storagePath; }
    public String getExtractedText() { return extractedText; }
    public Instant getCreatedAt() { return createdAt; }
}
