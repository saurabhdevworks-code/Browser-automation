package com.example.agent.connection;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "website_connections")
public class WebsiteConnection {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "website_url", nullable = false, length = 2048)
    private String websiteUrl;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WebsiteConnection() {}

    public WebsiteConnection(String name, String websiteUrl) {
        this(null, name, websiteUrl);
    }

    public WebsiteConnection(UUID userId, String name, String websiteUrl) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.websiteUrl = websiteUrl;
        this.status = "CONNECTED";
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getWebsiteUrl() { return websiteUrl; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setStatus(String status) { this.status = status; }
}
