import fs from "node:fs";
import type { Page } from "playwright";
import type { ActionStep, PersonalizationContext } from "../ai/groq-planner.js";
import { extractStructuredJobs } from "../jobs/job-automation.js";
import { extractStructuredLeads } from "../leads/lead-automation.js";

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
  imageUrl?: string;
  fileExt?: string;
  category?: string;
  snippet?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  location?: string;
  platform?: string;
}

export interface ExecutionResult {
  actions: ExecutionLog[];
  extractedData: ExtractedItem[];
  screenshotBase64?: string;
  summary: string;
}

interface ExecutorOptions {
  credentials?: { username?: string; password?: string };
  task?: string;
  personalization?: PersonalizationContext;
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
    let stepDescription = step.description;

    try {
      switch (step.type) {
        case "navigate":
          if (step.url) {
            await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: 25000 });
          }
          break;

        case "fill":
          if (step.selector && step.value !== undefined) {
            const resolvedValue = resolvePersonalTemplate(step.value, options?.personalization);
            const input = page.locator(step.selector).first();
            const count = await input.count().catch(() => 0);
            if (count > 0) {
              await input.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
              await input.click({ timeout: 3000 }).catch(() => {});
              await input.fill(resolvedValue, { timeout: 4000 });
            } else {
              // Fallback to active focused element or first text input
              const fallback = page.locator("input[type='text'], input:not([type='hidden'])").first();
              if (await fallback.count().catch(() => 0) > 0) {
                await fallback.fill(resolvedValue, { timeout: 3000 });
              }
            }
          }
          break;

        case "autofill_personal": {
          const filledCount = await handleAutofillPersonal(page, options?.personalization);
          stepDescription = filledCount > 0
            ? `${step.description} (${filledCount} field(s) filled)`
            : `${step.description} (no matching empty personal fields detected)`;
          break;
        }

        case "upload": {
          const uploadedFileName = await handlePersonalFileUpload(page, step.selector, step.value, options?.personalization);
          stepDescription = uploadedFileName
            ? `Uploaded personal file "${uploadedFileName}" into page file input`
            : "Attempted file upload from Personalization files";
          break;
        }

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

        case "scroll":
          await page.evaluate(async () => {
            window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: "smooth" });
          }).catch(() => {});
          await page.waitForTimeout(1200);
          break;

        case "auto_login":
          await handleAutoLogin(page, options?.credentials);
          break;

        case "extract": {
          const items = await performDataExtraction(page, options?.task);
          extractedData.push(...items);
          break;
        }

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
      description: stepDescription,
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
  const summary = `Executed ${executionLogs.length} step(s) on "${title}". Extracted ${extractedData.length} records.`;

  return {
    actions: executionLogs,
    extractedData,
    screenshotBase64,
    summary
  };
}

function resolvePersonalTemplate(value: string, p?: PersonalizationContext): string {
  if (!p || p.enabled === false) return value;
  return value
    .replace(/\{\{\s*PERSONAL_NAME\s*\}\}/gi, p.fullName || "")
    .replace(/\{\{\s*PERSONAL_EMAIL\s*\}\}/gi, p.email || "")
    .replace(/\{\{\s*PERSONAL_PHONE\s*\}\}/gi, p.phone || "")
    .replace(/\{\{\s*PERSONAL_LOCATION\s*\}\}/gi, p.location || "")
    .replace(/\{\{\s*PERSONAL_TEXT\s*\}\}/gi, p.customText || "");
}

function parseCustomKeyValues(p?: PersonalizationContext): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  const sources = [p?.customText || ""];
  for (const f of p?.files || []) {
    if (f.extractedText) sources.push(f.extractedText);
  }
  for (const src of sources) {
    for (const line of src.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z][A-Za-z0-9 _/\-]{1,40})\s*:\s*(.+?)\s*$/);
      if (m) {
        const k = m[1].trim().toLowerCase();
        const v = m[2].trim();
        if (k && v) entries.push({ key: k, value: v });
      }
    }
  }
  return entries;
}

