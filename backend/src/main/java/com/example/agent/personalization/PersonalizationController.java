package com.example.agent.personalization;

import com.example.agent.auth.AuthInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@RestController
@RequestMapping("/api/v1/personalization")
public class PersonalizationController {
    private final PersonalizationService service;

    public PersonalizationController(PersonalizationService service) {
        this.service = service;
    }

    public record UpdateProfileRequest(
            Boolean enabled,
            String fullName,
            String email,
            String phone,
            String location,
            String customText
    ) {}

    @GetMapping
    public Map<String, Object> getAll(HttpServletRequest req) {
        UUID userId = AuthInterceptor.requireUserId(req);
        return Map.of(
                "profile", service.getOrCreateProfile(userId),
                "files", service.listFiles(userId)
        );
    }

    @PutMapping("/profile")
    public PersonalProfile updateProfile(@RequestBody UpdateProfileRequest req, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        return service.updateProfile(
                userId,
                req.enabled(),
                req.fullName(),
                req.email(),
                req.phone(),
                req.location(),
                req.customText()
        );
    }

    @PostMapping("/profile")
    public PersonalProfile saveProfile(@RequestBody UpdateProfileRequest req, HttpServletRequest httpReq) {
        return updateProfile(req, httpReq);
    }

    @PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PersonalFile> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpReq
    ) throws IOException {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        return ResponseEntity.ok(service.uploadFile(userId, file));
    }

    @GetMapping("/files/{id}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable UUID id, HttpServletRequest httpReq) throws IOException {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        PersonalFile file = service.findFile(userId, id)
                .orElseThrow(() -> new NoSuchElementException("Personal file not found"));
        Path p = Path.of(file.getStoragePath());
        if (!Files.exists(p)) {
            throw new NoSuchElementException("Stored file missing on disk");
        }
        byte[] bytes = Files.readAllBytes(p);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            if (file.getContentType() != null && !file.getContentType().isBlank()) {
                mediaType = MediaType.parseMediaType(file.getContentType());
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName().replace("\"", "") + "\"")
                .contentType(mediaType)
                .body(bytes);
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        service.deleteFile(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/context")
    public Map<String, Object> getContextPayload(HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        return service.buildPersonalContextPayload(userId);
    }
}
