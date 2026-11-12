package com.example.agent.conversation;

import com.example.agent.auth.AuthInterceptor;
import com.example.agent.file.FileRepository;
import com.example.agent.file.GeneratedFile;
import com.example.agent.task.ActionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {
    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final ActionRepository actions;
    private final FileRepository files;

    public ConversationController(
            ChatConversationRepository conversations,
            ChatMessageRepository messages,
            ActionRepository actions,
            FileRepository files
    ) {
        this.conversations = conversations;
        this.messages = messages;
        this.actions = actions;
        this.files = files;
    }

    public record CreateConversationRequest(String title) {}
    public record RenameConversationRequest(String title) {}

    public record AppendMessageRequest(
            String role,
            String targetName,
            String prompt,
            String content,
            String status,
            UUID taskId,
            UUID fileId,
            String scrapedItems,
            Boolean isSchedule,
            String scheduleDetails
    ) {}

    @GetMapping
    public List<ChatConversation> list(HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        return conversations.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @PostMapping
    public ChatConversation create(
            @RequestBody(required = false) CreateConversationRequest req,
            HttpServletRequest httpReq
    ) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        String rawTitle = req != null && req.title() != null ? req.title().trim() : "";
        String title = rawTitle.isBlank() ? "New chat" : (rawTitle.length() > 120 ? rawTitle.substring(0, 120) : rawTitle);
        return conversations.save(new ChatConversation(userId, title));
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ChatConversation conv = conversations.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));

        List<ChatMessageEntity> rawMessages = messages.findByConversationIdOrderByCreatedAtAscSeqAsc(id);
        Map<UUID, GeneratedFile> fileCache = new HashMap<>();
        List<Map<String, Object>> hydrated = new ArrayList<>();

        for (ChatMessageEntity msg : rawMessages) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", msg.getId().toString());
            row.put("role", msg.getRole());
            row.put("targetName", msg.getTargetName() != null ? msg.getTargetName() : "");
            row.put("prompt", msg.getPrompt());
            row.put("content", msg.getContent());
            row.put("status", msg.getStatus());
            row.put("scrapedItems", msg.getScrapedItems());
            row.put("isSchedule", msg.isSchedule());
            row.put("scheduleDetails", msg.getScheduleDetails());
            row.put("createdAt", msg.getCreatedAt());

            if (msg.getTaskId() != null) {
                row.put("taskId", msg.getTaskId());
                if ("assistant".equalsIgnoreCase(msg.getRole())) {
                    row.put("actions", actions.findByTaskIdOrderByCreatedAtAsc(msg.getTaskId()));
                }
            }
            if (msg.getFileId() != null) {
                GeneratedFile gf = fileCache.computeIfAbsent(
                        msg.getFileId(),
                        fid -> files.findByIdAndUserId(fid, userId).orElse(null)
                );
                if (gf != null) {
                    row.put("file", gf);
                }
            }
            hydrated.add(row);
        }

        return Map.of("conversation", conv, "messages", hydrated);
    }

    @PostMapping("/{id}/messages")
    @Transactional
    public ResponseEntity<ChatMessageEntity> appendMessage(
            @PathVariable UUID id,
            @RequestBody AppendMessageRequest req,
            HttpServletRequest httpReq
    ) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ChatConversation conv = conversations.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));

        ChatMessageEntity msg = new ChatMessageEntity();
        msg.setConversationId(id);
        msg.setRole(req.role() != null && !req.role().isBlank() ? req.role().trim().toLowerCase(Locale.ROOT) : "user");
        msg.setTargetName(req.targetName());
        msg.setPrompt(req.prompt());
        msg.setContent(req.content());
        msg.setStatus(req.status() != null && !req.status().isBlank() ? req.status() : "COMPLETED");
        msg.setTaskId(req.taskId());
        msg.setFileId(req.fileId());
        msg.setScrapedItems(req.scrapedItems());
        msg.setSchedule(Boolean.TRUE.equals(req.isSchedule()));
        msg.setScheduleDetails(req.scheduleDetails());

        long currentCount = messages.countByConversationId(id);
        msg.setSeq((int) currentCount + 1);

        if ("New chat".equals(conv.getTitle()) && "user".equals(msg.getRole()) && msg.getPrompt() != null && !msg.getPrompt().isBlank()) {
            String t = msg.getPrompt().trim();
            conv.setTitle(t.length() > 120 ? t.substring(0, 120) : t);
        }
        conv.setUpdatedAt(Instant.now());
        conversations.save(conv);

        return ResponseEntity.ok(messages.save(msg));
    }

    @RequestMapping(value = "/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @Transactional
    public ResponseEntity<?> rename(
            @PathVariable UUID id,
            @RequestBody(required = false) RenameConversationRequest req,
            HttpServletRequest httpReq
    ) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        ChatConversation conv = conversations.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));
        String rawTitle = req != null && req.title() != null ? req.title().trim() : "";
        if (rawTitle.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title cannot be empty"));
        }
        String title = rawTitle.length() > 120 ? rawTitle.substring(0, 120) : rawTitle;
        conv.setTitle(title);
        conv.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(conversations.save(conv));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        Optional<ChatConversation> conv = conversations.findByIdAndUserId(id, userId);
        if (conv.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        conversations.delete(conv.get());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> deleteAll(HttpServletRequest httpReq) {
        UUID userId = AuthInterceptor.requireUserId(httpReq);
        List<ChatConversation> userConvs = conversations.findByUserIdOrderByUpdatedAtDesc(userId);
        if (!userConvs.isEmpty()) {
            conversations.deleteAll(userConvs);
        }
        return ResponseEntity.noContent().build();
    }
}
