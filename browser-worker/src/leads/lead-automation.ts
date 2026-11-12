import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeHttpUrl } from "../security/url-policy.js";
import {
  askAiJson,
  hasPersonalizationData,
  type AiRuntimeConfig,
  type PersonalizationContext
} from "../ai/groq-planner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sanitizeUserId(userId: unknown): string {
  if (typeof userId === "string" && userId.trim().length > 0) {
    return userId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  }
  return "anonymous";
}

export interface LeadRecord {
  title: string;
  href?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  location?: string;
  platform?: string;
  snippet?: string;
  category: "Lead";
  matchScore?: number;
  matchReason?: string;
}

export interface LeadRunInput {
  userId?: string;
  url: string;
  prompt: string;
  platformName?: string;
  personalization?: PersonalizationContext;
  aiConfig?: AiRuntimeConfig | null;
}

export interface LeadRunResult {
  summary: string;
  executionLogs: Array<{ type: string; description: string; status: string }>;
  extractedRecords: LeadRecord[];
  matchedLeads: LeadRecord[];
  allScrapedCount: number;
  page: {
    title: string;
    url: string;
    screenshot?: string;
  };
}

/**
 * Extracts a clean search phrase when the prompt specifies a target audience/niche,
 * or derives keywords from saved Personalization notes/files if the prompt is generic.
 */
