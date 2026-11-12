package com.example.agent.ai;

import com.example.agent.security.CredentialCrypto;
import com.example.agent.security.EncryptionKeyProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class UserAiConfigService {

    private static final Set<String> ALLOWED_PROVIDERS = Set.of("gemini", "openai", "claude", "groq");

    private final UserAiConfigRepository repo;
    private final EncryptionKeyProvider keyProvider;

    public UserAiConfigService(UserAiConfigRepository repo, EncryptionKeyProvider keyProvider) {
        this.repo = repo;
        this.keyProvider = keyProvider;
    }

    public String normalizeProvider(String raw) {
        if (raw == null) return "gemini";
        String lower = raw.trim().toLowerCase(Locale.ROOT);
        return ALLOWED_PROVIDERS.contains(lower) ? lower : "gemini";
    }

    public static String maskKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return "";
        String k = rawKey.trim();
        if (k.length() <= 8) return "••••••••";
        return k.substring(0, 4) + "..." + k.substring(k.length() - 4);
    }

    public Map<String, Object> getPublicStatus(UUID userId) {
        if (userId == null) {
            return Map.of("isConfigured", false, "provider", "gemini", "model", "");
        }
        Optional<UserAiConfig> opt = repo.findById(userId);
        if (opt.isEmpty()) {
            return Map.of("isConfigured", false, "provider", "gemini", "model", "");
        }
        UserAiConfig cfg = opt.get();
        String masked = "";
        try {
            String plain = CredentialCrypto.decrypt(cfg.getEncryptedApiKey(), keyProvider.effectiveAesKey());
            masked = maskKey(plain);
        } catch (Exception ignored) {
            masked = "••••••••";
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("isConfigured", true);
        out.put("provider", cfg.getProvider());
        out.put("model", cfg.getModel());
        out.put("maskedKey", masked);
        if (cfg.getLastError() != null && !cfg.getLastError().isBlank()) {
            out.put("lastError", cfg.getLastError());
        }
        return out;
    }

    /**
     * Returns decrypted runtime config `{ provider, apiKey, model }` exclusively for `userId`,
     * or `null` if that user has not configured an API key.
     */
    public Map<String, Object> getDecryptedWorkerConfig(UUID userId) {
        if (userId == null) return null;
        Optional<UserAiConfig> opt = repo.findById(userId);
        if (opt.isEmpty()) return null;
        UserAiConfig cfg = opt.get();
        try {
            String plainKey = CredentialCrypto.decrypt(cfg.getEncryptedApiKey(), keyProvider.effectiveAesKey());
            if (plainKey == null || plainKey.isBlank()) return null;
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("provider", cfg.getProvider());
            map.put("apiKey", plainKey.trim());
            map.put("model", cfg.getModel() != null ? cfg.getModel() : "");
            return map;
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public UserAiConfig saveConfig(UUID userId, String provider, String rawApiKey, String model, String lastError) {
        String cleanProvider = normalizeProvider(provider);
        String cleanKey = rawApiKey.trim();
        String encrypted = CredentialCrypto.encrypt(cleanKey, keyProvider.effectiveAesKey());
        String cleanModel = model != null ? model.trim() : "";

        UserAiConfig cfg = repo.findById(userId)
                .map(existing -> {
                    existing.update(cleanProvider, encrypted, cleanModel, lastError);
                    return existing;
                })
                .orElseGet(() -> {
                    UserAiConfig created = new UserAiConfig(userId, cleanProvider, encrypted, cleanModel);
                    created.setLastError(lastError);
                    return created;
                });
        return repo.save(cfg);
    }

    @Transactional
    public void updateLastError(UUID userId, String lastError) {
        if (userId == null) return;
        repo.findById(userId).ifPresent(cfg -> {
            String clipped = lastError == null ? null : (lastError.length() > 250 ? lastError.substring(0, 250) : lastError);
            cfg.setLastError(clipped);
            repo.save(cfg);
        });
    }

    @Transactional
    public void clearConfig(UUID userId) {
        if (userId != null && repo.existsById(userId)) {
            repo.deleteById(userId);
        }
    }
}
