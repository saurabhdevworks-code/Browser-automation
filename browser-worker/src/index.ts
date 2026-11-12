import express from "express";
import { z } from "zod";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeHttpUrl } from "./security/url-policy.js";
import {
  planActions,
  setRuntimeAiConfig,
  getRuntimeAiConfig,
  testAiConnection,
  askAiChat,
  type AiRuntimeConfig
} from "./ai/groq-planner.js";
import { executePlan } from "./executor/action-executor.js";
import { runJobScrapeAndApply } from "./jobs/job-automation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sanitizeUserId(userId: unknown): string {
  if (typeof userId === "string" && userId.trim().length > 0) {
    return userId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  }
  return "anonymous";
}

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "2mb" }));
const port = Number(process.env.PORT ?? 3001);

const PersonalFileSchema = z.object({
  id: z.string().optional(),
  fileName: z.string(),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  localPath: z.string().optional(),
  extractedText: z.string().optional()
});

const PersonalizationSchema = z.object({
  enabled: z.boolean().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  customText: z.string().optional(),
  summaryText: z.string().optional(),
  files: z.array(PersonalFileSchema).optional()
}).optional();

const AiConfigSchema = z.object({
  provider: z.enum(["gemini", "openai", "claude", "groq"]),
  apiKey: z.string(),
  model: z.string().optional().default("")
}).nullable().optional();

const InspectSchema = z.object({
  userId: z.string().optional(),
  url: z.string().url(),
  task: z.string().min(1).max(2000),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),
  personalization: PersonalizationSchema,
  aiConfig: AiConfigSchema,
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    targetName: z.string().optional(),
    extractedSummary: z.string().optional()
  })).max(40).optional()
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "browser-worker" }));

const JobRunSchema = z.object({
  userId: z.string().optional(),
  url: z.string().url(),
  requirements: z.string().min(1).max(2000),
  preferredLocation: z.string().max(255).optional(),
  autoApply: z.boolean().optional(),
  maxApplyPerRun: z.number().int().min(1).max(25).optional(),
  personalization: PersonalizationSchema,
  aiConfig: AiConfigSchema
});

app.post("/v1/jobs/run", async (req, res) => {
  const parsed = JobRunSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid job run request", details: parsed.error.flatten() });
  try {
    const result = await runJobScrapeAndApply(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : "Scheduled job automation failed" });
  }
});

