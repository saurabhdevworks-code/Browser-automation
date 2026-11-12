import { chromium, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeHttpUrl } from "../security/url-policy.js";
import {
  askAiJson,
  formatPersonalizationForPrompt,
  type AiRuntimeConfig,
  type PersonalizationContext
} from "../ai/groq-planner.js";
import {
  handleAutofillPersonal,
  handlePersonalFileUpload,
  type ExecutionLog,
  type ExtractedItem
} from "../executor/action-executor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  posted: string;
  skills: string;
  applyType: string;
  href: string;
  snippet: string;
  matchScore: number;
  matchReason: string;
  applyStatus:
    | "APPLIED"
    | "MATCHED"
    | "SKIPPED_LOW_MATCH"
    | "NEEDS_LOGIN"
    | "CAPTCHA_OR_VERIFICATION"
    | "EXTERNAL_PORTAL"
    | "APPLY_FORM_OPEN"
    | "FAILED";
}

export interface JobAutomationInput {
  userId?: string;
  url: string;
  requirements: string;
  preferredLocation?: string;
  autoApply?: boolean;
  maxApplyPerRun?: number;
  personalization?: PersonalizationContext;
  aiConfig?: AiRuntimeConfig | null;
}

export interface JobAutomationOutput {
  summary: string;
  matchedJobs: ScrapedJob[];
  allScrapedCount: number;
  appliedCount: number;
  extractedRecords: ExtractedItem[];
  executionLogs: ExecutionLog[];
  page: {
    title: string;
    url: string;
    screenshot?: string;
  };
}

/**
 * Checks whether the current page is gated by a CAPTCHA or anti-bot verification challenge.
 * We never attempt to bypass anti-bot challenges; we report them clearly so the user can sign in or verify manually.
 */
async function hasCaptchaOrBotGate(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const bodyText = (document.body?.innerText || "").toLowerCase();
      const gateText =
        bodyText.includes("verify you are human") ||
        bodyText.includes("i am not a robot") ||
        bodyText.includes("security verification") ||
        bodyText.includes("unusual traffic");
      const gateDom = Boolean(
        document.querySelector(
          "iframe[src*='recaptcha' i], iframe[src*='hcaptcha' i], iframe[src*='turnstile' i], [class*='g-recaptcha' i], [class*='h-captcha' i], #cf-challenge-running"
        )
      );
      return gateText || gateDom;
    })
    .catch(() => false);
}

async function detectLoginGate(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const hasPass = Boolean(document.querySelector("input[type='password']:visible"));
      const urlLower = window.location.href.toLowerCase();
      const looksLikeLoginUrl = /\/(login|signin|sign-in|nlogin|auth)\b/.test(urlLower);
      return hasPass && looksLikeLoginUrl;
    })
    .catch(() => false);
}

/**
 * Extracts structured job cards from Naukri, LinkedIn, Indeed, Internshala, Foundit, Wellfound, or generic portals.
 */
