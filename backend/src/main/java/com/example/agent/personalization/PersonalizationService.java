package com.example.agent.personalization;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.Inflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class PersonalizationService {
    private static final int MAX_EXTRACTED_CHARS_PER_FILE = 6000;
    private static final int MAX_TOTAL_CONTEXT_CHARS = 12000;

    private final PersonalProfileRepository profileRepo;
    private final PersonalFileRepository fileRepo;
    private final Path storageDir;

    public PersonalizationService(
            PersonalProfileRepository profileRepo,
            PersonalFileRepository fileRepo,
            @Value("${app.personal-files-dir:data/personal-files}") String filesDir
    ) {
        this.profileRepo = profileRepo;
        this.fileRepo = fileRepo;
        this.storageDir = Path.of(filesDir).toAbsolutePath().normalize();
    }

    public PersonalProfile getOrCreateProfile(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required for personalization profile");
        }
        String key = userId.toString();
        return profileRepo.findById(key).orElseGet(() -> {
            PersonalProfile profile = new PersonalProfile();
            profile.setId(key);
            profile.setEnabled(true);
            return profileRepo.save(profile);
        });
    }

    public PersonalProfile updateProfile(
            UUID userId,
            Boolean enabled,
            String fullName,
            String email,
            String phone,
            String location,
            String customText
    ) {
        PersonalProfile profile = getOrCreateProfile(userId);
        if (enabled != null) profile.setEnabled(enabled);
        if (fullName != null) profile.setFullName(fullName.trim());
        if (email != null) profile.setEmail(email.trim());
        if (phone != null) profile.setPhone(phone.trim());
        if (location != null) profile.setLocation(location.trim());
        if (customText != null) profile.setCustomText(customText);
        profile.setUpdatedAt(Instant.now());
        return profileRepo.save(profile);
    }

    public List<PersonalFile> listFiles(UUID userId) {
        if (userId == null) return List.of();
        return fileRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public PersonalFile uploadFile(UUID userId, MultipartFile multipart) throws IOException {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }
        if (multipart == null || multipart.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        Path userDir = storageDir.resolve(userId.toString()).normalize();
        if (!userDir.startsWith(storageDir)) {
            throw new IllegalArgumentException("Invalid storage directory");
        }
        Files.createDirectories(userDir);

        String originalName = multipart.getOriginalFilename();
        String baseName = (originalName != null && !originalName.isBlank())
                ? Path.of(originalName).getFileName().toString()
                : "personal-file.txt";
        String safeFileName = baseName.replaceAll("[^a-zA-Z0-9._\\- ()]", "_");
        if (safeFileName.length() > 180) {
            safeFileName = safeFileName.substring(0, 180);
        }

        UUID fileId = UUID.randomUUID();
        Path targetPath = userDir.resolve(fileId + "_" + safeFileName).normalize();
        if (!targetPath.startsWith(userDir)) {
            throw new IllegalArgumentException("Invalid file name");
        }

        byte[] bytes = multipart.getBytes();
        Files.write(targetPath, bytes);

        String contentType = multipart.getContentType() != null ? multipart.getContentType() : "application/octet-stream";
        String extracted = extractReadableText(safeFileName, contentType, bytes);

        PersonalFile entity = new PersonalFile(
                userId,
                safeFileName,
                contentType,
                bytes.length,
                targetPath.toString(),
                extracted
        );
        return fileRepo.save(entity);
    }

    public Optional<PersonalFile> findFile(UUID userId, UUID id) {
        if (userId == null || id == null) return Optional.empty();
        return fileRepo.findByIdAndUserId(id, userId);
    }

    public void deleteFile(UUID userId, UUID id) {
        if (userId == null || id == null) return;
        fileRepo.findByIdAndUserId(id, userId).ifPresent(file -> {
            if (file.getStoragePath() != null && !file.getStoragePath().isBlank()) {
                try {
                    Path p = Path.of(file.getStoragePath()).toAbsolutePath().normalize();
                    if (p.startsWith(storageDir)) {
                        Files.deleteIfExists(p);
                    }
                } catch (IOException ignored) {}
            }
            fileRepo.delete(file);
        });
    }

    public Map<String, Object> buildPersonalContextPayload(UUID userId) {
        if (userId == null) {
            return Map.of("enabled", false);
        }
        PersonalProfile profile = getOrCreateProfile(userId);
        List<PersonalFile> files = listFiles(userId);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("enabled", profile.isEnabled());
        if (!profile.isEnabled()) {
            return payload;
        }

        payload.put("fullName", profile.getFullName());
        payload.put("email", profile.getEmail());
        payload.put("phone", profile.getPhone());
        payload.put("location", profile.getLocation());
        payload.put("customText", profile.getCustomText());

        List<Map<String, Object>> fileList = new ArrayList<>();
        StringBuilder summary = new StringBuilder();

        if (!profile.getFullName().isBlank()) summary.append("Full Name: ").append(profile.getFullName()).append("\n");
        if (!profile.getEmail().isBlank()) summary.append("Email: ").append(profile.getEmail()).append("\n");
        if (!profile.getPhone().isBlank()) summary.append("Phone: ").append(profile.getPhone()).append("\n");
        if (!profile.getLocation().isBlank()) summary.append("Location/Address: ").append(profile.getLocation()).append("\n");
        if (!profile.getCustomText().isBlank()) {
            summary.append("Personal Details / Notes:\n").append(profile.getCustomText().trim()).append("\n");
        }

        for (PersonalFile f : files) {
            Map<String, Object> fMap = new LinkedHashMap<>();
            fMap.put("id", f.getId().toString());
            fMap.put("fileName", f.getFileName());
            fMap.put("contentType", f.getContentType());
            fMap.put("fileSize", f.getFileSize());
            fMap.put("localPath", f.getStoragePath());
            String txt = f.getExtractedText() != null ? f.getExtractedText().trim() : "";
            if (txt.length() > MAX_EXTRACTED_CHARS_PER_FILE) {
                txt = txt.substring(0, MAX_EXTRACTED_CHARS_PER_FILE) + "\n...[truncated]";
            }
            fMap.put("extractedText", txt);
            fileList.add(fMap);

            if (!txt.isBlank() && summary.length() < MAX_TOTAL_CONTEXT_CHARS) {
                summary.append("\n--- Uploaded File: ").append(f.getFileName()).append(" ---\n");
                int remaining = MAX_TOTAL_CONTEXT_CHARS - summary.length();
                if (txt.length() > remaining) {
                    summary.append(txt, 0, Math.max(0, remaining)).append("\n...[truncated]");
                } else {
                    summary.append(txt);
                }
                summary.append("\n");
            }
        }

        payload.put("files", fileList);
        payload.put("summaryText", summary.toString().trim());
        return payload;
    }

    private String extractReadableText(String fileName, String contentType, byte[] bytes) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        try {
            if (lower.endsWith(".docx") || lower.endsWith(".xlsx") || lower.endsWith(".pptx")) {
                return trimToMax(extractOfficeXmlText(bytes), MAX_EXTRACTED_CHARS_PER_FILE);
            }
            if (lower.endsWith(".pdf") || contentType.toLowerCase(Locale.ROOT).contains("pdf")) {
                return trimToMax(extractPdfText(bytes), MAX_EXTRACTED_CHARS_PER_FILE);
            }
            if (contentType.startsWith("text/")
                    || lower.matches(".*\\.(txt|md|csv|json|xml|ya?ml|html?|log|env|ini|conf|tsv)$")) {
                String text = new String(bytes, StandardCharsets.UTF_8)
                        .replace("\u0000", "")
                        .trim();
                return trimToMax(text, MAX_EXTRACTED_CHARS_PER_FILE);
            }
        } catch (Exception ignored) {}
        return "";
    }

    private String extractOfficeXmlText(byte[] bytes) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName().toLowerCase(Locale.ROOT);
                if (!entry.isDirectory() && name.endsWith(".xml")
                        && (name.contains("document") || name.contains("sharedstrings") || name.contains("sheet") || name.contains("slide"))) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    zis.transferTo(baos);
                    String xml = baos.toString(StandardCharsets.UTF_8);
                    String plain = xml
                            .replaceAll("</w:p>", "\n")
                            .replaceAll("</w:tr>", "\n")
                            .replaceAll("<[^>]+>", " ")
                            .replaceAll("&amp;", "&")
                            .replaceAll("&lt;", "<")
                            .replaceAll("&gt;", ">")
                            .replaceAll("&quot;", "\"")
                            .replaceAll("&apos;", "'")
                            .replaceAll("[ \\t]+", " ")
                            .replaceAll("\\n{3,}", "\n\n")
                            .trim();
                    if (!plain.isBlank()) {
                        sb.append(plain).append("\n");
                    }
                }
            }
        }
        return sb.toString().trim();
    }

    private String extractPdfText(byte[] bytes) {
        String raw = new String(bytes, StandardCharsets.ISO_8859_1);
        StringBuilder out = new StringBuilder();

        // Collect uncompressed BT...ET literals first
        extractPdfTextOperators(raw, out);

        // Attempt FlateDecode inflation for standard compressed PDF streams
        int pos = 0;
        while (pos < bytes.length) {
            int streamIdx = raw.indexOf("stream", pos);
            if (streamIdx < 0) break;
            int dataStart = streamIdx + 6;
            if (dataStart < bytes.length && bytes[dataStart] == '\r') dataStart++;
            if (dataStart < bytes.length && bytes[dataStart] == '\n') dataStart++;
            int endIdx = raw.indexOf("endstream", dataStart);
            if (endIdx < 0) break;

            int len = endIdx - dataStart;
            if (len > 4 && len < 2_000_000) {
                byte[] inflated = tryInflate(bytes, dataStart, len);
                if (inflated != null) {
                    String decoded = new String(inflated, StandardCharsets.ISO_8859_1);
                    extractPdfTextOperators(decoded, out);
                }
            }
            pos = endIdx + 9;
        }

        return out.toString().replaceAll("\\s{2,}", " ").trim();
    }

    private byte[] tryInflate(byte[] src, int offset, int length) {
        Inflater inflater = new Inflater();
        try {
            inflater.setInput(src, offset, length);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int iterations = 0;
            while (!inflater.finished() && iterations++ < 500) {
                int count = inflater.inflate(buf);
                if (count == 0) {
                    if (inflater.needsInput() || inflater.needsDictionary()) break;
                } else {
                    baos.write(buf, 0, count);
                }
            }
            return baos.size() > 0 ? baos.toByteArray() : null;
        } catch (Exception e) {
            return null;
        } finally {
            inflater.end();
        }
    }

    private void extractPdfTextOperators(String pdfContent, StringBuilder out) {
        Pattern tjPattern = Pattern.compile("\\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\\)\\s*(?:Tj|'|\"|\\])");
        Matcher m = tjPattern.matcher(pdfContent);
        while (m.find()) {
            String token = m.group(1)
                    .replace("\\(", "(")
                    .replace("\\)", ")")
                    .replace("\\\\", "\\")
                    .replace("\\n", "\n")
                    .replace("\\r", " ")
                    .replace("\\t", " ");
            if (token.chars().anyMatch(ch -> ch >= 32 && ch < 127)) {
                out.append(token).append(" ");
            }
        }
    }

    private String trimToMax(String s, int max) {
        if (s == null) return "";
        if (s.length() <= max) return s;
        return s.substring(0, max) + "\n...[truncated]";
    }
}
