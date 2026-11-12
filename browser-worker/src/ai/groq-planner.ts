import fs from "fs";
import path from "path";

export interface PersonalFileContext {
  id?: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
  localPath?: string;
  extractedText?: string;
}

export interface PersonalizationContext {
  enabled?: boolean;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  customText?: string;
  summaryText?: string;
  files?: PersonalFileContext[];
}

export interface ActionStep {
  type: "navigate" | "fill" | "click" | "press" | "wait" | "scroll" | "extract" | "auto_login" | "upload" | "autofill_personal";
  selector?: string;
  value?: string;
  key?: string;
  url?: string;
  milliseconds?: number;
  description: string;
}

export interface PlanResult {
  engine: "groq-llm" | "gemini-llm" | "openai-llm" | "claude-llm" | "heuristic-engine";
  explanation: string;
  actions: ActionStep[];
}

export interface AiRuntimeConfig {
  provider: "gemini" | "openai" | "claude" | "groq";
  apiKey: string;
  model: string;
}

const CONFIG_FILE = path.join(process.cwd(), ".ai-config.json");
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEPRECATED_GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
]);

function normalizeGroqModel(model?: string): string {
  const cleaned = model?.trim();
  if (!cleaned || DEPRECATED_GROQ_MODELS.has(cleaned)) {
    return DEFAULT_GROQ_MODEL;
  }
  return cleaned;
}

function persistRuntimeConfig(config: AiRuntimeConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch {}
}

async function discoverActiveGroqModel(apiKey: string, mutateGlobal = true): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const ids: string[] = (Array.isArray(payload?.data) ? payload.data : [])
      .map((m: any) => String(m?.id || ""))
      .filter((id: string) => id && !/whisper|orpheus|prompt-guard|safeguard|tts/i.test(id));
    if (!ids.length) return null;

    const preferred = [
      DEFAULT_GROQ_MODEL,
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "allam-2-7b"
    ];
    const chosen = preferred.find(p => ids.includes(p)) || ids[0];
    if (mutateGlobal && activeConfig && activeConfig.provider === "groq") {
      activeConfig = { ...activeConfig, model: chosen };
      persistRuntimeConfig(activeConfig);
    }
    return chosen;
  } catch {
    return null;
  }
}

function loadPersistedConfig(): AiRuntimeConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey) {
        if (parsed.provider === "groq") {
          const normalized = normalizeGroqModel(parsed.model);
          if (normalized !== parsed.model) {
            parsed.model = normalized;
            persistRuntimeConfig(parsed);
          }
        }
        return parsed;
      }
    }
  } catch {}
  return null;
}

let activeConfig: AiRuntimeConfig | null = loadPersistedConfig();
if (activeConfig?.apiKey) {
  if (activeConfig.provider === "groq") process.env.GROQ_API_KEY = activeConfig.apiKey;
  if (activeConfig.provider === "gemini") process.env.GEMINI_API_KEY = activeConfig.apiKey;
  if (activeConfig.provider === "openai") process.env.OPENAI_API_KEY = activeConfig.apiKey;
  if (activeConfig.provider === "claude") process.env.ANTHROPIC_API_KEY = activeConfig.apiKey;
}

let lastAiError: string | null = null;

function formatAiErrorShort(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || "Unknown AI error");
  if (/401|invalid_api_key|invalid api key/i.test(msg)) return "Invalid API Key (401)";
  if (/429|rate[_\s-]?limit|quota/i.test(msg)) return "Rate limit / quota exceeded (429)";
  if (/403|permission|forbidden/i.test(msg)) return "API key forbidden (403)";
  if (/404|model[_\s-]?not[_\s-]?found|does not exist/i.test(msg)) return "Model not found (404)";
  return msg.replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Resolves the AI config for a request.
 * When `override` is explicitly provided (even `null`, meaning the user has no personal key configured),
 * never fall back to the shared process-wide `activeConfig` so keys never leak across user accounts.
 */
function resolveEffectiveAiConfig(override?: AiRuntimeConfig | null): AiRuntimeConfig | null {
  if (override !== undefined) {
    if (!override || !override.apiKey || !override.apiKey.trim()) {
      return null;
    }
    const provider = (["gemini", "openai", "claude", "groq"].includes(override.provider) ? override.provider : "gemini") as AiRuntimeConfig["provider"];
    return {
      provider,
      apiKey: override.apiKey.trim(),
      model: provider === "groq" ? normalizeGroqModel(override.model) : (override.model || "")
    };
  }
  if (activeConfig?.apiKey) {
    return activeConfig;
  }
  const envKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY || "";
  if (!envKey) return null;
  const envProvider = (process.env.GEMINI_API_KEY ? "gemini" : (process.env.OPENAI_API_KEY ? "openai" : (process.env.ANTHROPIC_API_KEY ? "claude" : "groq"))) as AiRuntimeConfig["provider"];
  return {
    provider: envProvider,
    apiKey: envKey,
    model: envProvider === "gemini" ? "gemini-1.5-flash" : (envProvider === "openai" ? "gpt-4o-mini" : (envProvider === "claude" ? "claude-3-5-sonnet-20241022" : DEFAULT_GROQ_MODEL))
  };
}

