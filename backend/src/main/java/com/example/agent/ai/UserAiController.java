package com.example.agent.ai;

import com.example.agent.auth.AuthInterceptor;
import com.example.agent.personalization.PersonalizationService;
import com.example.agent.task.WorkerClient;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/ai")
public class UserAiController {

    private final UserAiConfigService aiConfigService;
    private final PersonalizationService personalizationService;
    private final WorkerClient workerClient;

    public UserAiController(
            UserAiConfigService aiConfigService,
            PersonalizationService personalizationService,
            WorkerClient workerClient
    ) {
        this.aiConfigService = aiConfigService;
        this.personalizationService = personalizationService;
        this.workerClient = workerClient;
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        return aiConfigService.getPublicStatus(userId);
    }

    @PostMapping("/config")
    public Map<String, Object> saveConfig(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        String rawKey = body.get("apiKey") != null ? body.get("apiKey").toString().trim() : "";
        if (rawKey.isBlank()) {
            throw new IllegalArgumentException("Please enter an API key.");
        }
        String provider = aiConfigService.normalizeProvider(body.get("provider") != null ? body.get("provider").toString() : "gemini");
        String model = body.get("model") != null ? body.get("model").toString().trim() : "";
        boolean skipTest = Boolean.TRUE.equals(body.get("skipTest"));

        boolean verified = true;
        String message = "Saved " + provider.toUpperCase(Locale.ROOT) + " configuration!";
        String lastError = null;
        String resolvedModel = model;

        if (!skipTest) {
            try {
                Map<String, Object> testRes = workerClient.testAiConfig(provider, rawKey, model);
                verified = testRes != null && Boolean.TRUE.equals(testRes.get("success"));
                Object msgObj = testRes != null ? testRes.get("message") : null;
                Object modelObj = testRes != null ? testRes.get("resolvedModel") : null;
                if (modelObj instanceof String rm && !rm.isBlank()) {
                    resolvedModel = rm;
                }
                if (verified) {
                    message = msgObj != null ? msgObj.toString() : message;
                } else {
                    String warn = msgObj != null ? msgObj.toString() : "Validation warning";
                    message = "Saved! (Live test warning: " + warn + ")";
                    lastError = warn;
                }
            } catch (Exception e) {
                verified = false;
                lastError = e.getMessage();
                message = "Saved! (Live test note: " + (e.getMessage() != null ? e.getMessage() : "Worker unreachable") + ")";
            }
        }

        aiConfigService.saveConfig(userId, provider, rawKey, resolvedModel, lastError);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("success", true);
        out.put("verified", verified);
        out.put("message", message);
        out.put("config", aiConfigService.getPublicStatus(userId));
        return out;
    }

    @DeleteMapping("/config")
    public Map<String, Object> deleteConfig(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        aiConfigService.clearConfig(userId);
        return Map.of(
                "success", true,
                "message", "AI Configuration cleared",
                "config", aiConfigService.getPublicStatus(userId)
        );
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        String prompt = body.get("prompt") != null ? body.get("prompt").toString().trim() : "";
        if (prompt.isBlank()) {
            throw new IllegalArgumentException("Prompt cannot be blank.");
        }

        List<Map<String, Object>> history = body.get("history") instanceof List<?> rawList
                ? rawList.stream()
                        .filter(item -> item instanceof Map<?, ?>)
                        .map(item -> (Map<String, Object>) item)
                        .toList()
                : List.of();

        // Always build personalization from authenticated user's DB profile + files so contexts never mix
        Map<String, Object> serverPersonalization = personalizationService.buildPersonalContextPayload(userId);
        // Respect explicit client toggle only for the current user's enabled flag if supplied
        if (body.get("personalization") instanceof Map<?, ?> clientPers && Boolean.FALSE.equals(clientPers.get("enabled"))) {
            serverPersonalization = Map.of("enabled", false);
        }

        Map<String, Object> aiConfig = aiConfigService.getDecryptedWorkerConfig(userId);
        Map<String, Object> workerRes = workerClient.askChat(prompt, serverPersonalization, history, aiConfig);

        String aiError = workerRes != null && workerRes.get("aiError") != null ? workerRes.get("aiError").toString() : null;
        if (aiConfig != null) {
            aiConfigService.updateLastError(userId, aiError);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("success", true);
        out.put("reply", workerRes != null && workerRes.get("reply") != null ? workerRes.get("reply") : "");
        out.put("aiError", aiError);
        return out;
    }
}