/**
 * Detects visible personal-information inputs on the current page and fills them from saved Personalization data.
 */
export async function handleAutofillPersonal(
  page: Page,
  personalization?: PersonalizationContext
): Promise<number> {
  if (!personalization || personalization.enabled === false) {
    return 0;
  }

  const fullName = (personalization.fullName || "").trim();
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const email = (personalization.email || "").trim();
  const phone = (personalization.phone || "").trim();
  const location = (personalization.location || "").trim();
  const customPairs = parseCustomKeyValues(personalization);
  const longText = (
    personalization.customText?.trim() ||
    personalization.files?.find(f => f.extractedText?.trim())?.extractedText?.trim() ||
    ""
  ).slice(0, 3000);

  const candidates = await page.locator("input:visible, textarea:visible").evaluateAll(els => {
    return els.map((node, domIndex) => {
      const el = node as HTMLInputElement | HTMLTextAreaElement;
      const tag = el.tagName.toLowerCase();
      const inputType = tag === "input" ? ((el as HTMLInputElement).type || "text").toLowerCase() : "textarea";
      if (["hidden", "password", "search", "submit", "button", "reset", "file", "checkbox", "radio", "image"].includes(inputType)) {
        return null;
      }
      if ((el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled) return null;
      if (el.value && el.value.trim().length > 0) return null;

      let labelText = "";
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl?.textContent) labelText += " " + lbl.textContent;
      }
      const parentLabel = el.closest("label");
      if (parentLabel?.textContent) labelText += " " + parentLabel.textContent;
      const ariaLabel = el.getAttribute("aria-label") || "";
      const placeholder = el.getAttribute("placeholder") || "";
      const nameAttr = el.getAttribute("name") || "";
      const idAttr = el.getAttribute("id") || "";
      const autoAttr = el.getAttribute("autocomplete") || "";

      const hint = `${labelText} ${ariaLabel} ${placeholder} ${nameAttr} ${idAttr} ${autoAttr}`
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      return { domIndex, tag, inputType, hint };
    }).filter((x): x is { domIndex: number; tag: string; inputType: string; hint: string } => x !== null);
  }).catch(() => []);

  let filledCount = 0;
  const fieldsLocator = page.locator("input:visible, textarea:visible");

  for (const field of candidates) {
    const h = field.hint;
    let valueToFill = "";

    // Check custom Key: Value fields first when a specific match exists
    for (const pair of customPairs) {
      if (pair.key.length >= 3 && h.includes(pair.key)) {
        valueToFill = pair.value;
        break;
      }
    }

    if (!valueToFill) {
      if ((field.inputType === "email" || /\b(e-?mail)\b/.test(h)) && email) {
        valueToFill = email;
      } else if ((field.inputType === "tel" || /\b(phone|mobile|cell|telephone|contact\s*number)\b/.test(h)) && phone) {
        valueToFill = phone;
      } else if (/\b(first\s*name|given\s*name|fname)\b/.test(h) && firstName) {
        valueToFill = firstName;
      } else if (/\b(last\s*name|family\s*name|surname|lname)\b/.test(h) && lastName) {
        valueToFill = lastName;
      } else if (/\b(full\s*name|your\s*name|applicant\s*name|candidate\s*name|name)\b/.test(h) && !/(company|org|user|project|file)/.test(h) && fullName) {
        valueToFill = fullName;
      } else if (/\b(city|location|address|street|country|region|postal|zip)\b/.test(h) && location) {
        valueToFill = location;
      } else if ((field.tag === "textarea" || /\b(bio|about|summary|cover\s*letter|message|note|notes|description|experience|skills|introduce|why)\b/.test(h)) && longText) {
        valueToFill = longText;
      }
    }

    if (valueToFill) {
      try {
        const target = fieldsLocator.nth(field.domIndex);
        await target.click({ timeout: 2000 }).catch(() => {});
        await target.fill(valueToFill, { timeout: 3000 });
        filledCount++;
      } catch (_) {}
    }
  }

  return filledCount;
}

