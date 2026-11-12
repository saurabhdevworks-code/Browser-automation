package com.example.agent.task;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

@Component
public class WorkerClient {
    private final RestClient client;

    public WorkerClient(@Value("${app.worker-url}") String url) {
        this.client = RestClient.builder().baseUrl(url).build();
    }

    public Map<?, ?> inspect(
            String url,
            String prompt,
            Map<String, Object> personalization,
            List<Map<String, Object>> history,
            UUID userId,
            Map<String, Object> aiConfig
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("url", url);
        payload.put("task", prompt);
        if (userId != null) {
            payload.put("userId", userId.toString());
        }
        payload.put("aiConfig", aiConfig);
        if (personalization != null && Boolean.TRUE.equals(personalization.get("enabled"))) {
            payload.put("personalization", personalization);
        }
        if (history != null && !history.isEmpty()) {
            payload.put("history", history);
        }
        return client.post().uri("/v1/inspect").body(payload).retrieve().body(Map.class);
    }

    public Map<?, ?> launchLogin(String url, UUID userId) {
        Map<String, Object> body = new HashMap<>();
        body.put("url", url);
        if (userId != null) body.put("userId", userId.toString());
        return client.post().uri("/v1/launch-login").body(body).retrieve().body(Map.class);
    }

    public Map<?, ?> confirmLogin(UUID userId) {
        Map<String, Object> body = new HashMap<>();
        if (userId != null) body.put("userId", userId.toString());
        return client.post().uri("/v1/confirm-login").body(body).retrieve().body(Map.class);
    }

    public Map<?, ?> cancelLogin(UUID userId) {
        Map<String, Object> body = new HashMap<>();
        if (userId != null) body.put("userId", userId.toString());
        return client.post().uri("/v1/cancel-login").body(body).retrieve().body(Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> runJobAutomation(
            String url,
            String requirements,
            String preferredLocation,
            boolean autoApply,
            int maxApplyPerRun,
            Map<String, Object> personalization,
            UUID userId,
            Map<String, Object> aiConfig
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("url", url);
        payload.put("requirements", requirements);
        if (userId != null) {
            payload.put("userId", userId.toString());
        }
        payload.put("aiConfig", aiConfig);
        if (preferredLocation != null && !preferredLocation.isBlank()) {
            payload.put("preferredLocation", preferredLocation);
        }
        payload.put("autoApply", autoApply);
        payload.put("maxApplyPerRun", Math.max(1, Math.min(25, maxApplyPerRun)));
        if (personalization != null && Boolean.TRUE.equals(personalization.get("enabled"))) {
            payload.put("personalization", personalization);
        }
        return client.post().uri("/v1/jobs/run").body(payload).retrieve().body(Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> askChat(
            String prompt,
            Map<String, Object> personalization,
            List<Map<String, Object>> history,
            Map<String, Object> aiConfig
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("prompt", prompt);
        payload.put("aiConfig", aiConfig);
        if (personalization != null && Boolean.TRUE.equals(personalization.get("enabled"))) {
            payload.put("personalization", personalization);
        }
        if (history != null && !history.isEmpty()) {
            payload.put("history", history);
        }
        return client.post().uri("/v1/chat").body(payload).retrieve().body(Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> testAiConfig(String provider, String apiKey, String model) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("provider", provider);
        payload.put("apiKey", apiKey);
        payload.put("model", model != null ? model : "");
        return client.post().uri("/v1/config/test").body(payload).retrieve().body(Map.class);
    }
}
