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
  engine: "groq-llm" | "heuristic-engine";
  explanation: string;
  actions: ActionStep[];
}

interface PlanInput {
  task: string;
  url: string;
  currentTitle?: string;
  credentials?: { username?: string; password?: string };
}

/**
 * Plans actions using Groq LLM (llama-3.3-70b-versatile) or falls back to Heuristic Intent Engine.
 */
export async function planActions(input: PlanInput): Promise<PlanResult> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey) {
    try {
      const groqPlan = await callGroqPlanner(groqApiKey, input);
      if (groqPlan && groqPlan.actions && groqPlan.actions.length > 0) {
        return {
          engine: "groq-llm",
          explanation: groqPlan.explanation || "AI-generated automation execution plan",
          actions: groqPlan.actions
        };
      }
    } catch (err) {
      console.warn("[GroqPlanner] Groq API call failed, falling back to heuristic engine:", err);
    }
  }

  // Fallback to robust heuristic intent parser
  return planActionsHeuristic(input);
}

/**
 * Calls Groq API chat completions with strict JSON output schema.
 */
async function callGroqPlanner(apiKey: string, input: PlanInput): Promise<{ explanation: string; actions: ActionStep[] }> {
  const systemPrompt = `You are an Autonomous AI Browser Automation Agent (Digital Employee).
Your job is to convert natural language instructions (in English, Hindi, or Hinglish, e.g. "LinkedIn pe 10 Java jobs apply karo", "Canva me search karo banner designs", "Login to portal and scrape prices") into concrete browser steps.

Available action types:
- "navigate": { "type": "navigate", "url": "https://...", "description": "Navigate to URL" }
- "fill": { "type": "fill", "selector": "CSS selector or text selector", "value": "text to type", "description": "Type query into search input" }
- "click": { "type": "click", "selector": "CSS selector or button text", "description": "Click submit button" }
- "press": { "type": "press", "key": "Enter", "description": "Press Enter key" }
- "wait": { "type": "wait", "milliseconds": 3000, "description": "Wait for results to hydrate" }
- "auto_login": { "type": "auto_login", "description": "Detect login form and auto-fill credentials" }
- "extract": { "type": "extract", "selector": "CSS selector for records (e.g. a, .job-card, .result)", "description": "Extract structured data items to CSV" }

Return a valid JSON object ONLY with this exact structure:
{
  "explanation": "Brief explanation of plan in 1 sentence",
  "actions": [
    ... action objects ...
  ]
}`;

  const userPrompt = `Target Site: ${input.url}
Task: ${input.task}
Has Credentials: ${Boolean(input.credentials?.username && input.credentials?.password)}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
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

  // 2. Check for Search intent (e.g. "search for React jobs", "find banner designs", "LinkedIn pe Java jobs apply")
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
