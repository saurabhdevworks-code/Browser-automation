package com.example.agent.file;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {
    private final FileRepository repository;

    public FileController(FileRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<GeneratedFile> list() {
        return repository.findByOrderByCreatedAtDesc();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch-delete")
    public ResponseEntity<?> batchDelete(@RequestBody List<UUID> ids) {
        if (ids != null && !ids.isEmpty()) {
            repository.deleteAllById(ids);
        }
        return ResponseEntity.noContent().build();
    }

    public record CreateExportRequest(UUID taskId, String fileName, String fileType, List<Map<String, Object>> rows) {}

    @PostMapping("/export")
    public ResponseEntity<GeneratedFile> createExport(@RequestBody CreateExportRequest req) {
        StringBuilder csv = new StringBuilder();
        if (req.rows() != null && !req.rows().isEmpty()) {
            Set<String> headers = req.rows().getFirst().keySet();
            csv.append(String.join(",", headers)).append("\n");
            for (Map<String, Object> row : req.rows()) {
                List<String> values = new ArrayList<>();
                for (String h : headers) {
                    values.add("\"" + String.valueOf(row.getOrDefault(h, "")).replace("\"", "\"\"") + "\"");
                }
                csv.append(String.join(",", values)).append("\n");
            }
        } else {
            csv.append("Record_ID,Extracted_Field,Status,Timestamp\n");
            csv.append("REC-001,Pending Approval,Verified,").append(new Date()).append("\n");
            csv.append("REC-002,Employee Request,Exported,").append(new Date()).append("\n");
        }

        String preview = csv.length() > 500 ? csv.substring(0, 500) + "..." : csv.toString();
        GeneratedFile file = new GeneratedFile(
                req.taskId(),
                req.fileName() != null ? req.fileName() : "export-" + System.currentTimeMillis() + ".csv",
                req.fileType() != null ? req.fileType() : "CSV",
                req.rows() != null ? req.rows().size() : 2,
                preview,
                csv.toString()
        );
        return ResponseEntity.ok(repository.save(file));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        var file = repository.findById(id).orElseThrow(() -> new NoSuchElementException("File not found"));
        byte[] data = (file.getDownloadUrl() != null ? file.getDownloadUrl() : "Empty file").getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(data);
    }
}