export function setRuntimeAiConfig(config: AiRuntimeConfig | null): void {
  const normalizedConfig = config
    ? {
        ...config,
        model: config.provider === "groq" ? normalizeGroqModel(config.model) : config.model
      }
    : null;
  activeConfig = normalizedConfig;
  lastAiError = null;
  try {
    if (normalizedConfig && normalizedConfig.apiKey) {
      persistRuntimeConfig(normalizedConfig);
    } else if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch {}
  if (config?.apiKey) {
    if (config.provider === "groq") process.env.GROQ_API_KEY = config.apiKey;
    if (config.provider === "gemini") process.env.GEMINI_API_KEY = config.apiKey;
    if (config.provider === "openai") process.env.OPENAI_API_KEY = config.apiKey;
    if (config.provider === "claude") process.env.ANTHROPIC_API_KEY = config.apiKey;
  } else {
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  }
}

export function getRuntimeAiConfig(): { provider: string; model: string; isConfigured: boolean; maskedKey?: string; lastError?: string } {
  const currentKey = activeConfig?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY;
  const currentProvider = activeConfig?.provider || (process.env.GEMINI_API_KEY ? "gemini" : (process.env.OPENAI_API_KEY ? "openai" : (process.env.ANTHROPIC_API_KEY ? "claude" : "gemini")));
  const currentModel = currentProvider === "groq"
    ? normalizeGroqModel(activeConfig?.model)
    : (activeConfig?.model || (currentProvider === "gemini" ? "gemini-1.5-flash" : (currentProvider === "openai" ? "gpt-4o-mini" : "claude-3-5-sonnet-20241022")));

  return {
    provider: currentProvider,
    model: currentModel,
    isConfigured: Boolean(currentKey),
    maskedKey: currentKey ? `${currentKey.slice(0, 4)}...${currentKey.slice(-4)}` : undefined,
    lastError: lastAiError || undefined
  };
}

export function hasPersonalizationData(p?: PersonalizationContext): boolean {
  if (!p || p.enabled === false) return false;
  return Boolean(
    p.fullName?.trim() ||
    p.email?.trim() ||
    p.phone?.trim() ||
    p.location?.trim() ||
    p.customText?.trim() ||
    p.summaryText?.trim() ||
    (p.files && p.files.length > 0)
  );
}

export function formatPersonalizationForPrompt(p?: PersonalizationContext): string {
  if (!p || p.enabled === false) return "";
  if (p.summaryText?.trim()) {
    const fileNames = (p.files || []).map(f => f.fileName).filter(Boolean);
    const filesHeader = fileNames.length > 0 ? `\nAvailable Uploaded Files (for 'upload' action): ${fileNames.join(", ")}` : "";
    return `${p.summaryText.trim()}${filesHeader}`.slice(0, 12000);
  }
  const lines: string[] = [];
  if (p.fullName?.trim()) lines.push(`Full Name: ${p.fullName.trim()}`);
  if (p.email?.trim()) lines.push(`Email: ${p.email.trim()}`);
  if (p.phone?.trim()) lines.push(`Phone: ${p.phone.trim()}`);
  if (p.location?.trim()) lines.push(`Location/Address: ${p.location.trim()}`);
  if (p.customText?.trim()) lines.push(`Personal Details / Notes:\n${p.customText.trim()}`);
  for (const f of p.files || []) {
    lines.push(`\n--- Uploaded File: ${f.fileName} ---`);
    if (f.extractedText?.trim()) {
      lines.push(f.extractedText.trim().slice(0, 4000));
    }
  }
  return lines.join("\n").trim().slice(0, 12000);
}

export interface ConversationHistoryItem {
  role: "user" | "assistant";
  content: string;
  targetName?: string;
  extractedSummary?: string;
}

interface BoundedTurn {
  role: "user" | "assistant";
  content: string;
  rawExtractedSummary?: string;
}

export function buildBoundedHistory(
  history?: ConversationHistoryItem[],
  maxTurns = 16,
  maxTotalChars = 12000
): BoundedTurn[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  const slice = history.slice(-maxTurns);
  const out: BoundedTurn[] = [];
  let usedChars = 0;
  // Iterate newest-first so most recent conversation context always survives budget
  for (let i = slice.length - 1; i >= 0; i--) {
    const item = slice[i];
    if (!item || (item.role !== "user" && item.role !== "assistant")) continue;
    const targetTag = item.targetName?.trim() ? `[@${item.targetName.trim()}] ` : "";
    const baseText = (item.content || "").trim().slice(0, 2500);
    const extracted = (item.extractedSummary || "").trim().slice(0, 2000);
    let full = `${targetTag}${baseText}`.trim();
    if (extracted) {
      full = `${full}\n[Extracted data in this turn:\n${extracted}]`.trim();
    }
    if (!full) continue;
    if (usedChars + full.length > maxTotalChars && out.length >= 2) break;
    usedChars += full.length;
    out.unshift({ role: item.role, content: full, rawExtractedSummary: extracted || undefined });
  }
  return out;
}

interface PlanInput {
  task: string;
  url: string;
  currentTitle?: string;
  credentials?: { username?: string; password?: string };
  personalization?: PersonalizationContext;
  history?: ConversationHistoryItem[];
  aiConfig?: AiRuntimeConfig | null;
}

/**
 * Plans actions using configured LLM (Gemini, OpenAI, Claude, or Groq) or falls back to Heuristic Intent Engine.
 */
export async function planActions(input: PlanInput): Promise<PlanResult> {
  const config = resolveEffectiveAiConfig(input.aiConfig);

  if (config?.apiKey) {
    try {
      if (config.provider === "gemini") {
        const geminiPlan = await callGeminiPlanner(config.apiKey, config.model || "gemini-1.5-flash", input);
        if (geminiPlan?.actions?.length) {
          return {
            engine: "gemini-llm",
            explanation: geminiPlan.explanation || "Gemini AI automation plan",
            actions: geminiPlan.actions
          };
        }
      } else if (config.provider === "openai") {
        const openaiPlan = await callOpenAiPlanner(config.apiKey, config.model || "gpt-4o-mini", input);
        if (openaiPlan?.actions?.length) {
          return {
            engine: "openai-llm",
            explanation: openaiPlan.explanation || "OpenAI automation plan",
            actions: openaiPlan.actions
          };
        }
      } else if (config.provider === "claude") {
        const claudePlan = await callClaudePlanner(config.apiKey, config.model || "claude-3-5-sonnet-20241022", input);
        if (claudePlan?.actions?.length) {
          return {
            engine: "claude-llm",
            explanation: claudePlan.explanation || "Claude AI automation plan",
            actions: claudePlan.actions
          };
        }
      } else {
        const groqPlan = await callGroqPlanner(config.apiKey, normalizeGroqModel(config.model), input, input.aiConfig === undefined);
        if (groqPlan?.actions?.length) {
          return {
            engine: "groq-llm",
            explanation: groqPlan.explanation || "Groq AI automation plan",
            actions: groqPlan.actions
          };
        }
      }
    } catch (err) {
      lastAiError = formatAiErrorShort(err);
      console.warn(`[AiPlanner] ${config.provider} API call failed, falling back to heuristic engine:`, err);
    }
  }

  return planActionsHeuristic(input);
}

const SYSTEM_PROMPT = `You are Navio, an Autonomous AI Browser Automation Agent.
Your job is to convert natural language instructions (English, Hindi, or Hinglish, e.g. "LinkedIn pe 10 Java jobs apply karo", "Canva me search karo banner designs", "Fill this form using my personal details", "Upload my resume") into concrete browser steps.

Available action types:
- "navigate": { "type": "navigate", "url": "https://...", "description": "Navigate to URL" }
- "fill": { "type": "fill", "selector": "CSS selector or text selector", "value": "text to type", "description": "Type text into input" }
- "autofill_personal": { "type": "autofill_personal", "description": "Detect visible personal form inputs (name, email, phone, location, summary/bio, custom fields) and fill them using saved Personalization data" }
- "upload": { "type": "upload", "selector": "input[type='file']", "value": "optional file name", "description": "Upload a saved file from Personalization settings into file input" }
- "click": { "type": "click", "selector": "CSS selector or button text", "description": "Click submit button" }
- "press": { "type": "press", "key": "Enter", "description": "Press Enter key" }
- "wait": { "type": "wait", "milliseconds": 3000, "description": "Wait for results to hydrate" }
- "scroll": { "type": "scroll", "description": "Scroll page to load lazy items" }
- "auto_login": { "type": "auto_login", "description": "Detect login form and auto-fill credentials" }
- "extract": { "type": "extract", "selector": "CSS selector", "description": "Extract structured data items, images, and links to CSV" }

If Personalization data is provided AND the task involves filling forms, entering personal info, writing a profile/bio/message, or uploading a resume/file, use it accurately via "autofill_personal", "upload", or exact "fill" values. Otherwise ignore personal data (e.g. never put personal details into a normal product/design search query).

Return a valid JSON object ONLY:
{
  "explanation": "Brief explanation of plan in 1 sentence",
  "actions": [
    ... action objects ...
  ]
}`;

function buildPlannerUserPrompt(input: PlanInput): string {
  const personalBlock = formatPersonalizationForPrompt(input.personalization);
  const turns = buildBoundedHistory(input.history, 8, 5000);
  let prompt = `Target Site: ${input.url}\nTask: ${input.task}\nHas Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}`;
  if (turns.length > 0) {
    const chatTranscript = turns.map(t => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`).join("\n");
    prompt += `\n\nCurrent Conversation Context Window (use for follow-up references in this chat):\n${chatTranscript}`;
  }
  if (personalBlock) {
    prompt += `\n\nSaved Personalization Data (use ONLY if the task needs personal information or uploaded files):\n${personalBlock}`;
  }
  return prompt;
}

async function callGeminiPlanner(apiKey: string, model: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = `${SYSTEM_PROMPT}\n\n${buildPlannerUserPrompt(input)}\nRespond with ONLY valid JSON:`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text);
}

async function callOpenAiPlanner(apiKey: string, model: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = buildPlannerUserPrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return JSON.parse(content);
}

async function callClaudePlanner(apiKey: string, model: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = `${SYSTEM_PROMPT}\n\n${buildPlannerUserPrompt(input)}\nRespond with ONLY valid JSON:`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Claude");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : text);
}

async function callGroqPlanner(apiKey: string, model: string, input: PlanInput, mutateGlobal = true): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = buildPlannerUserPrompt(input);
  const sendRequest = (targetModel: string) =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      })
    });

  let selectedModel = normalizeGroqModel(model);
  let response = await sendRequest(selectedModel);

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404 || /model_not_found|does not exist/i.test(errorText)) {
      const fallbackModel = await discoverActiveGroqModel(apiKey, mutateGlobal);
      if (fallbackModel && fallbackModel !== selectedModel) {
        selectedModel = fallbackModel;
        response = await sendRequest(selectedModel);
        if (!response.ok) {
          const retryErr = await response.text();
          throw new Error(`Groq API error (${response.status}): ${retryErr}`);
        }
      } else {
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }
    } else {
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  return JSON.parse(content);
}

/**
 * Validates an API key with a test call without mutating shared process state when mutateGlobal=false.
 */
export async function testAiConnection(
  config: AiRuntimeConfig,
  mutateGlobal = false
): Promise<{ success: boolean; message: string; resolvedModel?: string }> {
  try {
    const testInput: PlanInput = { task: "Search test query", url: "https://example.com" };
    let effectiveModel = config.model;
    if (config.provider === "gemini") {
      effectiveModel = config.model || "gemini-1.5-flash";
      await callGeminiPlanner(config.apiKey, effectiveModel, testInput);
    } else if (config.provider === "openai") {
      effectiveModel = config.model || "gpt-4o-mini";
      await callOpenAiPlanner(config.apiKey, effectiveModel, testInput);
    } else if (config.provider === "claude") {
      effectiveModel = config.model || "claude-3-5-sonnet-20241022";
      await callClaudePlanner(config.apiKey, effectiveModel, testInput);
    } else {
      effectiveModel = normalizeGroqModel(config.model);
      await callGroqPlanner(config.apiKey, effectiveModel, testInput, mutateGlobal);
      if (mutateGlobal && activeConfig?.provider === "groq") {
        effectiveModel = activeConfig.model;
      }
    }
    if (mutateGlobal) {
      lastAiError = null;
    }
    return {
      success: true,
      message: `Connected to ${config.provider.toUpperCase()} (${effectiveModel}) successfully!`,
      resolvedModel: effectiveModel
    };
  } catch (err) {
    const short = formatAiErrorShort(err);
    if (mutateGlobal) {
      lastAiError = short;
    }
    return { success: false, message: short };
  }
}

/**
 * Intelligent heuristic fallback parser that handles login, personal form auto-fill, file upload, search, and extraction.
 */
export function planActionsHeuristic(input: PlanInput): PlanResult {
  const task = input.task.toLowerCase().trim();
  const actions: ActionStep[] = [];
  let explanation = "Executed Observe-Plan-Act-Verify cycle on destination.";

  // 1. Check for Login / Sign-in intent
  if (/(login|sign\s*in|authenticate|log\s*in|credentials)/i.test(task) || input.credentials?.username) {
    explanation = "Detected authentication intent; auto-filling login credentials.";
    actions.push({
      type: "auto_login",
      description: "Detect and auto-fill credential fields on page"
    });
    actions.push({
      type: "wait",
      milliseconds: 4000,
      description: "Wait for authentication redirect and dashboard load"
    });
  }

  // 2. Check for Personal Data Form-Fill or File Upload intent
  const wantsUpload = /(upload|attach|choose\s*file|add\s*file|submit\s*(?:my\s*)?(?:resume|cv|file|doc|document|pdf|portfolio))/i.test(task);
  const wantsPersonalFill = /(fill|autofill|auto-fill|apply|application|contact\s*form|register|sign\s*up|profile|bio|about\s*me|personal\s*(?:data|info|details)|using\s+my\s+(?:data|info|details|profile|resume|cv|notes)|enter\s+my)/i.test(task);

  if ((wantsPersonalFill || wantsUpload) && hasPersonalizationData(input.personalization)) {
    const stepsDesc: string[] = [];
    if (wantsPersonalFill) {
      actions.push({
        type: "autofill_personal",
        description: "Detect form fields and fill using saved Personalization data"
      });
      stepsDesc.push("filled personal details");
    }
    if (wantsUpload && (input.personalization?.files?.length || 0) > 0) {
      actions.push({
        type: "upload",
        selector: "input[type='file']",
        description: "Upload saved personal file into page file input"
      });
      stepsDesc.push("uploaded personal file");
    }
    actions.push({
      type: "wait",
      milliseconds: 1500,
      description: "Allow page inputs and uploads to settle"
    });
    explanation = `Applied Personalization context (${stepsDesc.join(" and ") || "checked form fields"}) on destination.`;
  } else {
    // 3. Generic listing / follow-up download vs Search intent
    const priorUserContext = (input.history || [])
      .filter(h => h.role === "user")
      .map(h => h.content)
      .join(" ")
      .toLowerCase();
    const wantsDownload = /\b(download|export|save)\b/i.test(task);
    const isGenericCollectionRequest =
      /(?:^|\b)(all|my|recent|list|show|get|find|extract|scrape|download|export|save)\s+(?:all\s+|my\s+|the\s+)?(images?|imgs?|photos?|pictures?|designs?|projects?|files?|pdfs?|documents?|links?|media)\b/i.test(task) ||
      /^all\s+(?:images?|imgs?|photos?|pictures?|designs?|projects?|files?|pdfs?|documents?|links?|media)\b/i.test(task) ||
      (wantsDownload && /(?:^|\b)(download|export|save)\s*(?:all|them|these|those|it|everything)?\b/i.test(task) && (!/(search|query)/i.test(task) || /(images?|imgs?|designs?|files?)/i.test(priorUserContext)));
    const searchMatch = !isGenericCollectionRequest
      ? task.match(/(?:search\s*(?:for)?|find|look\s*for|query|apply\s*(?:to|for)?)\s+([^.,;]+)/i)
      : null;

    if (isGenericCollectionRequest) {
      explanation = "Extracting images, designs, and downloadable files from destination.";
      actions.push({
        type: "scroll",
        description: "Scroll page to load lazy images and project cards"
      });
    } else if (searchMatch && !/(login|sign\s*in)/i.test(task)) {
      let query = searchMatch[1].replace(/@\w+/g, "").replace(/\b(jobs?|designs?|in|on|pe|par|and|export|csv)\b/gi, " ").trim();
      if (!query) query = "Jobs";

      explanation = `Searching for "${query}" and extracting resulting items.`;

      actions.push({
        type: "fill",
        selector: "input[type='search'], input[name*='search' i], input[placeholder*='search' i], input[placeholder*='find' i], input[aria-label*='search' i], input[type='text']:visible",
        value: query,
        description: `Type query "${query}" into search input`
      });

      actions.push({
        type: "press",
        key: "Enter",
        description: "Submit search query"
      });

      actions.push({
        type: "wait",
        milliseconds: 4000,
        description: "Allow client-side SPA to hydrate search results"
      });
    }
  }

  // 4. Final step: Always extract data & links for reporting
  actions.push({
    type: "extract",
    selector: "a:visible, div[class*='card']:visible, li[class*='item']:visible",
    description: "Extract matching results, interactive links, and structured DOM items to CSV"
  });

  return {
    engine: "heuristic-engine",
    explanation,
    actions
  };
}

/**
 * Natural language chat answerer using per-request AI config (or heuristic fallback).
 */
export async function askAiChat(
  prompt: string,
  personalization?: PersonalizationContext,
  history?: ConversationHistoryItem[],
  aiConfig?: AiRuntimeConfig | null
): Promise<{ reply: string; aiError: string | null }> {
  const cleanPrompt = prompt.trim();
  const personalBlock = formatPersonalizationForPrompt(personalization);
  const hasPersonal = hasPersonalizationData(personalization);
  const boundedTurns = buildBoundedHistory(history, 16, 12000);
  const isPerUser = aiConfig !== undefined;

  const resolvedConfig = resolveEffectiveAiConfig(aiConfig);
  const currentKey = resolvedConfig?.apiKey || "";
  const provider = resolvedConfig?.provider || "gemini";
  if (!currentKey) {
    return {
      reply: answerHeuristicChat(cleanPrompt, personalization, hasPersonal, boundedTurns),
      aiError: null
    };
  }

  const systemInstruction = personalBlock
    ? `You are Navio, an Autonomous AI Browser Agent & Personal Assistant.\nKeep continuity with the current conversation history just like ChatGPT (remember facts stated earlier in this conversation and any extracted browser records shown in earlier turns).\nYou also have access to the user's saved Personalization data and uploaded file excerpts below.\nUse this personal data whenever relevant.\n\n[USER PERSONALIZATION DATA]\n${personalBlock}`
    : "You are Navio, an Autonomous AI Browser Agent & Assistant. Answer clearly and concisely, maintaining full context from the prior turns in this conversation just like ChatGPT.";

  try {
    const model = resolvedConfig?.model;

    if (provider === "gemini") {
      const selectedModel = model || "gemini-1.5-flash";
      const contents = [
        ...boundedTurns.map(t => ({
          role: t.role === "assistant" ? "model" : "user",
          parts: [{ text: t.content }]
        })),
        { role: "user", parts: [{ text: cleanPrompt }] }
      ];
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${currentKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${err}`);
      }
      const data = await res.json();
      if (!isPerUser) lastAiError = null;
      return { reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.", aiError: null };
    } else if (provider === "openai" || provider === "groq") {
      const endpoint = provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
      let selectedModel = provider === "groq" ? normalizeGroqModel(model) : (model || "gpt-4o-mini");
      const messages = [
        { role: "system", content: systemInstruction },
        ...boundedTurns.map(t => ({ role: t.role, content: t.content })),
        { role: "user", content: cleanPrompt }
      ];
      const sendChat = (targetModel: string) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Authorization": `Bearer ${currentKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: targetModel, messages })
        });
      let res = await sendChat(selectedModel);
      if (!res.ok) {
        const err = await res.text();
        if (provider === "groq" && (res.status === 404 || /model_not_found|does not exist/i.test(err))) {
          const fallbackModel = await discoverActiveGroqModel(currentKey, !isPerUser);
          if (fallbackModel && fallbackModel !== selectedModel) {
            selectedModel = fallbackModel;
            res = await sendChat(selectedModel);
            if (!res.ok) {
              const retryErr = await res.text();
              throw new Error(`${provider} API error: ${retryErr}`);
            }
          } else {
            throw new Error(`${provider} API error: ${err}`);
          }
        } else {
          throw new Error(`${provider} API error: ${err}`);
        }
      }
      const data = await res.json();
      if (!isPerUser) lastAiError = null;
      return { reply: data.choices?.[0]?.message?.content || "No response generated.", aiError: null };
    } else if (provider === "claude") {
      const selectedModel = model || "claude-3-5-sonnet-20241022";
      // Anthropic requires alternating user/assistant turns starting with user
      const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
      for (const turn of [...boundedTurns, { role: "user" as const, content: cleanPrompt }]) {
        const last = merged[merged.length - 1];
        if (last && last.role === turn.role) {
          last.content += "\n\n" + turn.content;
        } else {
          merged.push({ role: turn.role, content: turn.content });
        }
      }
      if (merged[0]?.role === "assistant") {
        merged.shift();
      }
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": currentKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1500,
          system: systemInstruction,
          messages: merged
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error: ${err}`);
      }
      const data = await res.json();
      if (!isPerUser) lastAiError = null;
      return { reply: data.content?.[0]?.text || "No response generated.", aiError: null };
    }
    return { reply: "Response processed.", aiError: null };
  } catch (err) {
    const shortErr = formatAiErrorShort(err);
    if (!isPerUser) lastAiError = shortErr;
    console.warn("[AiChat] LLM call failed, falling back to heuristic chat:", err);
    return {
      reply: answerHeuristicChat(cleanPrompt, personalization, hasPersonal, boundedTurns, {
        provider: provider.toUpperCase(),
        error: shortErr
      }),
      aiError: shortErr
    };
  }
}

function answerHeuristicChat(
  cleanPrompt: string,
  p: PersonalizationContext | undefined,
  hasPersonal: boolean,
  history: BoundedTurn[] = [],
  aiFailure?: { provider: string; error: string }
): string {
  const firstName = p?.fullName?.trim().split(/\s+/)[0] || "";

  // 1. Check in-chat memory from earlier user statements in THIS conversation
  const rememberedFactMatch = cleanPrompt.match(/(?:what(?:'s|\s+is)|tell me|what was)\s+my\s+([a-z0-9 _-]{2,30})\??$/i);
  if (rememberedFactMatch && history.length > 0) {
    const attr = rememberedFactMatch[1].trim().toLowerCase();
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role !== "user") continue;
      const txt = history[i].content;
      const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hit = txt.match(new RegExp(`my\\s+${escaped}\\s+(?:is|=|:)\\s+([^.!\\n]+)`, "i"));
      if (hit) {
        return `Based on our conversation, your **${rememberedFactMatch[1].trim()}** is **${hit[1].trim()}**.`;
      }
    }
  }

  // 2. Acknowledge explicit memory instruction within this chat
  if (/^(?:remember|note that|keep in mind)\b/i.test(cleanPrompt)) {
    return `Got it — I'll remember that for this conversation: "${cleanPrompt.replace(/^(?:remember|note that|keep in mind)\s*(?:that)?[:\s]*/i, "")}"`;
  }

  // 3. Follow-ups about previous messages or extracted browser results in THIS chat
  if (/(summarize|recap|what did (?:i|we)|previous|last|earlier)\s*(?:chat|conversation|talk|ask|question|message|above|before|discuss)/i.test(cleanPrompt)) {
    if (history.length === 0) {
      return "This is the start of a new conversation — there are no earlier messages in this chat yet.";
    }
    const userTurns = history.filter(h => h.role === "user").map((h, idx) => `${idx + 1}. ${h.content.slice(0, 140)}`);
    const lastAssist = [...history].reverse().find(h => h.role === "assistant");
    return [
      `**Current conversation summary (${history.length} prior message(s)):**`,
      ...userTurns,
      lastAssist ? `\n**Latest response:** ${lastAssist.content.slice(0, 320)}${lastAssist.content.length > 320 ? "..." : ""}` : ""
    ].filter(Boolean).join("\n");
  }

  if (history.length > 0 && /(above|those|them|these|scraped|extracted|how many|show.*links?|list.*items?)/i.test(cleanPrompt)) {
    const lastWithExtract = [...history].reverse().find(h => h.rawExtractedSummary);
    if (lastWithExtract?.rawExtractedSummary) {
      return `From earlier in this conversation, here are the extracted records:\n\n${lastWithExtract.rawExtractedSummary}`;
    }
  }

  if (/what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i/i.test(cleanPrompt)) {
    if (p?.enabled === false) {
      return "Personalization is currently paused. Enable it in the **Personalization** tab so I can use your saved name.";
    }
    if (p?.fullName?.trim()) {
      return `Your name is **${p.fullName.trim()}**.`;
    }
    return "You haven't saved your name yet. Open **Personalization** in the sidebar to add your name, notes, or upload files.";
  }

  if (/what(?:'s|\s+is)\s+my\s+email|my\s+email/i.test(cleanPrompt)) {
    return p?.email?.trim()
      ? `Your saved email is **${p.email.trim()}**.`
      : "No email is saved in **Personalization** yet.";
  }

  if (/what(?:'s|\s+is)\s+my\s+(?:phone|number|mobile)|my\s+(?:phone|number|mobile)/i.test(cleanPrompt)) {
    return p?.phone?.trim()
      ? `Your saved phone number is **${p.phone.trim()}**.`
      : "No phone number is saved in **Personalization** yet.";
  }

  if (/what(?:'s|\s+is)\s+my\s+(?:location|address|city)|where\s+do\s+i\s+live/i.test(cleanPrompt)) {
    return p?.location?.trim()
      ? `Your saved location is **${p.location.trim()}**.`
      : "No location is saved in **Personalization** yet.";
  }

  if (/(my\s+(?:personal\s*(?:data|info|details|notes|profile)|resume|cv|files?|bio|skills?|experience|background)|summarize\s+my|uploaded\s+files?)/i.test(cleanPrompt)) {
    if (!hasPersonal) {
      return "No personal data or files are active yet. Open **Personalization** in the sidebar to upload files or write your personal details.";
    }
    const parts: string[] = ["Here is your active **Personalization** data:"];
    if (p?.fullName?.trim()) parts.push(`• **Name:** ${p.fullName.trim()}`);
    if (p?.email?.trim()) parts.push(`• **Email:** ${p.email.trim()}`);
    if (p?.phone?.trim()) parts.push(`• **Phone:** ${p.phone.trim()}`);
    if (p?.location?.trim()) parts.push(`• **Location:** ${p.location.trim()}`);
    if (p?.customText?.trim()) parts.push(`\n**Saved Notes:**\n${p.customText.trim()}`);
    if (p?.files && p.files.length > 0) {
      parts.push(`\n**Uploaded Files (${p.files.length}):**`);
      for (const f of p.files) {
        const preview = f.extractedText?.trim()
          ? ` — ${f.extractedText.trim().slice(0, 320)}${f.extractedText.trim().length > 320 ? "..." : ""}`
          : " (attached for file uploads)";
        parts.push(`• **${f.fileName}**${preview}`);
      }
    }
    return parts.join("\n");
  }

  // 4. Natural conversational greetings, short typos (e.g. "hu"), and small talk without repeating canned boilerplate
  const activePlatformMatch = [...history].reverse().map(h => h.content.match(/^\[@([^\]]+)\]/)).find(Boolean);
  const activePlatformName = activePlatformMatch ? activePlatformMatch[1] : "";

  if (/^(hi+|hy+|hu+|hii+|helo+|hello+|hlw+|hey+|hola|namaste|yo|gm|good\s*(?:morning|evening|afternoon))[!.?\s]*$/i.test(cleanPrompt)) {
    const priorGreetingCount = history.filter(
      h => h.role === "assistant" && /^(?:hello|hey|hi)\b/i.test(h.content)
    ).length;
    const keyNote = aiFailure
      ? `\n\n*(Note: your saved **${aiFailure.provider}** key returned \`${aiFailure.error}\` — update it in **Settings & AI Keys** for live LLM answers.)*`
      : "";
    if (priorGreetingCount > 0) {
      return activePlatformName
        ? `Hey${firstName ? ` ${firstName}` : ""}! Still in this conversation — what would you like to do on **@${activePlatformName}** or ask next?${keyNote}`
        : `Hey again${firstName ? ` ${firstName}` : ""}! What would you like me to help with?${keyNote}`;
    }
    return `Hey${firstName ? ` ${firstName}` : ""}! I'm ready. Ask a question, or give a task for **${activePlatformName ? `@${activePlatformName}` : "@platform"}** (like \`find designs\` or \`download all\`).${keyNote}`;
  }

  if (/^(?:how\s+are\s+you|kaise\s+ho|kya\s+haal|what'?s\s+up|sup)[!?\s]*$/i.test(cleanPrompt)) {
    return `Doing well${firstName ? `, ${firstName}` : ""}! Everything is ready — tell me what you'd like to search, automate, or ask.`;
  }

  if (/^(?:thanks?|thank\s+you|thx|ty|ok|okay|hmm+|hm|cool|nice|great|got\s+it|done)[!.,\s]*$/i.test(cleanPrompt)) {
    return activePlatformName
      ? `Got it! Let me know what you'd like to do next on **@${activePlatformName}** or anywhere else.`
      : "Got it! Let me know whenever you want to run a task or ask anything.";
  }

  if (/(?:what\s+(?:did\s+i|was\s+(?:my|the))\s+(?:last|previous)|last\s+message)/i.test(cleanPrompt) && history.length > 0) {
    const lastUser = [...history].reverse().find(h => h.role === "user");
    if (lastUser) {
      return `Your previous message in this conversation was: **"${lastUser.content}"**.`;
    }
  }

  if (aiFailure) {
    const browserTip = activePlatformName
      ? ` You can still run browser actions directly on **@${activePlatformName}** (e.g. \`find all images\`, \`download all\`, \`fill form\`).`
      : " You can still target connected sites with `@platform` for browser automation.";
    return `Your saved **${aiFailure.provider}** API key failed authentication (\`${aiFailure.error}\`). Update a working key in **Settings & AI Keys** for live conversational AI replies.${browserTip}`;
  }

  return activePlatformName
    ? `I received: "${cleanPrompt}". For live conversational AI replies, add an AI model key in **Settings & AI Keys** — or send a browser command (like \`find designs\`, \`download all\`, \`open projects\`) to run on **@${activePlatformName}**.`
    : `I received: "${cleanPrompt}". Add an AI model key in **Settings & AI Keys** for full conversational AI, or target a connected website using **@platform** (e.g. \`@canva find all images\`).`;
}


/**
 * Shared JSON completion helper using per-request AI config (or global fallback only when override is omitted).
 * Returns null if no API key is configured or if parsing/calling fails.
 */
export async function askAiJson<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  aiConfig?: AiRuntimeConfig | null
): Promise<T | null> {
  const resolvedConfig = resolveEffectiveAiConfig(aiConfig);
  const currentKey = resolvedConfig?.apiKey || "";
  if (!currentKey) return null;

  const isPerUser = aiConfig !== undefined;
  const provider = resolvedConfig?.provider || "gemini";
  const model = resolvedConfig?.model;

  try {
    if (provider === "gemini") {
      const selectedModel = model || "gemini-1.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${currentKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\nRespond with ONLY valid JSON:` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      return JSON.parse(text) as T;
    }

    if (provider === "openai" || provider === "groq") {
      const endpoint = provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
      let selectedModel = provider === "groq" ? normalizeGroqModel(model) : (model || "gpt-4o-mini");
      const sendReq = (targetModel: string) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Authorization": `Bearer ${currentKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 1800
          })
        });
      let res = await sendReq(selectedModel);
      if (!res.ok && provider === "groq") {
        const err = await res.text();
        if (res.status === 404 || /model_not_found|does not exist/i.test(err)) {
          const fallbackModel = await discoverActiveGroqModel(currentKey, !isPerUser);
          if (fallbackModel && fallbackModel !== selectedModel) {
            res = await sendReq(fallbackModel);
          }
        }
      }
      if (!res.ok) return null;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content) as T;
    }

    if (provider === "claude") {
      const selectedModel = model || "claude-3-5-sonnet-20241022";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": currentKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1800,
          system: systemPrompt,
          messages: [{ role: "user", content: `${userPrompt}\nRespond with ONLY valid JSON:` }]
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text) as T;
    }
  } catch (err) {
    console.warn("[askAiJson] JSON completion failed, falling back to deterministic scoring:", err);
  }
  return null;
}
