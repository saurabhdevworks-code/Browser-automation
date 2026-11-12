package com.example.agent.ai;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_ai_configs")
public class UserAiConfig {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 32)
    private String provider = "gemini";

    @Column(name = "encrypted_api_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedApiKey;

    @Column(nullable = false, length = 120)
    private String model = "";

    @Column(name = "last_error", length = 255)
    private String lastError;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected UserAiConfig() {}

    public UserAiConfig(UUID userId, String provider, String encryptedApiKey, String model) {
        this.userId = userId;
        this.provider = provider != null ? provider : "gemini";
        this.encryptedApiKey = encryptedApiKey;
        this.model = model != null ? model : "";
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getEncryptedApiKey() { return encryptedApiKey; }
    public String getModel() { return model; }
    public String getLastError() { return lastError; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String provider, String encryptedApiKey, String model, String lastError) {
        this.provider = provider != null ? provider : "gemini";
        this.encryptedApiKey = encryptedApiKey;
        this.model = model != null ? model : "";
        this.lastError = lastError;
        this.updatedAt = Instant.now();
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
        this.updatedAt = Instant.now();
    }
}
