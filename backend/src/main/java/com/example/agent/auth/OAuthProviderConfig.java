package com.example.agent.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "oauth_provider_configs")
public class OAuthProviderConfig {
    @Id
    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "client_id", nullable = false, length = 512)
    private String clientId;

    @Column(name = "client_secret_enc", nullable = false, columnDefinition = "TEXT")
    private String clientSecretEnc;

    @Column(name = "redirect_uri", length = 1024)
    private String redirectUri;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public OAuthProviderConfig() {}

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecretEnc() { return clientSecretEnc; }
    public void setClientSecretEnc(String clientSecretEnc) { this.clientSecretEnc = clientSecretEnc; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
