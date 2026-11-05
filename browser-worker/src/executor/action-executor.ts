import type { Page } from "playwright";
import type { ActionStep } from "../ai/groq-planner.js";

export interface ExecutionLog {
  stepIndex: number;
  type: string;
  description: string;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  error?: string;
  durationMs: number;
}

export interface ExtractedItem {
  title: string;
  href?: string;
  category?: string;
  snippet?: string;
}

export interface ExecutionResult {
  actions: ExecutionLog[];
  extractedData: ExtractedItem[];
  screenshotBase64?: string;
  summary: string;
}

interface ExecutorOptions {
  credentials?: { username?: string; password?: string };
}

/**
 * Executes a sequence of planned actions sequentially on a Playwright page.
 */
export async function executePlan(
  page: Page,
  actions: ActionStep[],
  options?: ExecutorOptions
): Promise<ExecutionResult> {
  const executionLogs: ExecutionLog[] = [];
  const extractedData: ExtractedItem[] = [];

  for (let i = 0; i < actions.length; i++) {
    const step = actions[i];
    const startTime = Date.now();
    let status: "COMPLETED" | "FAILED" | "SKIPPED" = "COMPLETED";
    let stepError: string | undefined;

    try {
      switch (step.type) {
        case "navigate":
          if (step.url) {
            await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: 25000 });
          }
          break;

        case "fill":
          if (step.selector && step.value !== undefined) {
            const input = page.locator(step.selector).first();
            const count = await input.count().catch(() => 0);
            if (count > 0) {
              await input.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
              await input.click({ timeout: 3000 }).catch(() => {});
              await input.fill(step.value, { timeout: 4000 });
            } else {
              // Fallback to active focused element or first text input
              const fallback = page.locator("input[type='text'], input:not([type='hidden'])").first();
              if (await fallback.count().catch(() => 0) > 0) {
                await fallback.fill(step.value, { timeout: 3000 });
              }
            }
          }
          break;

        case "click":
          if (step.selector) {
            const btn = page.locator(step.selector).first();
            await btn.waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
            await btn.click({ timeout: 5000 });
          }
          break;

        case "press":
          if (step.key) {
            await page.keyboard.press(step.key);
          }
          break;

        case "wait":
          await page.waitForTimeout(step.milliseconds || 2000);
          break;

        case "auto_login":
          await handleAutoLogin(page, options?.credentials);
          break;

        case "extract":
          const items = await performDataExtraction(page);
          extractedData.push(...items);
          break;

        default:
          break;
      }
    } catch (err) {
      status = "FAILED";
      stepError = err instanceof Error ? err.message : String(err);
      console.warn(`[ActionExecutor] Step ${i + 1} (${step.type}) encountered non-fatal error:`, stepError);
    }

    executionLogs.push({
      stepIndex: i + 1,
      type: step.type.toUpperCase(),
      description: step.description,
      status,
      error: stepError,
      durationMs: Date.now() - startTime
    });
  }

  // Capture final page screenshot
  let screenshotBase64: string | undefined;
  try {
    const buffer = await page.screenshot({ type: "jpeg", quality: 55 });
    screenshotBase64 = "data:image/jpeg;base64," + buffer.toString("base64");
  } catch (_) {}

  const title = await page.title().catch(() => "Target Page");
  const url = page.url();
  const summary = `Executed ${executionLogs.length} step(s) on "${title}". Extracted ${extractedData.length} records.`;

  return {
    actions: executionLogs,
    extractedData,
    screenshotBase64,
    summary
  };
}

/**
 * Auto-detects login forms and safely fills credentials into email/username and password inputs.
 */
async function handleAutoLogin(
  page: Page,
  credentials?: { username?: string; password?: string }
): Promise<void> {
  const username = credentials?.username;
  const password = credentials?.password;

  if (!username && !password) {
    console.log("[ActionExecutor] No credentials provided for auto-login; relying on saved session cookies.");
    return;
  }

  // 1. Locate Username / Email field
  if (username) {
    const userSelectors = [
      "input[type='email']",
      "input[name*='user' i]",
      "input[name*='email' i]",
      "input[name*='login' i]",
      "input[id*='user' i]",
      "input[id*='email' i]",
      "input[type='text']:visible"
    ];
    for (const sel of userSelectors) {
      const el = page.locator(sel).first();
      if (await el.count().catch(() => 0) > 0) {
        await el.fill(username, { timeout: 3000 }).catch(() => {});
        break;
      }
    }
  }

  // 2. Locate Password field
  if (password) {
    const passSelectors = [
      "input[type='password']",
      "input[name*='pass' i]",
      "input[id*='pass' i]"
    ];
    for (const sel of passSelectors) {
      const el = page.locator(sel).first();
      if (await el.count().catch(() => 0) > 0) {
        await el.fill(password, { timeout: 3000 }).catch(() => {});
        break;
      }
    }
  }

  // 3. Click Submit / Sign In
  const submitSelectors = [
    "button[type='submit']",
    "input[type='submit']",
    "button:has-text('Sign In')",
    "button:has-text('Log In')",
    "button:has-text('Login')"
  ];
  for (const sel of submitSelectors) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0) > 0) {
      await el.click({ timeout: 4000 }).catch(() => {});
      break;
    }
  }
}

/**
 * Extracts structured items (title, href, snippet) from current DOM state.
 */
async function performDataExtraction(page: Page): Promise<ExtractedItem[]> {
  const extracted: ExtractedItem[] = [];

  // Priority 1: Check for Canva or SaaS design cards
  const designElements = await page.locator("a[href*='/design/']").evaluateAll(els => els.map(el => ({
    title: (el.textContent ?? "").trim().slice(0, 120) || (el.getAttribute("aria-label") ?? "Design Item"),
    href: (el as HTMLAnchorElement).href,
    category: "Design"
  }))).catch(() => []);

  if (designElements.length > 0) {
    return designElements.slice(0, 50);
  }

  // Priority 2: General visible link extraction
  const generalLinks = await page.locator("a:visible").evaluateAll(els => els.slice(0, 40).map(el => {
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const href = (el as HTMLAnchorElement).href;
    return {
      title: text || (el.getAttribute("aria-label") ?? "Navigation Link"),
      href: href && href.startsWith("http") ? href : undefined,
      category: "Link"
    };
  })).catch(() => []);

  return generalLinks.filter(item => item.title && item.title.length > 2);
}