export async function extractStructuredJobs(page: Page): Promise<ScrapedJob[]> {
  // Trigger lazy loading on SPAs
  for (let s = 0; s < 2; s++) {
    await page
      .evaluate(() => window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: "smooth" }))
      .catch(() => {});
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  const rawCards = await page
    .evaluate(() => {
      const cardSelectors = [
        ".srp-jobtuple-wrapper",
        ".cust-job-tuple",
        "article.jobTuple",
        ".jobTuple",
        ".jobs-search-results__list-item",
        ".job-card-container",
        ".job_seen_beacon",
        ".individual_internship",
        "[data-job-id]",
        "[data-testid*='job' i]",
        "[class*='job-card' i]",
        "[class*='jobCard' i]",
        "[class*='job_card' i]",
        "[class*='job-tuple' i]",
        "article"
      ];

      const collected: Array<{
        title: string;
        company: string;
        location: string;
        experience: string;
        salary: string;
        posted: string;
        skills: string;
        applyType: string;
        href: string;
        snippet: string;
      }> = [];
      const seenLinks = new Set<string>();

      const pickText = (root: Element, sels: string[]): string => {
        for (const s of sels) {
          const el = root.querySelector(s);
          const txt = el?.textContent?.trim().replace(/\s+/g, " ");
          if (txt && txt.length >= 2) return txt.slice(0, 140);
        }
        return "";
      };

      const cards = new Set<Element>();
      for (const sel of cardSelectors) {
        document.querySelectorAll(sel).forEach(el => cards.add(el));
      }

      for (const card of cards) {
        const titleLink =
          (card.querySelector("a.title, a[class*='title' i], h2 a, h3 a, a[href*='job' i], a[href*='career' i], a[href]") as HTMLAnchorElement | null);
        const href = titleLink?.href && titleLink.href.startsWith("http") ? titleLink.href : "";
        const titleText =
          pickText(card, ["a.title", "h2", "h3", "[class*='jobTitle' i]", "[class*='job-title' i]", "[class*='designation' i]", "[class*='title' i]"]) ||
          titleLink?.textContent?.trim().replace(/\s+/g, " ").slice(0, 140) ||
          "";

        if (!titleText || titleText.length < 3 || !href) continue;
        if (/^(login|register|sign in|sign up|about|contact|privacy|terms|jobs|home)$/i.test(titleText)) continue;

        const key = href.split("?")[0].toLowerCase();
        if (seenLinks.has(key)) continue;

        const fullCardText = (card.textContent || "").replace(/\s+/g, " ").trim();
        // Skip mega wrapper containers (> 1400 chars unless dedicated tuple)
        if (fullCardText.length > 1400 && !card.matches(".srp-jobtuple-wrapper, .cust-job-tuple, .jobTuple, .job_seen_beacon")) {
          continue;
        }

        const company = pickText(card, [
          ".comp-name",
          "a[class*='comp' i]",
          "[class*='company' i]",
          "[class*='employer' i]",
          "[data-testid*='company' i]"
        ]);
        const location = pickText(card, [
          ".locWdth",
          ".loc",
          "[class*='location' i]",
          "[class*='loc' i]",
          "[data-testid*='location' i]"
        ]);
        const experience = pickText(card, [
          ".expwdth",
          ".exp",
          "[class*='experience' i]",
          "[class*='exp' i]"
        ]);
        const salary = pickText(card, [
          ".sal",
          "[class*='salary' i]",
          "[class*='ctc' i]",
          "[class*='pay' i]"
        ]);
        const posted = pickText(card, [
          ".job-post-day",
          "[class*='posted' i]",
          "[class*='date' i]",
          "time"
        ]);
        const skills = Array.from(card.querySelectorAll(".dot-gt, [class*='skill' i], [class*='tag' i]"))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .slice(0, 8)
          .join(", ");

        const lowerCard = fullCardText.toLowerCase();
        const applyType = lowerCard.includes("easy apply")
          ? "Easy Apply"
          : lowerCard.includes("company site") || lowerCard.includes("external")
            ? "External"
            : "Portal Apply";

        seenLinks.add(key);
        collected.push({
          title: titleText,
          company: company || "Company Listed",
          location: location || "Not specified",
          experience: experience || "Not specified",
          salary: salary || "Not disclosed",
          posted: posted || "Recent",
          skills,
          applyType,
          href,
          snippet: fullCardText.slice(0, 280)
        });
        if (collected.length >= 45) break;
      }

      // Secondary fallback: job-like anchors if no semantic cards matched
      if (collected.length === 0) {
        document.querySelectorAll("a[href]").forEach(node => {
          if (collected.length >= 35) return;
          const a = node as HTMLAnchorElement;
          const href = a.href || "";
          const text = (a.textContent || "").trim().replace(/\s+/g, " ");
          if (!href.startsWith("http") || text.length < 5 || text.length > 140) return;
          if (!/(job|jobs|career|opening|vacancy|position|internship|jd|viewJob|apply)/i.test(href + " " + text)) return;
          const key = href.split("?")[0].toLowerCase();
          if (seenLinks.has(key)) return;
          seenLinks.add(key);
          collected.push({
            title: text,
            company: "Company Listed",
            location: "Not specified",
            experience: "Not specified",
            salary: "Not disclosed",
            posted: "Recent",
            skills: "",
            applyType: "Portal Apply",
            href,
            snippet: (a.closest("div, li, article")?.textContent || text).replace(/\s+/g, " ").trim().slice(0, 280)
          });
        });
      }

      return collected;
    })
    .catch(() => []);

  return rawCards.map(c => ({
    ...c,
    matchScore: 0,
    matchReason: "",
    applyStatus: "MATCHED"
  }));
}