app.post("/v1/inspect", async (req, res) => {
  const parsed = InspectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

  const safeUser = sanitizeUserId(parsed.data.userId);
  const perUserAiConfig = parsed.data.aiConfig as AiRuntimeConfig | null | undefined;

  const isJobAutomationTask =
    /(job|jobs|vacancy|vacancies|opening|openings|career|naukri|indeed|internshala|foundit)/i.test(parsed.data.task) &&
    /(scrap|scrape|extract|find|search|apply|match|requirement)/i.test(parsed.data.task) &&
    !/(image|photo|design|canva|logo)/i.test(parsed.data.task);
  if (isJobAutomationTask) {
    try {
      const jobResult = await runJobScrapeAndApply({
        userId: safeUser,
        url: parsed.data.url,
        requirements: parsed.data.task,
        autoApply: /\b(apply|submit)\b/i.test(parsed.data.task),
        maxApplyPerRun: 5,
        personalization: parsed.data.personalization,
        aiConfig: perUserAiConfig
      });
      return res.json({
        summary: jobResult.summary,
        plan: {
          engine: "job-automation-engine",
          explanation: jobResult.summary,
          actions: jobResult.executionLogs
        },
        executionLogs: jobResult.executionLogs,
        extractedRecords: jobResult.extractedRecords,
        matchedJobs: jobResult.matchedJobs,
        appliedCount: jobResult.appliedCount,
        allScrapedCount: jobResult.allScrapedCount,
        page: {
          title: jobResult.page.title,
          url: jobResult.page.url,
          text: "",
          links: jobResult.extractedRecords.map(r => ({ text: r.title, href: r.href || jobResult.page.url })),
          screenshot: jobResult.page.screenshot
        }
      });
    } catch (err) {
      return res.status(422).json({ error: err instanceof Error ? err.message : "Job automation failed" });
    }
  }

  let context;
  try {
    const baseTarget = await assertSafeHttpUrl(parsed.data.url);
    const domainKey = baseTarget.hostname.replace(/^www\./, "").split(".")[0];
    const profileDir = path.join(__dirname, `../profiles/${safeUser}/${domainKey}`);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Determine target URL (if prompt contains a specific URL on this domain, or if inspecting Canva projects)
    let destinationUrl = baseTarget.toString();
    const promptUrlMatch = parsed.data.task.match(/https?:\/\/[^\s"'<>]+/i);
    if (promptUrlMatch) {
      try {
        const promptTarget = new URL(promptUrlMatch[0]);
        if (promptTarget.hostname.includes(domainKey)) {
          destinationUrl = promptTarget.toString();
        }
      } catch (_) {}
    } else if (domainKey === "canva" && /(design|project|folder|recent|image|photo|media|upload)/i.test(parsed.data.task)) {
      destinationUrl = "https://www.canva.com/projects";
    }

    // Launch with real Chrome and user-isolated persistent profile
    context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false, // Visible execution ensures full rendering & anti-detection
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox"
      ],
      viewport: { width: 1280, height: 800 }
    });

    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(destinationUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Allow client-side SPA hydration
    await page.waitForTimeout(3000);

    // 1. Generate Action Plan via per-user LLM config (with heuristic fallback)
    const plan = await planActions({
      task: parsed.data.task,
      url: destinationUrl,
      credentials: parsed.data.credentials,
      personalization: parsed.data.personalization,
      history: parsed.data.history,
      aiConfig: perUserAiConfig
    });

    // 2. Execute Planned Actions with Playwright
    const execution = await executePlan(page, plan.actions, {
      credentials: parsed.data.credentials,
      task: parsed.data.task,
      personalization: parsed.data.personalization
    });

    const title = await page.title().catch(() => "");
    const currentUrl = page.url();
    const pageText = (await page.locator("body").innerText({ timeout: 4000 }).catch(() => "")).slice(0, 12000);

    // Format links for compatibility
    const links = execution.extractedData.map(item => ({
      text: item.title,
      href: item.href || currentUrl
    }));

    await context.close();

    const summary = `${plan.explanation} (${execution.actions.length} action(s) executed). ${execution.extractedData.length} records extracted.`;

    return res.json({
      summary,
      plan: {
        engine: plan.engine,
        explanation: plan.explanation,
        actions: plan.actions
      },
      executionLogs: execution.actions,
      extractedRecords: execution.extractedData,
      page: {
        title,
        url: currentUrl,
        text: pageText,
        links,
        screenshot: execution.screenshotBase64
      }
    });
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : "Inspection failed" });
  } finally {
    await context?.close().catch(() => undefined);
  }
});

// Active Playwright interactive login windows isolated per userId
const activeLoginSessions = new Map<string, { context: any; domainKey: string }>();

app.post("/v1/launch-login", async (req, res) => {
  const url = req.body?.url;
  const safeUser = sanitizeUserId(req.body?.userId);
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid URL" });
  }

  try {
    const target = await assertSafeHttpUrl(url);
    const domainKey = target.hostname.replace(/^www\./, "").split(".")[0];
    const profileDir = path.join(__dirname, `../profiles/${safeUser}/${domainKey}`);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const existing = activeLoginSessions.get(safeUser);
    if (existing) {
      await existing.context.close().catch(() => {});
      activeLoginSessions.delete(safeUser);
    }

    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--start-maximized"
      ],
      viewport: null
    });

    const page = context.pages()[0] || await context.newPage();
    await page.goto(target.toString());

    activeLoginSessions.set(safeUser, { context, domainKey });
    return res.json({
      status: "OPENED",
      domain: domainKey,
      message: `Browser window opened for ${domainKey}. Please complete your login and click Save in the UI.`
    });
  } catch (err) {
    return res.status(422).json({ error: err instanceof Error ? err.message : "Failed to open login browser" });
  }
});

