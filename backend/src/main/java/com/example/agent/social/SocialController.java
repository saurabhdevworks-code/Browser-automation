package com.example.agent.social;

import com.example.agent.approval.ApprovalRepository;
import com.example.agent.approval.ApprovalRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/social")
public class SocialController {

    private final ApprovalRepository approvalRepository;

    public SocialController(ApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    public record SocialPostDraft(String content, List<String> platforms, String mediaUrl, boolean schedule, String scheduledTime) {}

    @PostMapping("/prepare-post")
    public ResponseEntity<Map<String, Object>> preparePost(@RequestBody SocialPostDraft draft) {
        // Enforce Risk-based approval per Section 12 & Section 7.1
        ApprovalRequest approval = new ApprovalRequest(
            null,
            String.join(", ", draft.platforms()),
            "Publish social media post to: " + String.join(", ", draft.platforms()),
            "HIGH",
            draft.content(),
            "Will publicly publish this content on " + draft.platforms().size() + " connected channel(s)."
        );
        approvalRepository.save(approval);

        Map<String, Object> response = new HashMap<>();
        response.put("approvalId", approval.getId());
        response.put("status", "REQUIRES_APPROVAL");
        response.put("message", "High-risk action intercepted. Explicit human approval requested before publishing.");
        response.put("draft", draft);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/whatsapp/inbox")
    public List<Map<String, Object>> getWhatsAppInbox() {
        return List.of(
            Map.of(
                "id", "WA-9876543210",
                "customerName", "Rahul Sharma",
                "phone", "+91 98765 43210",
                "lastMessage", "Hi, can you share the pricing brochure for software development services?",
                "intent", "PRICING_INQUIRY",
                "confidence", "96%",
                "suggestedDraft", "Hi Rahul! Thanks for your interest. Our enterprise plan starts from $499/mo including automated browser workflows. Would you like a 15-min discovery call?",
                "status", "PENDING_APPROVAL"
            ),
            Map.of(
                "id", "WA-8800112233",
                "customerName", "Priya Patel",
                "phone", "+91 88001 12233",
                "lastMessage", "Can this agent connect to our internal CRM dashboard and pull weekly lead reports?",
                "intent", "CAPABILITY_QUESTION",
                "confidence", "98%",
                "suggestedDraft", "Hello Priya! Yes, the Universal Browser Agent securely navigates authorized CRM dashboards, applies filters, and extracts reports to Excel.",
                "status", "PENDING_APPROVAL"
            )
        );
    }
}
