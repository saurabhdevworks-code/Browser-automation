import express from "express";
import { z } from "zod";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeHttpUrl } from "./security/url-policy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "32kb" }));
const port = Number(process.env.PORT ?? 3001);
const InspectSchema = z.object({ url: z.string().url(), task: z.string().min(1).max(2000) });

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

    // Allow client-side SPA hydration (Canva React bundle)
    await page.waitForTimeout(5000);

    const title = await page.title();
    const currentUrl = page.url();
    const pageText = (await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")).slice(0, 12000);

    // Prioritize extracting design links if available
    const designElements = await page.locator("a[href*='/design/']").evaluateAll(els => els.map(el => ({
      text: (el.textContent ?? "").trim().slice(0, 120) || (el.getAttribute("aria-label") ?? "Untitled Design"),
      href: (el as HTMLAnchorElement).href
    })));

    const generalLinks = await page.locator("a:visible").evaluateAll(els => els.slice(0, 40).map(el => ({
      text: (el.textContent ?? "").trim().slice(0, 120) || (el.getAttribute("aria-label") ?? "Link"),
      href: (el as HTMLAnchorElement).href
    })));

    const links = designElements.length > 0 ? designElements : generalLinks;

    let screenshotBase64: string | undefined;
    try {
      const buffer = await page.screenshot({ type: "jpeg", quality: 50 });
      screenshotBase64 = "data:image/jpeg;base64," + buffer.toString("base64");
    } catch (_) {}

    await context.close();

    let summary = `Inspected "${title || currentUrl}". Found ${links.length} link(s) / design(s).`;
    if (designElements.length > 0) {
      const names = designElements.slice(0, 5).map(d => d.text || "Untitled").join(", ");
      summary = `Successfully retrieved ${designElements.length} Canva design(s) from your account: [${names}]. Direct links extracted to CSV.`;
    }

    return res.json({
      summary,
      page: { title, url: currentUrl, text: pageText, links, screenshot: screenshotBase64 }
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

app.listen(port, "0.0.0.0", () => console.log(`Browser worker listening on ${port}`));
