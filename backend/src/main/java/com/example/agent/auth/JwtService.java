package com.example.agent.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

/**
 * Pure Java HS256 JWT & anti-CSRF OAuth state signer/verifier.
 */
@Service
public class JwtService {
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper mapper;
    private final byte[] signingKey;
    private final long ttlSeconds;

    public record AuthClaims(UUID userId, String email, String fullName, String provider) {}

    public JwtService(
            ObjectMapper mapper,
            @Value("${app.auth.jwt-secret:}") String configuredSecret,
            @Value("${app.encryption-key:}") String encryptionKey,
            @Value("${app.auth.token-ttl-seconds:604800}") long ttlSeconds
    ) {
        this.mapper = mapper;
        this.ttlSeconds = ttlSeconds > 60 ? ttlSeconds : 604800;
        this.signingKey = resolveOrGenerateSigningKey(configuredSecret, encryptionKey);
    }

    public String getBase64AesKey() {
        return Base64.getEncoder().encodeToString(signingKey);
    }

    public String issueUserToken(AppUser user) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", user.getId().toString());
        payload.put("email", user.getEmail());
        payload.put("name", user.getFullName());
        payload.put("provider", user.getAuthProvider());
        payload.put("typ", "session");
        payload.put("iat", now);
        payload.put("exp", now + ttlSeconds);
        return signToken(payload);
    }

    public Optional<AuthClaims> verifyUserToken(String token) {
        return verifyPayload(token).flatMap(payload -> {
            if (!"session".equals(payload.get("typ"))) return Optional.empty();
            Object subObj = payload.get("sub");
            if (subObj == null) return Optional.empty();
            try {
                UUID userId = UUID.fromString(String.valueOf(subObj));
                String email = String.valueOf(payload.getOrDefault("email", ""));
                String name = String.valueOf(payload.getOrDefault("name", ""));
                String provider = String.valueOf(payload.getOrDefault("provider", "email"));
                return Optional.of(new AuthClaims(userId, email, name, provider));
            } catch (Exception e) {
                return Optional.empty();
            }
        });
    }

    public String issueOAuthState(String frontendOrigin, String mode) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("typ", "oauth_state");
        payload.put("origin", frontendOrigin);
        payload.put("mode", mode);
        payload.put("nonce", UUID.randomUUID().toString());
        payload.put("iat", now);
        payload.put("exp", now + 600);
        return signToken(payload);
    }

    public Optional<Map<String, Object>> verifyOAuthState(String stateToken) {
        return verifyPayload(stateToken).filter(p -> "oauth_state".equals(p.get("typ")));
    }

    private String signToken(Map<String, Object> payload) {
        try {
            String headerJson = mapper.writeValueAsString(Map.of("alg", "HS256", "typ", "JWT"));
            String payloadJson = mapper.writeValueAsString(payload);
            String headerB64 = URL_ENCODER.encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
            String payloadB64 = URL_ENCODER.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            String signingInput = headerB64 + "." + payloadB64;
            String sigB64 = URL_ENCODER.encodeToString(hmacSha256(signingInput));
            return signingInput + "." + sigB64;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }

    private Optional<Map<String, Object>> verifyPayload(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) return Optional.empty();
        try {
            String signingInput = parts[0] + "." + parts[1];
            byte[] expectedSig = hmacSha256(signingInput);
            byte[] providedSig = URL_DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSig, providedSig)) {
                return Optional.empty();
            }
            byte[] payloadBytes = URL_DECODER.decode(parts[1]);
            Map<String, Object> payload = mapper.readValue(payloadBytes, new TypeReference<>() {});
            Object expObj = payload.get("exp");
            if (!(expObj instanceof Number expNum)) return Optional.empty();
            long now = Instant.now().getEpochSecond();
            if (now >= expNum.longValue()) return Optional.empty();
            return Optional.of(payload);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] hmacSha256(String input) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
        return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] resolveOrGenerateSigningKey(String configuredSecret, String encryptionKey) {
        try {
            if (configuredSecret != null && !configuredSecret.isBlank() && !configuredSecret.contains("REPLACE_WITH")) {
                return MessageDigest.getInstance("SHA-256").digest(configuredSecret.getBytes(StandardCharsets.UTF_8));
            }
            if (encryptionKey != null && !encryptionKey.isBlank() && !encryptionKey.contains("REPLACE_WITH")) {
                byte[] decoded = Base64.getDecoder().decode(encryptionKey.trim());
                if (decoded.length == 32) {
                    return decoded;
                }
            }
            Path secretFile = Path.of("data", ".navio-jwt-secret");
            if (Files.exists(secretFile)) {
                String existing = Files.readString(secretFile, StandardCharsets.UTF_8).trim();
                byte[] decoded = Base64.getDecoder().decode(existing);
                if (decoded.length == 32) return decoded;
            }
            Files.createDirectories(secretFile.getParent());
            byte[] randomKey = new byte[32];
            new SecureRandom().nextBytes(randomKey);
            Files.writeString(secretFile, Base64.getEncoder().encodeToString(randomKey), StandardCharsets.UTF_8);
            return randomKey;
        } catch (Exception e) {
            throw new IllegalStateException("Unable to resolve JWT signing key", e);
        }
    }
}