app.post("/v1/confirm-login", async (req, res) => {
  const safeUser = sanitizeUserId(req.body?.userId);
  const session = activeLoginSessions.get(safeUser);
  if (!session) {
    return res.status(400).json({ error: "No active login browser window found for this account." });
  }

  try {
    const domain = session.domainKey;
    await session.context.close().catch(() => {});
    activeLoginSessions.delete(safeUser);

    return res.json({
      status: "AUTHENTICATED",
      domain,
      message: `Session for ${domain} saved successfully in your isolated browser profile!`
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save session" });
  }
});

app.post("/v1/cancel-login", async (req, res) => {
  const safeUser = sanitizeUserId(req.body?.userId);
  const session = activeLoginSessions.get(safeUser);
  if (session) {
    await session.context.close().catch(() => {});
    activeLoginSessions.delete(safeUser);
  }
  return res.json({ status: "CANCELLED" });
});

app.post("/v1/config/test", async (req, res) => {
  const { provider, apiKey, model } = req.body || {};
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ success: false, message: "Missing or invalid API key" });
  }
  const validProvider = (["gemini", "openai", "claude", "groq"].includes(provider) ? provider : "gemini") as AiRuntimeConfig["provider"];
  const cleanKey = apiKey.trim();
  const cleanModel = typeof model === "string" ? model.trim() : "";

  try {
    const testRes = await testAiConnection({ provider: validProvider, apiKey: cleanKey, model: cleanModel }, false);
    return res.json(testRes);
  } catch (err) {
    return res.json({
      success: false,
      message: err instanceof Error ? err.message : "Validation failed"
    });
  }
});

app.get("/v1/config/ai", (_req, res) => {
  return res.json(getRuntimeAiConfig());
});

app.post("/v1/config/ai", async (req, res) => {
  const { provider, apiKey, model, skipTest } = req.body || {};
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ error: "Missing or invalid API key" });
  }

  const validProvider = (["gemini", "openai", "claude", "groq"].includes(provider) ? provider : "gemini") as AiRuntimeConfig["provider"];
  const cleanKey = apiKey.trim();
  const cleanModel = typeof model === "string" ? model.trim() : "";

  setRuntimeAiConfig({ provider: validProvider, apiKey: cleanKey, model: cleanModel });

  let testMessage = `Saved ${validProvider.toUpperCase()} configuration!`;
  let isVerified = true;

  if (!skipTest) {
    try {
      const testRes = await testAiConnection({ provider: validProvider, apiKey: cleanKey, model: cleanModel }, true);
      isVerified = testRes.success;
      if (testRes.success) {
        testMessage = testRes.message;
      } else {
        testMessage = `Saved! (Live test warning: ${testRes.message})`;
      }
    } catch (err) {
      isVerified = false;
      testMessage = `Saved! (Live test note: ${err instanceof Error ? err.message : "Validation skipped"})`;
    }
  }

  return res.json({
    success: true,
    verified: isVerified,
    message: testMessage,
    config: getRuntimeAiConfig()
  });
});

app.delete("/v1/config/ai", (_req, res) => {
  setRuntimeAiConfig(null);
  return res.json({ success: true, message: "AI Configuration cleared", config: getRuntimeAiConfig() });
});

app.post("/v1/chat", async (req, res) => {
  const { prompt, personalization, history, aiConfig } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt" });
  }
  try {
    const safeHistory = Array.isArray(history) ? history : undefined;
    // Pass aiConfig explicitly (even null when a user has no saved key) so keys never leak across users
    const resolvedAiConfig = aiConfig === undefined ? null : (aiConfig as AiRuntimeConfig | null);
    const { reply, aiError } = await askAiChat(prompt.trim(), personalization, safeHistory, resolvedAiConfig);
    return res.json({ success: true, reply, aiError });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Chat processing failed" });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`Browser worker listening on ${port}`));