export function deriveLeadSearchQuery(prompt: string, personalization?: PersonalizationContext): string {
  let cleaned = prompt
    .replace(/@[a-zA-Z0-9_.\-]+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(
      /\b(please|kindly|can\s+you|could\s+you|i\s+want\s+to|help\s+me|generate|find|get|scrape|extract|collect|build|pull|fetch|search|list|give\s+me|show\s+me|some|more|new|fresh|verified|good|best|top|all|any|leads?|prospects?|clients?|customers?|contacts?|outreach|details|emails?|phone\s*numbers?|based\s+on|from|across|using|with|my|our|the|connected|platforms?|websites?|sites?|portals?|accounts?|for|in|of|and|to|or|csv|excel|export)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 90);
  }

  // Fallback to niche/role/industry cues from Personalization if enabled
  if (hasPersonalizationData(personalization)) {
    const rawText = [
      personalization?.customText || "",
      personalization?.files?.map(f => f.extractedText || "").join(" ") || ""
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const targetMatch = rawText.match(/(?:target\s*(?:audience|clients?|customers?|market|industry|leads?)|services?|looking\s+for|niche|industry|skills?)\s*[:\-]\s*([^\n.,;]{3,70})/i);
    if (targetMatch?.[1]) {
      return targetMatch[1].trim();
    }
  }

  return "";
}

/**
 * Scans the current DOM for profile cards, directory entries, feed posts, mailto:/tel: links,
 * and email/phone mentions to return clean deduplicated lead records.
 */
export async function extractStructuredLeads(page: Page, platformName?: string): Promise<LeadRecord[]> {
  // Smooth scroll twice to hydrate lazy cards / feeds / directories
  await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.85))).catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.85))).catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  const resolvedPlatform =
    platformName ||
    (() => {
      try {
        return new URL(page.url()).hostname.replace(/^www\./, "");
      } catch {
        return "Connected Website";
      }
    })();

  const rawLeads: LeadRecord[] = await page.evaluate((plat) => {
    const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const PHONE_RX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\d{10,12})/g;

    const clean = (s?: string | null) => (s || "").replace(/\s+/g, " ").trim();
    const isNoiseUrl = (href?: string) =>
      !href ||
      /^(?:javascript:|#)/i.test(href) ||
      /\/(?:login|signin|signup|register|privacy|terms|cookie|help|support|about|pricing|settings)(?:[/?#]|$)/i.test(href);
    const isNoiseEmail = (e: string) =>
      /(?:example\.com|sentry\.io|wixpress|noreply|no-reply|donotreply|@2x\.png|\.jpg|\.png|\.svg)/i.test(e);

    const results: Array<{
      title: string;
      href?: string;
      email?: string;
      phone?: string;
      company?: string;
      role?: string;
      location?: string;
      platform: string;
      snippet?: string;
      category: "Lead";
    }> = [];
    const seen = new Set<string>();

    const pushUnique = (item: typeof results[number]) => {
      const key = (item.email || item.href || item.phone || item.title).toLowerCase();
      if (!key || key.length < 3 || seen.has(key)) return;
      seen.add(key);
      results.push(item);
    };

    // 1. Direct mailto: and tel: anchors anywhere on page
    document.querySelectorAll("a[href^='mailto:']").forEach(node => {
      const a = node as HTMLAnchorElement;
      const email = clean(a.href.replace(/^mailto:/i, "").split("?")[0]);
      if (!email || !email.includes("@") || isNoiseEmail(email)) return;
      const card = a.closest("article, li, tr, [role='listitem'], section, div");
      const heading = card?.querySelector("h1, h2, h3, h4, strong, b")?.textContent;
      const name = clean(heading) || clean(a.textContent) || email.split("@")[0];
      pushUnique({
        title: name.slice(0, 100),
        email,
        href: window.location.href,
        platform: plat,
        snippet: clean(card?.textContent).slice(0, 220),
        category: "Lead"
      });
    });

    document.querySelectorAll("a[href^='tel:']").forEach(node => {
      const a = node as HTMLAnchorElement;
      const phone = clean(a.href.replace(/^tel:/i, ""));
      if (!phone || phone.replace(/\D/g, "").length < 7) return;
      const card = a.closest("article, li, tr, [role='listitem'], section, div");
      const heading = card?.querySelector("h1, h2, h3, h4, strong, b")?.textContent;
      const cardEmails = clean(card?.textContent).match(EMAIL_RX) || [];
      const email = cardEmails.find(e => !isNoiseEmail(e));
      pushUnique({
        title: (clean(heading) || clean(a.textContent) || phone).slice(0, 100),
        phone,
        email,
        href: window.location.href,
        platform: plat,
        snippet: clean(card?.textContent).slice(0, 220),
        category: "Lead"
      });
    });

    // 2. Repeating card / profile / contact / directory blocks
    const cardSelectors = [
      "article",
      "[role='listitem']",
      "li[class*='result' i]",
      "li[class*='card' i]",
      "li[class*='item' i]",
      "div[class*='profile' i]",
      "div[class*='lead' i]",
      "div[class*='contact' i]",
      "div[class*='card' i]",
      "div[class*='result' i]",
      "div[data-testid*='card' i]",
      "div[data-view-name]",
      "table tbody tr"
    ].join(", ");

    const cardEls = Array.from(document.querySelectorAll(cardSelectors)).slice(0, 140);
    for (const el of cardEls) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 28 || rect.height > 900) continue;
      const text = clean((el as HTMLElement).innerText || el.textContent);
      if (text.length < 12 || text.length > 2500) continue;

      const primaryAnchor =
        (el.querySelector("h1 a, h2 a, h3 a, h4 a, a[href*='/in/'], a[href*='/profile'], a[href*='/user'], a[href*='/company'], a[href*='/p/'], a[href^='http']") as HTMLAnchorElement | null) ||
        (el.querySelector("a[href]") as HTMLAnchorElement | null);
      const href = primaryAnchor?.href && !isNoiseUrl(primaryAnchor.href) ? primaryAnchor.href : undefined;

      const headingEl = el.querySelector("h1, h2, h3, h4, [class*='name' i], [class*='title' i], strong");
      const rawTitle = clean(headingEl?.textContent) || clean(primaryAnchor?.textContent) || clean(text.split(/\n|\|/)[0]);
      if (!rawTitle || rawTitle.length < 2 || /^(home|menu|search|filter|sort|sign in|login|sponsored)$/i.test(rawTitle)) {
        continue;
      }

      const emails = (text.match(EMAIL_RX) || []).filter(e => !isNoiseEmail(e));
      const phones = (text.match(PHONE_RX) || []).filter(p => p.replace(/\D/g, "").length >= 10);
      const email = emails[0];
      const phone = phones[0];

      // Keep cards that have either a contact signal (email/phone) OR a clear profile/company/entity link + subtitle
      const subtitleEl = el.querySelector("[class*='sub' i], [class*='role' i], [class*='company' i], [class*='headline' i], [class*='desc' i], p, small");
      const subtitle = clean(subtitleEl?.textContent);
      const locEl = el.querySelector("[class*='loc' i], [class*='city' i], [class*='address' i]");
      const location = clean(locEl?.textContent);

      if (!email && !phone && !href && !subtitle) continue;

      pushUnique({
        title: rawTitle.slice(0, 100),
        href: href || window.location.href,
        email,
        phone,
        role: subtitle && subtitle !== rawTitle ? subtitle.slice(0, 120) : undefined,
        location: location ? location.slice(0, 80) : undefined,
        platform: plat,
        snippet: text.slice(0, 220),
        category: "Lead"
      });
      if (results.length >= 45) break;
    }

    // 3. Fallback: scan entire body text for any email addresses not yet captured
    if (results.length < 15) {
      const bodyText = clean(document.body?.innerText || "");
      const pageEmails = Array.from(new Set(bodyText.match(EMAIL_RX) || [])).filter(e => !isNoiseEmail(e));
      for (const email of pageEmails.slice(0, 15)) {
        pushUnique({
          title: email.split("@")[0].replace(/[._-]+/g, " "),
          email,
          href: window.location.href,
          platform: plat,
          snippet: `Contact discovered on ${plat}`,
          category: "Lead"
        });
      }
    }

    return results.slice(0, 45);
  }, resolvedPlatform).catch(() => []);

  return rawLeads;
}