/**
 * Uploads a saved Personalization file into the matching file input on the page.
 */
export async function handlePersonalFileUpload(
  page: Page,
  selector: string | undefined,
  preferredName: string | undefined,
  personalization?: PersonalizationContext
): Promise<string> {
  if (!personalization || personalization.enabled === false) {
    throw new Error("Personalization is disabled.");
  }
  const availableFiles = (personalization.files || []).filter(f => f.localPath && fs.existsSync(f.localPath));
  if (availableFiles.length === 0) {
    throw new Error("No uploaded files found in Personalization settings.");
  }

  let chosen = availableFiles[0];
  if (preferredName && preferredName.trim()) {
    const q = preferredName.trim().toLowerCase();
    const matched = availableFiles.find(f => f.fileName.toLowerCase().includes(q));
    if (matched) chosen = matched;
  }

  const targetSel = selector && selector.includes("file") ? selector : "input[type='file']";
  let fileInput = page.locator(targetSel).first();
  if ((await fileInput.count().catch(() => 0)) === 0) {
    fileInput = page.locator("input[type='file']").first();
  }
  if ((await fileInput.count().catch(() => 0)) === 0) {
    throw new Error("No file upload input (<input type='file'>) detected on page.");
  }

  await fileInput.setInputFiles(chosen.localPath!);
  return chosen.fileName;
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
 * Extracts structured items (designs, images, downloadable files, links) from current DOM state.
 */
async function performDataExtraction(page: Page, task?: string): Promise<ExtractedItem[]> {
  const taskLower = (task || "").toLowerCase();
  const genericDownloadAll = /\b(?:download|export|save)\s+(?:all|them|these|those|everything)\b/i.test(taskLower) || /^download$/i.test(taskLower.trim());
  const wantsImages = /(image|img|photo|picture|gallery|media|thumbnail|visual|design|project)/i.test(taskLower) || genericDownloadAll;
  const wantsFiles = /(file|pdf|doc|csv|excel|xlsx|zip|download|report|document)/i.test(taskLower);
  const wantsLeads = /\b(lead|leads|prospect|prospects|client|clients|customer|customers|contact|contacts|outreach|b2b|b2c|email|emails|phone)\b/i.test(taskLower) && !wantsImages;
  if (wantsLeads) {
    const leadCards = await extractStructuredLeads(page);
    if (leadCards.length > 0) {
      return leadCards;
    }
  }
  const wantsJobs = /(job|jobs|career|hiring|opening|vacancy|role|developer|engineer|naukri|linkedin|indeed|internshala|foundit)/i.test(taskLower) && !wantsImages;
  if (wantsJobs) {
    const jobCards = await extractStructuredJobs(page);
    if (jobCards.length > 0) {
      return jobCards.map(j => ({
        title: `${j.title} — ${j.company} (${j.location} | ${j.experience})`,
        href: j.href,
        category: "Job",
        snippet: j.salary
      }));
    }
  }

  // Gently scroll once to trigger lazy-loaded images/cards on SPAs
  await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.8))).catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  // 1. Check for Canva or SaaS design cards (with inner thumbnail img if present)
  const designElements: ExtractedItem[] = await page.locator("a[href*='/design/']").evaluateAll(els => els.map(el => {
    const anchor = el as HTMLAnchorElement;
    const container = anchor.closest("[role='listitem'], [data-testid], article, li, div") || anchor;
    const img = anchor.querySelector("img") || container.querySelector("img");
    const imgSrc = img ? (img.currentSrc || img.getAttribute("src") || "") : "";
    const label = (anchor.getAttribute("aria-label") || anchor.textContent || img?.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 120);
    return {
      title: label || "Design Item",
      href: anchor.href,
      imageUrl: imgSrc && imgSrc.startsWith("http") ? imgSrc : undefined,
      category: "Design"
    };
  })).catch(() => []);

  // 2. Extract visible images (skip tiny UI icons & tracking pixels)
  const imageElements: ExtractedItem[] = await page.locator("img").evaluateAll(els => {
    const out: Array<{ title: string; href?: string; imageUrl?: string; category: string }> = [];
    for (const node of els) {
      const img = node as HTMLImageElement;
      const src = img.currentSrc || img.getAttribute("src") || "";
      if (!src || (!src.startsWith("http://") && !src.startsWith("https://"))) continue;
      const rect = img.getBoundingClientRect();
      const width = Math.max(rect.width, img.naturalWidth || 0);
      const height = Math.max(rect.height, img.naturalHeight || 0);
      if (width < 48 || height < 48) continue;

      const parentLink = img.closest("a") as HTMLAnchorElement | null;
      const urlName = (() => {
        try {
          const p = new URL(src).pathname.split("/").filter(Boolean).pop() || "";
          return decodeURIComponent(p).slice(0, 80);
        } catch {
          return "";
        }
      })();
      const alt = (img.getAttribute("alt") || img.getAttribute("aria-label") || parentLink?.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120);
      out.push({
        title: alt || urlName || "Scraped Image",
        href: parentLink?.href && parentLink.href.startsWith("http") ? parentLink.href : src,
        imageUrl: src,
        category: "Image"
      });
    }
    return out;
  }).catch(() => []);

  // 3. Extract downloadable files / documents
  const fileElements: ExtractedItem[] = await page.locator("a[href]").evaluateAll(els => {
    const fileExtRx = /\.(pdf|png|jpe?g|webp|gif|svg|csv|xlsx?|docx?|pptx?|zip|json|txt|mp4)(?:[?#].*)?$/i;
    const out: Array<{ title: string; href?: string; fileExt?: string; category: string }> = [];
    for (const node of els) {
      const a = node as HTMLAnchorElement;
      const href = a.href || "";
      if (!href.startsWith("http")) continue;
      const match = href.match(fileExtRx);
      const hasDownloadAttr = a.hasAttribute("download");
      if (!match && !hasDownloadAttr) continue;
      const ext = match ? match[1].toUpperCase() : "FILE";
      const text = (a.textContent || a.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const fallbackName = (() => {
        try {
          return decodeURIComponent(new URL(href).pathname.split("/").filter(Boolean).pop() || "");
        } catch {
          return "Downloaded File";
        }
      })();
      out.push({
        title: text || fallbackName || "Scraped File",
        href,
        fileExt: ext,
        category: "File"
      });
    }
    return out;
  }).catch(() => []);

  // 4. General visible links
  const generalLinks: ExtractedItem[] = await page.locator("a:visible").evaluateAll(els => els.slice(0, 40).map(el => {
    const a = el as HTMLAnchorElement;
    const text = (a.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const href = a.href;
    return {
      title: text || (a.getAttribute("aria-label") ?? "Navigation Link"),
      href: href && href.startsWith("http") ? href : undefined,
      category: "Link"
    };
  })).catch(() => []);

  const combined: ExtractedItem[] = [];
  const seen = new Set<string>();
  const addItems = (list: ExtractedItem[]) => {
    for (const item of list) {
      if (!item.title || item.title.length < 2) continue;
      const key = (item.imageUrl || item.href || item.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
      if (combined.length >= 60) break;
    }
  };

  if (wantsFiles) {
    addItems(fileElements);
    addItems(designElements);
    addItems(imageElements);
  } else if (wantsImages) {
    addItems(designElements);
    addItems(imageElements);
    addItems(fileElements);
  } else {
    addItems(designElements);
    addItems(fileElements);
    addItems(imageElements);
  }

  if (combined.length === 0) {
    addItems(generalLinks);
  }

  return combined;
}