function buildSearchKeywords(requirements: string, personalization?: PersonalizationContext): { query: string; location: string } {
  const reqClean = requirements
    .replace(/\b(daily|at|every|day|scrap|scrape|jobs?|requirements?|then|apply|them|find|search|looking\s+for|based\s+on|matching)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Pick concise role/skills phrase from requirements (or resume/customText if requirements is broad)
  let query = reqClean.slice(0, 90).trim();
  if (!query || query.length < 3) {
    query = (personalization?.customText || "Software Developer").split(/\r?\n/)[0].slice(0, 80).trim();
  }
  const location = (personalization?.location || "").trim();
  return { query: query || "Developer", location };
}

/**
 * Observes visible search/location inputs on the portal page, fills requirements & submits search.
 */
async function searchJobsOnPortal(
  page: Page,
  requirements: string,
  preferredLocation: string | undefined,
  personalization: PersonalizationContext | undefined,
  logs: ExecutionLog[]
): Promise<void> {
  const start = Date.now();
  const { query, location: fallbackLoc } = buildSearchKeywords(requirements, personalization);
  const targetLocation = (preferredLocation || fallbackLoc || "").trim();

  // If portal supports Naukri/Indeed search inputs directly, locate both keyword and location inputs
  const inputsInfo = await page
    .locator("input:visible")
    .evaluateAll(els =>
      els.map((node, idx) => {
        const el = node as HTMLInputElement;
        const type = (el.type || "text").toLowerCase();
        if (["hidden", "password", "file", "checkbox", "radio", "submit", "button"].includes(type)) return null;
        const hint = `${el.placeholder || ""} ${el.getAttribute("aria-label") || ""} ${el.name || ""} ${el.id || ""} ${el.className || ""}`.toLowerCase();
        return { idx, hint, value: el.value || "" };
      }).filter((x): x is { idx: number; hint: string; value: string } => x !== null)
    )
    .catch(() => []);

  const keywordField =
    inputsInfo.find(i => /(skill|designat|compan|keyword|job|title|what|search|q\b|role)/i.test(i.hint) && !/location|city|where/i.test(i.hint)) ||
    inputsInfo[0];
  const locationField = inputsInfo.find(i => /(location|city|where|place|region)/i.test(i.hint));

  let searched = false;
  const visibleInputs = page.locator("input:visible");

  if (keywordField) {
    try {
      const kwInput = visibleInputs.nth(keywordField.idx);
      await kwInput.click({ timeout: 4000 }).catch(() => {});
      await kwInput.fill(query, { timeout: 4000 });
      searched = true;
    } catch {}
  }

  if (locationField && targetLocation) {
    try {
      const locInput = visibleInputs.nth(locationField.idx);
      await locInput.click({ timeout: 3000 }).catch(() => {});
      await locInput.fill(targetLocation, { timeout: 3000 });
    } catch {}
  }

  if (searched) {
    // Try clicking explicit Search button first, fallback to Enter
    const searchBtn = page
      .locator("button:has-text('Search'), input[type='submit'], button[type='submit'], [class*='qsbSubmit' i]")
      .first();
    if ((await searchBtn.count().catch(() => 0)) > 0) {
      await searchBtn.click({ timeout: 4000 }).catch(async () => {
        await page.keyboard.press("Enter").catch(() => {});
      });
    } else {
      await page.keyboard.press("Enter").catch(() => {});
    }
    await page.waitForTimeout(4000);
  }

  logs.push({
    stepIndex: logs.length + 1,
    type: "JOB_SEARCH",
    description: searched
      ? `Searched portal for "${query}"${targetLocation ? ` in "${targetLocation}"` : ""}`
      : "Inspected landing/jobs feed directly (no separate search bar needed)",
    status: "COMPLETED",
    durationMs: Date.now() - start
  });
}

function deterministicScoreJob(job: ScrapedJob, requirements: string, preferredLocation?: string): ScrapedJob {
  const haystack = `${job.title} ${job.company} ${job.location} ${job.experience} ${job.skills} ${job.snippet}`.toLowerCase();
  const stopWords = new Set(["with", "and", "the", "for", "from", "that", "this", "jobs", "job", "role", "skills", "looking", "requirements", "experience", "years", "apply", "daily", "remote"]);
  const tokens = requirements
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(t => t.length >= 2 && !stopWords.has(t));
  const uniqueTokens = Array.from(new Set(tokens));

  const matchedTokens = uniqueTokens.filter(t => haystack.includes(t));
  let score = uniqueTokens.length > 0 ? Math.round((matchedTokens.length / uniqueTokens.length) * 80) : 65;

  if (preferredLocation && preferredLocation.trim()) {
    const locTokens = preferredLocation.toLowerCase().split(/[,/\s]+/).filter(x => x.length >= 3);
    if (locTokens.some(lt => haystack.includes(lt))) {
      score += 20;
    }
  } else {
    score += 15;
  }

  score = Math.min(100, Math.max(20, score));
  const reason = matchedTokens.length > 0
    ? `Matched keywords: ${matchedTokens.slice(0, 6).join(", ")}`
    : "General listing match";

  return {
    ...job,
    matchScore: score,
    matchReason: reason,
    applyStatus: score >= 45 ? "MATCHED" : "SKIPPED_LOW_MATCH"
  };
}

/**
 * Scores & filters scraped jobs against user's requirements and Personalization profile (using AI JSON or deterministic matcher).
 */
async function matchAndRankJobs(
  jobs: ScrapedJob[],
  requirements: string,
  preferredLocation: string | undefined,
  personalization: PersonalizationContext | undefined,
  aiConfig: AiRuntimeConfig | null | undefined,
  logs: ExecutionLog[]
): Promise<ScrapedJob[]> {
  if (jobs.length === 0) return [];
  const start = Date.now();
  const personalSummary = formatPersonalizationForPrompt(personalization).slice(0, 3000);

  const compactJobs = jobs.slice(0, 30).map((j, idx) => ({
    index: idx,
    title: j.title,
    company: j.company,
    location: j.location,
    experience: j.experience,
    salary: j.salary,
    skills: j.skills,
    snippet: j.snippet.slice(0, 180)
  }));

  const aiMatches = await askAiJson<{
    matches?: Array<{ index: number; matchScore: number; isMatch: boolean; reason: string }>;
  }>(
    `You evaluate scraped job listings against a candidate's job requirements and resume/profile.
Return ONLY valid JSON:
{
  "matches": [
    { "index": 0, "matchScore": 88, "isMatch": true, "reason": "Short reason" }
  ]
}
Score every job index provided (0..N-1). Set isMatch=true only if the job genuinely fits the candidate's target role, skills, and location/experience requirements (score >= 55).`,
    `Candidate Requirements: ${requirements}
Preferred Location: ${preferredLocation || personalization?.location || "Any"}
${personalSummary ? `\nCandidate Profile / Resume:\n${personalSummary}` : ""}

Scraped Jobs:
${JSON.stringify(compactJobs)}`,
    aiConfig
  );

  let scored: ScrapedJob[];
  if (aiMatches?.matches && Array.isArray(aiMatches.matches) && aiMatches.matches.length > 0) {
    const mapByIdx = new Map(aiMatches.matches.map(m => [m.index, m]));
    scored = jobs.map((job, idx) => {
      const m = mapByIdx.get(idx);
      if (!m) return deterministicScoreJob(job, requirements, preferredLocation);
      const score = Math.min(100, Math.max(0, Math.round(Number(m.matchScore) || 0)));
      return {
        ...job,
        matchScore: score,
        matchReason: (m.reason || "Evaluated against requirements").slice(0, 160),
        applyStatus: m.isMatch || score >= 55 ? "MATCHED" : "SKIPPED_LOW_MATCH"
      };
    });
  } else {
    scored = jobs.map(j => deterministicScoreJob(j, requirements, preferredLocation));
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const matchedOnly = scored.filter(j => j.applyStatus === "MATCHED");
  const finalList = matchedOnly.length > 0 ? matchedOnly : scored.slice(0, Math.min(8, scored.length));

  logs.push({
    stepIndex: logs.length + 1,
    type: "REQUIREMENT_MATCHING",
    description: `Evaluated ${jobs.length} scraped jobs -> ${matchedOnly.length} strong matches found`,
    status: "COMPLETED",
    durationMs: Date.now() - start
  });

  return finalList;
}

/**
 * Visits top matched job links inside the user's authenticated profile and attempts safe application submission.
 */
async function applyToMatchedJobs(
  context: BrowserContext,
  jobs: ScrapedJob[],
  personalization: PersonalizationContext | undefined,
  maxApply: number,
  logs: ExecutionLog[]
): Promise<number> {
  let appliedCount = 0;
  const targets = jobs.filter(j => j.href && j.applyStatus === "MATCHED").slice(0, Math.max(1, maxApply));

  for (const job of targets) {
    const start = Date.now();
    const jobPage = await context.newPage();
    jobPage.setDefaultTimeout(15000);
    try {
      await assertSafeHttpUrl(job.href);
      await jobPage.goto(job.href, { waitUntil: "domcontentloaded", timeout: 25000 });
      await jobPage.waitForTimeout(2500);

      if (await hasCaptchaOrBotGate(jobPage)) {
        job.applyStatus = "CAPTCHA_OR_VERIFICATION";
        logs.push({
          stepIndex: logs.length + 1,
          type: "APPLY_BLOCKED",
          description: `Stopped on CAPTCHA / human verification for "${job.title}"`,
          status: "SKIPPED",
          durationMs: Date.now() - start
        });
        continue;
      }

      if (await detectLoginGate(jobPage)) {
        job.applyStatus = "NEEDS_LOGIN";
        logs.push({
          stepIndex: logs.length + 1,
          type: "APPLY_BLOCKED",
          description: `Login required on portal before applying to "${job.title}"`,
          status: "SKIPPED",
          durationMs: Date.now() - start
        });
        continue;
      }

      // Check if already applied
      const alreadyApplied = await jobPage
        .evaluate(() => /already\s+applied|\bapplied\b/i.test((document.querySelector("button, [class*='apply' i]")?.textContent || "")))
        .catch(() => false);
      if (alreadyApplied) {
        job.applyStatus = "APPLIED";
        appliedCount++;
        logs.push({
          stepIndex: logs.length + 1,
          type: "JOB_APPLY",
          description: `Already applied to "${job.title}" (${job.company})`,
          status: "COMPLETED",
          durationMs: Date.now() - start
        });
        continue;
      }

      const applyBtnSelectors = [
        "button:has-text('Easy Apply')",
        "button:has-text('Apply Now')",
        "button:has-text('Apply')",
        "a:has-text('Apply Now')",
        "[id*='apply-button' i]",
        "[class*='apply-button' i]"
      ];

      let clickedApply = false;
      for (const sel of applyBtnSelectors) {
        const btn = jobPage.locator(sel).first();
        if ((await btn.count().catch(() => 0)) > 0) {
          const btnText = ((await btn.textContent().catch(() => "")) || "").toLowerCase();
          if (btnText.includes("company site") || btnText.includes("external")) {
            job.applyStatus = "EXTERNAL_PORTAL";
            logs.push({
              stepIndex: logs.length + 1,
              type: "JOB_APPLY",
              description: `"${job.title}" redirects to external company portal; saved link for manual review`,
              status: "SKIPPED",
              durationMs: Date.now() - start
            });
            break;
          }
          await btn.click({ timeout: 5000 }).catch(() => {});
          clickedApply = true;
          break;
        }
      }

      if (job.applyStatus === "EXTERNAL_PORTAL") continue;

      if (!clickedApply) {
        job.applyStatus = "APPLY_FORM_OPEN";
        logs.push({
          stepIndex: logs.length + 1,
          type: "JOB_APPLY",
          description: `No direct Apply button found for "${job.title}" — kept in matched report`,
          status: "SKIPPED",
          durationMs: Date.now() - start
        });
        continue;
      }

      await jobPage.waitForTimeout(2000);

      // Fill any application modal/form inputs with Personalization + Resume if visible
      await handleAutofillPersonal(jobPage, personalization).catch(() => 0);
      if ((personalization?.files?.length || 0) > 0) {
        await handlePersonalFileUpload(jobPage, "input[type='file']", undefined, personalization).catch(() => "");
      }

      // Click submit / confirm apply if an application dialog opened
      const submitBtn = jobPage
        .locator("button:has-text('Submit Application'), button:has-text('Submit'), button:has-text('Save and Continue'), button:has-text('Confirm')")
        .first();
      let submitClicked = false;
      if ((await submitBtn.count().catch(() => 0)) > 0) {
        await submitBtn.click({ timeout: 4000 }).catch(() => {});
        submitClicked = true;
        await jobPage.waitForTimeout(1800);
      }

      const confirmed = await jobPage
        .evaluate(() => /(application\s+submitted|successfully\s+applied|already\s+applied|applied\s+on)/i.test(document.body?.innerText || ""))
        .catch(() => false);

      if (confirmed || submitClicked) {
        job.applyStatus = "APPLIED";
        appliedCount++;
        logs.push({
          stepIndex: logs.length + 1,
          type: "JOB_APPLY",
          description: `${confirmed ? "Confirmed applied" : "Submitted apply flow"} for "${job.title}" at ${job.company}`,
          status: "COMPLETED",
          durationMs: Date.now() - start
        });
      } else {
        job.applyStatus = "APPLY_FORM_OPEN";
        logs.push({
          stepIndex: logs.length + 1,
          type: "JOB_APPLY",
          description: `Opened apply flow for "${job.title}" (${job.company}) — extra portal steps/questions may remain`,
          status: "SKIPPED",
          durationMs: Date.now() - start
        });
      }
    } catch (err) {
      job.applyStatus = "FAILED";
      logs.push({
        stepIndex: logs.length + 1,
        type: "JOB_APPLY",
        description: `Apply attempt failed for "${job.title}": ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "FAILED",
        durationMs: Date.now() - start
      });
    } finally {
      await jobPage.close().catch(() => {});
    }
  }

  return appliedCount;
}

/**
 * Full pipeline: Search job portal -> Scrape structured job cards -> Match requirements -> Optionally Auto-Apply.
 */
export async function runJobScrapeAndApply(input: JobAutomationInput): Promise<JobAutomationOutput> {
  const baseTarget = await assertSafeHttpUrl(input.url);
  const domainKey = baseTarget.hostname.replace(/^www\./, "").split(".")[0];
  const safeUser = (input.userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const profileDir = path.join(__dirname, `../../profiles/${safeUser}/${domainKey}`);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const logs: ExecutionLog[] = [];
  let context: BrowserContext | undefined;

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false,
      args: ["--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--no-sandbox"],
      viewport: { width: 1280, height: 800 }
    });

    const page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(20000);
    await page.goto(baseTarget.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    logs.push({
      stepIndex: 1,
      type: "NAVIGATE",
      description: `Opened ${baseTarget.hostname} using saved Chrome session`,
      status: "COMPLETED",
      durationMs: 3000
    });

    if (await hasCaptchaOrBotGate(page)) {
      const shot = await page.screenshot({ type: "jpeg", quality: 55 }).catch(() => null);
      return {
        summary: `Paused on ${baseTarget.hostname}: CAPTCHA / human verification detected. Complete verification manually in Chrome and retry.`,
        matchedJobs: [],
        allScrapedCount: 0,
        appliedCount: 0,
        extractedRecords: [],
        executionLogs: logs,
        page: {
          title: await page.title().catch(() => baseTarget.hostname),
          url: page.url(),
          screenshot: shot ? `data:image/jpeg;base64,${shot.toString("base64")}` : undefined
        }
      };
    }

    await searchJobsOnPortal(page, input.requirements, input.preferredLocation, input.personalization, logs);

    const scrapeStart = Date.now();
    const rawJobs = await extractStructuredJobs(page);
    logs.push({
      stepIndex: logs.length + 1,
      type: "JOB_SCRAPE",
      description: `Extracted ${rawJobs.length} structured job listing(s) from ${page.url()}`,
      status: rawJobs.length > 0 ? "COMPLETED" : "SKIPPED",
      durationMs: Date.now() - scrapeStart
    });

    const matchedJobs = await matchAndRankJobs(
      rawJobs,
      input.requirements,
      input.preferredLocation,
      input.personalization,
      input.aiConfig,
      logs
    );

    let appliedCount = 0;
    if (input.autoApply && matchedJobs.length > 0) {
      appliedCount = await applyToMatchedJobs(
        context,
        matchedJobs,
        input.personalization,
        input.maxApplyPerRun ?? 5,
        logs
      );
    }

    const finalTitle = await page.title().catch(() => baseTarget.hostname);
    const finalUrl = page.url();
    const screenshotBuf = await page.screenshot({ type: "jpeg", quality: 55 }).catch(() => null);

    const extractedRecords: ExtractedItem[] = matchedJobs.map(j => ({
      title: `${j.title} — ${j.company} (${j.location} | ${j.experience} | Match ${j.matchScore}% | ${j.applyStatus})`,
      href: j.href,
      category: "Job",
      snippet: `${j.salary} • ${j.matchReason}`.slice(0, 180)
    }));

    const summary =
      rawJobs.length === 0
        ? `Visited ${baseTarget.hostname}, but no public job cards loaded (ensure you are logged in via Connected Platforms and search inputs are visible).`
        : input.autoApply
          ? `Scraped ${rawJobs.length} jobs from ${baseTarget.hostname}, matched ${matchedJobs.length} to your requirements, and ran apply workflow on ${appliedCount} job(s).`
          : `Scraped ${rawJobs.length} jobs from ${baseTarget.hostname} and matched ${matchedJobs.length} job(s) to your requirements.`;

    return {
      summary,
      matchedJobs,
      allScrapedCount: rawJobs.length,
      appliedCount,
      extractedRecords,
      executionLogs: logs,
      page: {
        title: finalTitle,
        url: finalUrl,
        screenshot: screenshotBuf ? `data:image/jpeg;base64,${screenshotBuf.toString("base64")}` : undefined
      }
    };
  } finally {
    await context?.close().catch(() => undefined);
  }
}
