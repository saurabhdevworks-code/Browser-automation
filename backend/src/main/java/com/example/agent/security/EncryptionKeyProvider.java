package com.example.agent.security;

import com.example.agent.auth.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;

@Component
public class EncryptionKeyProvider {

    private final JwtService jwtService;
    private final String configuredEncryptionKey;

    public EncryptionKeyProvider(
            JwtService jwtService,
            @Value("${app.encryption-key:}") String configuredEncryptionKey
    ) {
        this.jwtService = jwtService;
        this.configuredEncryptionKey = configuredEncryptionKey;
    }

    /**
     * Resolves a valid 32-byte Base64 AES key, falling back deterministically to the server JWT secret key.
     */
    public String effectiveAesKey() {
        if (configuredEncryptionKey != null && !configuredEncryptionKey.isBlank()
                && !configuredEncryptionKey.contains("REPLACE_WITH")) {
            try {
                byte[] decoded = Base64.getDecoder().decode(configuredEncryptionKey.trim());
                if (decoded.length == 32) {
                    return configuredEncryptionKey.trim();
                }
            } catch (Exception ignored) {}
        }
        return jwtService.getBase64AesKey();
    }
}