export async function runLeadGeneration(input: LeadRunInput): Promise<LeadRunResult> {
  const safeUser = sanitizeUserId(input.userId);
  const safeTarget = await assertSafeHttpUrl(input.url);
  const domainKey = safeTarget.hostname.replace(/^www\./, "").split(".")[0];
  const profileDir = path.join(__dirname, `../../profiles/${safeUser}/${domainKey}`);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const executionLogs: Array<{ type: string; description: string; status: string }> = [];
  const searchQuery = deriveLeadSearchQuery(input.prompt, input.personalization);

  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false,
      args: ["--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--no-sandbox"],
      viewport: { width: 1280, height: 800 }
    });

    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(20000);

    await page.goto(safeTarget.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    executionLogs.push({
      type: "PAGE_NAVIGATION",
      description: `Opened ${input.platformName || safeTarget.hostname} at ${safeTarget.toString()}`,
      status: "COMPLETED"
    });

    // Attempt platform search only if a specific target niche/audience phrase was derived AND a search input exists
    if (searchQuery) {
      const searchSelectors = [
        "input[type='search']:visible",
        "input[placeholder*='search' i]:visible",
        "input[aria-label*='search' i]:visible",
        "input[name*='search' i]:visible",
        "input[name='q']:visible",
        "input[placeholder*='find' i]:visible"
      ];
      let searched = false;
      for (const sel of searchSelectors) {
        const box = page.locator(sel).first();
        if (await box.count().catch(() => 0) > 0) {
          await box.click({ timeout: 2500 }).catch(() => {});
          await box.fill(searchQuery, { timeout: 3000 }).catch(() => {});
          await box.press("Enter").catch(() => {});
          await page.waitForTimeout(3500);
          searched = true;
          executionLogs.push({
            type: "LEAD_SEARCH",
            description: `Searched ${input.platformName || domainKey} for "${searchQuery}"`,
            status: "COMPLETED"
          });
          break;
        }
      }
      if (!searched) {
        executionLogs.push({
          type: "LEAD_SCAN",
          description: `Scanned active ${input.platformName || domainKey} feed/directory for "${searchQuery}" leads`,
          status: "COMPLETED"
        });
      }
    }

    const extracted = await extractStructuredLeads(page, input.platformName || domainKey);
    executionLogs.push({
      type: "LEAD_EXTRACTION",
      description: `Extracted ${extracted.length} candidate lead/contact record(s) from ${input.platformName || domainKey}`,
      status: "COMPLETED"
    });

    const pageTitle = await page.title().catch(() => "");
    const pageUrl = page.url();
    const screenshotBuf = await page.screenshot({ type: "png" }).catch(() => null);
    const screenshot = screenshotBuf ? screenshotBuf.toString("base64") : undefined;

    await context.close();

    // Score & rank leads (LLM when user configured an AI key, deterministic scoring otherwise)
    let matchedLeads = extracted.map(l => {
      let score = 40;
      const reasons: string[] = [];
      if (l.email) { score += 30; reasons.push("email"); }
      if (l.phone) { score += 20; reasons.push("phone"); }
      if (l.role) { score += 10; reasons.push("role/details"); }
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
        const hay = `${l.title} ${l.role || ""} ${l.snippet || ""}`.toLowerCase();
        const hits = tokens.filter(t => hay.includes(t));
        if (hits.length > 0) {
          score = Math.min(100, score + hits.length * 10);
          reasons.push(`matches ${hits.join(", ")}`);
        }
      }
      return {
        ...l,
        matchScore: Math.min(100, score),
        matchReason: reasons.length ? reasons.join(" + ") : "Profile/contact extracted"
      };
    });

    if (extracted.length > 0 && input.aiConfig?.apiKey) {
      const aiScored = await askAiJson<{
        ranked?: Array<{ index: number; matchScore?: number; matchReason?: string; company?: string; role?: string }>;
      }>(
        "You are a B2B/B2C lead qualification engine. Score candidate leads against the user's goal and return JSON { ranked: [{ index, matchScore, matchReason, company, role }] }.",
        JSON.stringify({
          goal: input.prompt,
          searchQuery,
          platform: input.platformName || domainKey,
          candidates: extracted.slice(0, 25).map((c, idx) => ({
            index: idx,
            title: c.title,
            email: c.email,
            phone: c.phone,
            role: c.role,
            location: c.location,
            snippet: c.snippet
          }))
        }),
        input.aiConfig
      );
      if (Array.isArray(aiScored?.ranked) && aiScored.ranked.length > 0) {
        const byIdx = new Map(aiScored.ranked.map(r => [r.index, r]));
        matchedLeads = matchedLeads.map((item, idx) => {
          const hit = byIdx.get(idx);
          if (!hit) return item;
          return {
            ...item,
            matchScore: typeof hit.matchScore === "number" ? Math.max(0, Math.min(100, hit.matchScore)) : item.matchScore,
            matchReason: hit.matchReason || item.matchReason,
            company: hit.company || item.company,
            role: hit.role || item.role
          };
        });
      }
    }

    matchedLeads.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    const contactSignals = matchedLeads.filter(l => l.email || l.phone).length;
    const summary = matchedLeads.length > 0
      ? `Generated ${matchedLeads.length} lead(s) from ${input.platformName || domainKey}${searchQuery ? ` for "${searchQuery}"` : ""} (${contactSignals} with direct email/phone contact).`
      : `Inspected ${input.platformName || domainKey}${searchQuery ? ` for "${searchQuery}"` : ""}, but no public lead/contact cards were visible on the current page (sign in or navigate to a directory/search view first).`;

    return {
      summary,
      executionLogs,
      extractedRecords: matchedLeads,
      matchedLeads,
      allScrapedCount: extracted.length,
      page: {
        title: pageTitle,
        url: pageUrl,
        screenshot
      }
    };
  } finally {
    await context?.close().catch(() => undefined);
  }
}
