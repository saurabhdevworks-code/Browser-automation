import fs from "fs";
import path from "path";

export interface ActionStep {
  type: "navigate" | "fill" | "click" | "press" | "wait" | "extract" | "auto_login";
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

function loadPersistedConfig(): AiRuntimeConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey) return parsed;
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

export function setRuntimeAiConfig(config: AiRuntimeConfig | null): void {
  activeConfig = config;
  try {
    if (config && config.apiKey) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
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

export function getRuntimeAiConfig(): { provider: string; model: string; isConfigured: boolean; maskedKey?: string } {
  const currentKey = activeConfig?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY;
  const currentProvider = activeConfig?.provider || (process.env.GEMINI_API_KEY ? "gemini" : (process.env.OPENAI_API_KEY ? "openai" : (process.env.ANTHROPIC_API_KEY ? "claude" : "gemini")));
  const currentModel = activeConfig?.model || (currentProvider === "gemini" ? "gemini-1.5-flash" : (currentProvider === "openai" ? "gpt-4o-mini" : (currentProvider === "claude" ? "claude-3-5-sonnet-20241022" : "llama-3.3-70b-versatile")));

  return {
    provider: currentProvider,
    model: currentModel,
    isConfigured: Boolean(currentKey),
    maskedKey: currentKey ? `${currentKey.slice(0, 4)}...${currentKey.slice(-4)}` : undefined
  };
}

interface PlanInput {
  task: string;
  url: string;
  currentTitle?: string;
  credentials?: { username?: string; password?: string };
}

/**
 * Plans actions using configured LLM (Gemini, OpenAI, Claude, or Groq) or falls back to Heuristic Intent Engine.
 */
export async function planActions(input: PlanInput): Promise<PlanResult> {
  const config = activeConfig || {
    provider: (process.env.GEMINI_API_KEY ? "gemini" : (process.env.OPENAI_API_KEY ? "openai" : (process.env.ANTHROPIC_API_KEY ? "claude" : "gemini"))) as "gemini" | "openai" | "claude" | "groq",
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY || "",
    model: process.env.GEMINI_API_KEY ? "gemini-1.5-flash" : "gpt-4o-mini"
  };

  if (config.apiKey) {
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
        // Groq
        const groqPlan = await callGroqPlanner(config.apiKey, config.model || "llama-3.3-70b-versatile", input);
        if (groqPlan?.actions?.length) {
          return {
            engine: "groq-llm",
            explanation: groqPlan.explanation || "Groq AI automation plan",
            actions: groqPlan.actions
          };
        }
      }
    } catch (err) {
      console.warn(`[AiPlanner] ${config.provider} API call failed, falling back to heuristic engine:`, err);
    }
  }

  // Fallback to robust heuristic intent parser
  return planActionsHeuristic(input);
}

const SYSTEM_PROMPT = `You are an Autonomous AI Browser Automation Agent.
Your job is to convert natural language instructions (English, Hindi, or Hinglish, e.g. "LinkedIn pe 10 Java jobs apply karo", "Canva me search karo banner designs", "Login to portal and scrape items") into concrete browser steps.

Available action types:
- "navigate": { "type": "navigate", "url": "https://...", "description": "Navigate to URL" }
- "fill": { "type": "fill", "selector": "CSS selector or text selector", "value": "text to type", "description": "Type query into search input" }
- "click": { "type": "click", "selector": "CSS selector or button text", "description": "Click submit button" }
- "press": { "type": "press", "key": "Enter", "description": "Press Enter key" }
- "wait": { "type": "wait", "milliseconds": 3000, "description": "Wait for results to hydrate" }
- "auto_login": { "type": "auto_login", "description": "Detect login form and auto-fill credentials" }
- "extract": { "type": "extract", "selector": "CSS selector", "description": "Extract structured data items to CSV" }

Return a valid JSON object ONLY:
{
  "explanation": "Brief explanation of plan in 1 sentence",
  "actions": [
    ... action objects ...
  ]
}`;

async function callGeminiPlanner(apiKey: string, model: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = `${SYSTEM_PROMPT}\n\nTarget Site: ${input.url}\nTask: ${input.task}\nHas Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}\nRespond with ONLY valid JSON:`;

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
  const userPrompt = `Target Site: ${input.url}\nTask: ${input.task}\nHas Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}`;

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
  const userPrompt = `${SYSTEM_PROMPT}\n\nTarget Site: ${input.url}\nTask: ${input.task}\nHas Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}\nRespond with ONLY valid JSON:`;

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

async function callGroqPlanner(apiKey: string, model: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const userPrompt = `Target Site: ${input.url}\nTask: ${input.task}\nHas Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
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
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  return JSON.parse(content);
}

/**
 * Validates an API key with a test call.
 */
export async function testAiConnection(config: AiRuntimeConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testInput: PlanInput = { task: "Search test query", url: "https://example.com" };
    if (config.provider === "gemini") {
      await callGeminiPlanner(config.apiKey, config.model || "gemini-1.5-flash", testInput);
    } else if (config.provider === "openai") {
      await callOpenAiPlanner(config.apiKey, config.model || "gpt-4o-mini", testInput);
    } else if (config.provider === "claude") {
      await callClaudePlanner(config.apiKey, config.model || "claude-3-5-sonnet-20241022", testInput);
    } else {
      await callGroqPlanner(config.apiKey, config.model || "llama-3.3-70b-versatile", testInput);
    }
    return { success: true, message: `Connected to ${config.provider.toUpperCase()} (${config.model}) successfully!` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Validation failed" };
  }
}

/**
 * Intelligent heuristic fallback parser that handles search, login, navigation, and extraction.
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

  // 2. Check for Search intent
  const searchMatch = task.match(/(?:search\s*(?:for)?|find|look\s*for|query|apply\s*(?:to|for)?)\s+([^.,;]+)/i);
  if (searchMatch && !/(login|sign\s*in)/i.test(task)) {
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

  // 3. Final step: Always extract data & links for CSV reporting
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
 * Natural language chat answerer using the active AI engine (Gemini, OpenAI, Groq, Claude) or smart heuristic fallback.
 */
export async function askAiChat(prompt: string): Promise<string> {
  const cleanPrompt = prompt.trim();
  if (/what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i/i.test(cleanPrompt)) {
    return "Your name is Saurabh Patel.";
  }

  const currentKey = activeConfig?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY;
  if (!currentKey) {
    if (/^(hi|hy|hello|hey|namaste)\b/i.test(cleanPrompt)) {
      return "Hello Saurabh! I am your Universal Browser AI Agent. You can ask me questions, execute web automations with @platform, or configure an AI key in Settings.";
    }
    return `Instruction received: "${cleanPrompt}". You can target connected platforms using @platform (e.g. @canva) or configure an AI model key in Settings for general conversational intelligence.`;
  }

  const provider = activeConfig?.provider || (process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "groq");
  const model = activeConfig?.model;

  if (provider === "gemini") {
    const selectedModel = model || "gemini-1.5-flash";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${currentKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanPrompt }] }]
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  } else if (provider === "openai" || provider === "groq") {
    const endpoint = provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const selectedModel = model || (provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${currentKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: cleanPrompt }]
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} API error: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } else if (provider === "claude") {
    const selectedModel = model || "claude-3-5-sonnet-20241022";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": currentKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1500,
        messages: [{ role: "user", content: cleanPrompt }]
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${err}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "No response generated.";
  }

  return "Response processed.";
}
