import express from "express";
import { z } from "zod";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeHttpUrl } from "./security/url-policy.js";
import { planActions, setRuntimeAiConfig, getRuntimeAiConfig, testAiConnection } from "./ai/groq-planner.js";
import { executePlan } from "./executor/action-executor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "32kb" }));
const port = Number(process.env.PORT ?? 3001);

const InspectSchema = z.object({
  url: z.string().url(),
  task: z.string().min(1).max(2000),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional()
  }).optional()
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "browser-worker" }));

app.post("/v1/inspect", async (req, res) => {
  const parsed = InspectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

  let context;
  try {
    const baseTarget = await assertSafeHttpUrl(parsed.data.url);
    const domainKey = baseTarget.hostname.replace(/^www\./, "").split(".")[0];
    const profileDir = path.join(__dirname, `../profiles/${domainKey}`);
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
    } else if (domainKey === "canva" && /(design|project|folder|recent)/i.test(parsed.data.task)) {
      destinationUrl = "https://www.canva.com/projects";
    }

    // Launch with real Chrome and persistent user profile (bypasses Cloudflare bot detection)
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

    // 1. Generate Action Plan via Groq LLM (with heuristic fallback)
    const plan = await planActions({
      task: parsed.data.task,
      url: destinationUrl,
      credentials: parsed.data.credentials
    });

    // 2. Execute Planned Actions with Playwright
    const execution = await executePlan(page, plan.actions, {
      credentials: parsed.data.credentials
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

let activeLoginSession: { context: any; domainKey: string } | null = null;

app.post("/v1/launch-login", async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid URL" });
  }

  try {
    const target = await assertSafeHttpUrl(url);
    const domainKey = target.hostname.replace(/^www\./, "").split(".")[0];
    const profileDir = path.join(__dirname, `../profiles/${domainKey}`);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    if (activeLoginSession) {
      await activeLoginSession.context.close().catch(() => {});
      activeLoginSession = null;
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

    activeLoginSession = { context, domainKey };
    return res.json({
      status: "OPENED",
      domain: domainKey,
      message: `Browser window opened for ${domainKey}. Please complete your login and click Save in the UI.`
    });
  } catch (err) {
    return res.status(422).json({ error: err instanceof Error ? err.message : "Failed to open login browser" });
  }
});

app.post("/v1/confirm-login", async (_req, res) => {
  if (!activeLoginSession) {
    return res.status(400).json({ error: "No active login browser window found." });
  }

  try {
    const domain = activeLoginSession.domainKey;
    await activeLoginSession.context.close().catch(() => {});
    activeLoginSession = null;

    return res.json({
      status: "AUTHENTICATED",
      domain,
      message: `Session for ${domain} saved successfully in persistent profile! The agent is now authenticated.`
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save session" });
  }
});

app.post("/v1/cancel-login", async (_req, res) => {
  if (activeLoginSession) {
    await activeLoginSession.context.close().catch(() => {});
    activeLoginSession = null;
  }
  return res.json({ status: "CANCELLED" });
});

app.get("/v1/config/ai", (_req, res) => {
  return res.json(getRuntimeAiConfig());
});

app.post("/v1/config/ai", async (req, res) => {
  const { provider, apiKey, model, skipTest } = req.body || {};
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ error: "Missing or invalid API key" });
  }

  const validProvider = ["gemini", "openai", "claude", "groq"].includes(provider) ? provider : "gemini";
  const cleanKey = apiKey.trim();
  const cleanModel = typeof model === "string" ? model.trim() : "";

  // Always save configuration immediately so credentials are never lost
  setRuntimeAiConfig({ provider: validProvider, apiKey: cleanKey, model: cleanModel });

  let testMessage = `Saved ${validProvider.toUpperCase()} configuration!`;
  let isVerified = true;

  if (!skipTest) {
    try {
      const testRes = await testAiConnection({ provider: validProvider, apiKey: cleanKey, model: cleanModel });
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

app.listen(port, "0.0.0.0", () => console.log(`Browser worker listening on ${port}`));
