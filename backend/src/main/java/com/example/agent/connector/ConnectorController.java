package com.example.agent.connector;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/connectors")
public class ConnectorController {

    public record Capability(String key, String name, String status, String riskLevel, String description) {}
    public record ConnectorDef(String id, String name, String category, String authType, String status, List<Capability> capabilities) {}

    private static final List<ConnectorDef> CONNECTORS = List.of(
        new ConnectorDef("playwright-browser", "Browser Automation Engine", "Websites & Custom Portals", "Session / Credential Vault", "READY", List.of(
            new Capability("navigate", "Page Navigation", "Available", "LOW", "Navigate authorized HTTP/HTTPS URLs with SSRF protection"),
            new Capability("inspect_dom", "DOM & Accessibility Inspection", "Available", "LOW", "Observe page structure, interactive roles, visible text"),
            new Capability("extract_table", "Table & List Extraction", "Available", "LOW", "Extract structured tabular data to CSV / Excel"),
            new Capability("fill_form", "Form Interaction", "Available", "MEDIUM", "Fill search fields, filters and inputs safely"),
            new Capability("download_file", "Export & File Download", "Available", "LOW", "Trigger and capture authorized reports and file exports")
        )),
        new ConnectorDef("whatsapp-business", "WhatsApp Business Platform", "Messaging & Collaboration", "Cloud API / Webhook", "POLICY_DEPENDENT", List.of(
            new Capability("receive_webhooks", "Receive Incoming Messages", "Available", "LOW", "Verify signature and process incoming customer inquiries"),
            new Capability("classify_intent", "Customer Intent Classifier", "Available", "LOW", "Detect pricing, support and lead acquisition intents"),
            new Capability("draft_reply", "AI Response Generator", "Available", "LOW", "Prepare context-aware response drafts for human approval"),
            new Capability("send_message", "Outbound Messaging", "Requires Approval", "HIGH", "Send template/session messages within 24hr window")
        )),
        new ConnectorDef("meta-instagram", "Instagram for Business", "Social Media", "OAuth 2.0 / Graph API", "SCOPES_REQUIRED", List.of(
            new Capability("read_insights", "Account Insights & Analytics", "Available", "LOW", "Retrieve impressions, reach and engagement rates"),
            new Capability("retrieve_comments", "Comment Retrieval", "Available", "LOW", "Fetch post comments and product questions"),
            new Capability("publish_media", "Publish Media & Reels", "Requires Approval", "HIGH", "Publish scheduled content after preview approval"),
            new Capability("reply_comment", "Post Comment Reply", "Requires Approval", "MEDIUM", "Post approved responses to customer comments")
        )),
        new ConnectorDef("linkedin", "LinkedIn Organization Pages", "Social Media", "OAuth 2.0 / REST API", "SCOPES_REQUIRED", List.of(
            new Capability("publish_post", "Publish Company Updates", "Requires Approval", "HIGH", "Publish corporate articles and hiring updates"),
            new Capability("analytics", "Page Analytics", "Available", "LOW", "Track follower growth and impression metrics")
        )),
        new ConnectorDef("facebook-pages", "Facebook Pages", "Social Media", "OAuth 2.0 / Graph API", "SCOPES_REQUIRED", List.of(
            new Capability("publish_page_post", "Publish Page Post", "Requires Approval", "HIGH", "Publish cross-platform updates to Facebook page"),
            new Capability("read_page_inbox", "Page Messages & Comments", "Available", "LOW", "Retrieve page customer inquiries")
        )),
        new ConnectorDef("slack", "Slack Workspace Integration", "Messaging & Collaboration", "Bot OAuth Token", "AVAILABLE", List.of(
            new Capability("send_channel_alert", "Channel Notifications", "Available", "LOW", "Post task completion summaries and approval alerts"),
            new Capability("read_channel_threads", "Thread Inspection", "Available", "LOW", "Summarize team conversation context")
        )),
        new ConnectorDef("gmail-outlook", "Business Email (Gmail & Outlook)", "Business Applications", "OAuth 2.0 / IMAP", "SCOPES_REQUIRED", List.of(
            new Capability("search_emails", "Search Invoices & Reports", "Available", "LOW", "Locate incoming supplier invoices and statements"),
            new Capability("draft_email", "Email Draft Preparation", "Available", "LOW", "Draft replies to business inquiries")
        ))
    );

    @GetMapping
    public List<ConnectorDef> list() {
        return CONNECTORS;
    }

    @GetMapping("/{id}/capabilities")
    public List<Capability> getCapabilities(@PathVariable String id) {
        return CONNECTORS.stream()
            .filter(c -> c.id().equalsIgnoreCase(id))
            .findFirst()
            .map(ConnectorDef::capabilities)
            .orElse(List.of());
    }
}
