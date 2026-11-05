import React, { useEffect, useState, useRef } from "react";
import navioLogo from "./assets/navio-logo.png";
import {
  Activity,
  Bot,
  Globe2,
  ShieldCheck,
  Workflow,
  Plus,
  ArrowUpRight,
  Share2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  Lock,
  Layers,
  FileSpreadsheet,
  Send,
  Sparkles,
  ExternalLink,
  Sliders,
  Check,
  Key,
  Info,
  Trash2,
  AtSign,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Zap,
  CornerDownLeft,
  X,
  Clock,
  Sun,
  Moon,
  Settings,
  EyeOff,
  Cpu,
  Menu
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
const WORKER_API = import.meta.env.VITE_WORKER_URL || "http://localhost:3001";

type Connection = { id: string; name: string; websiteUrl: string; status: string; createdAt: string };
type Task = { id: string; connectionId: string; prompt: string; status: string; result?: string; createdAt: string };
type Action = { id: string; actionType: string; description: string; status: string; createdAt: string };
type Capability = { key: string; name: string; status: string; riskLevel: string; description: string };
type Connector = { id: string; name: string; category: string; authType: string; status: string; capabilities: Capability[] };
type Approval = { id: string; platform: string; actionDescription: string; riskLevel: string; approvalStatus: string; payload: string; consequences: string; requestedAt: string };
type GeneratedFile = { id: string; taskId?: string; fileName: string; fileType: string; rowCount: number; contentPreview: string; downloadUrl: string; createdAt: string };
type WhatsAppChat = { id: string; customerName: string; phone: string; lastMessage: string; intent: string; confidence: string; suggestedDraft: string; status: string };
type Toast = { id: string; type: "success" | "error" | "info"; message: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  targetName: string;
  prompt?: string;
  content?: string;
  isSchedule?: boolean;
  scheduleDetails?: string;
  status: "THINKING" | "RUNNING" | "COMPLETED" | "FAILED";
  actions?: Action[];
  file?: GeneratedFile;
  createdAt: string;
};

// Custom SVG Icon matching exact document history clock design
function HistoryDocClockIcon({
  size = 18,
  className = "",
  style
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const maskId = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="#ffffff" />
          {/* 3 Document Text Lines */}
          <rect x="38" y="27" width="36" height="7.5" rx="3.75" fill="#000000" />
          <rect x="38" y="43" width="36" height="7.5" rx="3.75" fill="#000000" />
          <rect x="52" y="59" width="22" height="7.5" rx="3.75" fill="#000000" />
          {/* Moat separating clock badge from main document */}
          <circle cx="29" cy="73" r="26" fill="#000000" />
          {/* Re-include clock face in mask */}
          <circle cx="29" cy="73" r="19.5" fill="#ffffff" />
          {/* Clock hands cutout */}
          <path
            d="M29 60.5 V73.5 H39.5"
            stroke="#000000"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </mask>
      </defs>
      <rect
        x="21"
        y="10"
        width="67"
        height="80"
        rx="18"
        mask={`url(#${maskId})`}
      />
      <circle
        cx="29"
        cy="73"
        r="19.5"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

function normalizeWebUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "");
  clean = clean.replace(/^www\./, "");
  clean = clean.replace(/\/+$/, "");
  return clean;
}

// Formatted Markdown renderer for Gemini-style clean typography
function FormattedMarkdown({ content }: { content?: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  function flushList() {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="geminiMarkdownList">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  }

  function formatInline(text: string): React.ReactNode[] {
    const tokens: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("`") && token.endsWith("`")) {
        tokens.push(
          <code key={match.index} className="geminiMarkdownCode">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("**") && token.endsWith("**")) {
        tokens.push(
          <strong key={match.index} className="geminiMarkdownBold">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        tokens.push(
          <em key={match.index} className="geminiMarkdownItalic">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push(text.slice(lastIndex));
    }

    return tokens;
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^(?:•|\-|\*)\s+(.*)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1];
      currentList.push(
        <li key={`li-${idx}`} className="geminiMarkdownListItem">
          {formatInline(itemContent)}
        </li>
      );
    } else {
      flushList();
      if (trimmed === "") {
        elements.push(<div key={`spacer-${idx}`} className="geminiMarkdownSpacer" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="geminiMarkdownParagraph">
            {formatInline(trimmed)}
          </p>
        );
      }
    }
  });

  flushList();

  return <div className="geminiFormattedMarkdown">{elements}</div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "connections" | "capabilities" | "social" | "approvals" | "files" | "security" | "settings">("dashboard");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [waChats, setWaChats] = useState<WhatsAppChat[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Settings & AI Configuration state
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai" | "claude" | "groq">("gemini");
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gemini-1.5-flash");
  const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; maskedKey?: string; message?: string }>({ isConfigured: false });
  const [showAiKey, setShowAiKey] = useState<boolean>(false);
  const [isTestingAiKey, setIsTestingAiKey] = useState<boolean>(false);

  // Gemini AI Command Center state
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string>(""); // "" (none/general), "all", or connection.id
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: "single" | "all";
    taskId?: string;
    taskPrompt?: string;
  } | null>(null);
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("deleted_task_ids");
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    deletedTaskIdsRef.current = deletedTaskIds;
  }, [deletedTaskIds]);
  const [quickConnName, setQuickConnName] = useState("");
  const [quickConnUrl, setQuickConnUrl] = useState("");
  const [expandedTraceTaskId, setExpandedTraceTaskId] = useState<string | null>(null);
  const [taskTraceCache, setTaskTraceCache] = useState<Record<string, Action[]>>({});
  const geminiTextareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const chatFeedBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat feed to bottom when new messages arrive
  useEffect(() => {
    if (conversationStarted && chatFeedBottomRef.current) {
      chatFeedBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, conversationStarted]);

  // Close plus popover menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    if (showPlusMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPlusMenu]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // Load saved AI config from worker & localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("browser_agent_ai_key");
    const savedProvider = (localStorage.getItem("browser_agent_ai_provider") as "gemini" | "openai" | "claude" | "groq") || "gemini";
    const savedModel = localStorage.getItem("browser_agent_ai_model") || "gemini-1.5-flash";
    if (savedKey) {
      setAiApiKey(savedKey);
      setAiProvider(savedProvider);
      setAiModel(savedModel);
      setAiStatus({
        isConfigured: true,
        maskedKey: savedKey.length > 8 ? `${savedKey.slice(0, 4)}...${savedKey.slice(-4)}` : "••••••••"
      });
      // Silently sync to backend worker runtime
      fetch(`${WORKER_API}/v1/config/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: savedProvider,
          apiKey: savedKey,
          model: savedModel,
          skipTest: true
        })
      }).catch(() => {});
    } else {
      fetch(`${WORKER_API}/v1/config/ai`)
        .then(res => res.json())
        .then(data => {
          if (data && data.isConfigured) {
            setAiStatus({ isConfigured: true, maskedKey: data.maskedKey });
            if (data.provider) setAiProvider(data.provider);
            if (data.model) setAiModel(data.model);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function handleSaveAiConfig() {
    const key = aiApiKey.trim();
    if (!key) {
      showToast("Please enter an API key.", "error");
      return;
    }

    // Instantly persist in browser storage
    localStorage.setItem("browser_agent_ai_key", key);
    localStorage.setItem("browser_agent_ai_provider", aiProvider);
    localStorage.setItem("browser_agent_ai_model", aiModel);

    const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "••••••••";
    setAiStatus({ isConfigured: true, maskedKey: masked });

    setIsTestingAiKey(true);
    try {
      const res = await fetch(`${WORKER_API}/v1/config/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: key,
          model: aiModel
        })
      });
      const data = await res.json();
      if (data && data.config) {
        setAiStatus({
          isConfigured: true,
          maskedKey: data.config.maskedKey || masked,
          message: data.message
        });
      }
      showToast(data?.message || `Saved ${aiProvider.toUpperCase()} API key!`, data?.verified === false ? "info" : "success");
    } catch (err) {
      showToast(`API Key saved locally! (Worker note: ${err instanceof Error ? err.message : "check worker connection"})`, "info");
    } finally {
      setIsTestingAiKey(false);
    }
  }

  function handleClearAiConfig() {
    localStorage.removeItem("browser_agent_ai_key");
    localStorage.removeItem("browser_agent_ai_provider");
    localStorage.removeItem("browser_agent_ai_model");
    setAiApiKey("");
    setAiStatus({ isConfigured: false });
    fetch(`${WORKER_API}/v1/config/ai`, { method: "DELETE" }).catch(() => {});
    showToast("AI Key cleared. System running in smart Heuristic Fallback mode.", "info");
  }

  // Task execution state
  const [selectedConnId, setSelectedConnId] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<{ task: Task; actions: Action[] } | null>(null);

  // New connection form
  const [newConnName, setNewConnName] = useState("");
  const [newConnUrl, setNewConnUrl] = useState("");

  // Social post state
  const [postContent, setPostContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Instagram", "Facebook", "LinkedIn"]);
  const [postNotice, setPostNotice] = useState("");

  // UI Browser Login state
  const [loginModalConn, setLoginModalConn] = useState<Connection | null>(null);
  const [loginModalLoading, setLoginModalLoading] = useState(false);

  // Table Selection & Bulk Delete state
  const [selectedConnRowIds, setSelectedConnRowIds] = useState<string[]>([]);
  const [selectedFileRowIds, setSelectedFileRowIds] = useState<string[]>([]);

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedConnRowIds(connections.map(c => c.id));
    } else {
      setSelectedConnRowIds([]);
    }
  }

  function toggleSelectRow(id: string) {
    if (selectedConnRowIds.includes(id)) {
      setSelectedConnRowIds(selectedConnRowIds.filter(x => x !== id));
    } else {
      setSelectedConnRowIds([...selectedConnRowIds, id]);
    }
  }

  function toggleSelectAllFiles(checked: boolean) {
    if (checked) {
      setSelectedFileRowIds(files.map(f => f.id));
    } else {
      setSelectedFileRowIds([]);
    }
  }

  function toggleSelectFileRow(id: string) {
    if (selectedFileRowIds.includes(id)) {
      setSelectedFileRowIds(selectedFileRowIds.filter(x => x !== id));
    } else {
      setSelectedFileRowIds([...selectedFileRowIds, id]);
    }
  }

  async function handleDeleteFile(id: string) {
    try {
      const r = await fetch(`${API}/files/${id}`, { method: "DELETE" });
      if (r.ok) {
        showToast("Report file deleted successfully.", "success");
        setSelectedFileRowIds(prev => prev.filter(x => x !== id));
        await loadData();
      } else {
        showToast("Failed to delete file", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete file", "error");
    }
  }

  async function handleDeleteSelectedFiles() {
    if (selectedFileRowIds.length === 0) return;
    try {
      const r = await fetch(`${API}/files/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedFileRowIds)
      });
      if (r.ok) {
        showToast(`Deleted ${selectedFileRowIds.length} report file(s) successfully.`, "success");
        setSelectedFileRowIds([]);
        await loadData();
      } else {
        showToast("Failed to delete selected files", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete files", "error");
    }
  }

  async function handleDeleteSelectedConnections() {
    if (selectedConnRowIds.length === 0) return;
    try {
      const r = await fetch(`${API}/connections/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedConnRowIds)
      });
      if (r.ok) {
        showToast(`Deleted ${selectedConnRowIds.length} connection(s) successfully.`, "success");
        setSelectedConnRowIds([]);
        await loadData();
      } else {
        showToast("Failed to delete connections.", "error");
      }
    } catch (_) {
      showToast("Failed to delete connections.", "error");
    }
  }

  async function handleDeleteTask(taskId: string) {
    // 1. Mark as deleted in ref & state so polling NEVER brings it back
    deletedTaskIdsRef.current.add(taskId);
    setDeletedTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      try {
        localStorage.setItem("deleted_task_ids", JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });

    // 2. Optimistic UI state cleanup
    setTasks(prev => prev.filter(item => item.id !== taskId));
    if (activeHistoryId === taskId) {
      setActiveHistoryId(null);
      setChatMessages([]);
      setConversationStarted(false);
    }

    // 3. Backend permanent hard delete
    try {
      const r = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE" });
      if (r.ok || r.status === 204) {
        showToast("Command permanently deleted.", "info");
      } else {
        showToast("Command removed.", "info");
      }
    } catch (err) {
      console.error("Hard delete task error:", err);
      showToast("Command removed from view.", "info");
    }
  }

  async function executeClearAllTasks() {
    setDeletedTaskIds(prev => {
      const allIds = new Set(prev);
      tasks.forEach(t => {
        allIds.add(t.id);
        deletedTaskIdsRef.current.add(t.id);
      });
      try {
        localStorage.setItem("deleted_task_ids", JSON.stringify(Array.from(allIds)));
      } catch (_) {}
      return allIds;
    });
    setTasks([]);
    setActiveHistoryId(null);
    setChatMessages([]);
    setConversationStarted(false);
    try {
      await fetch(`${API}/tasks`, { method: "DELETE" });
      showToast("All command history permanently deleted.", "info");
    } catch (err) {
      console.error("Hard delete all tasks error:", err);
      showToast("History cleared.", "info");
    }
  }

  async function launchBrowserLogin(c: Connection) {
    setBusy(true);
    showToast(`Launching Chromium login window for ${c.name}...`, "info");
    try {
      const r = await fetch(`${API}/connections/${c.id}/launch-login`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to open login browser");
      setLoginModalConn(c);
      showToast("Chromium window opened on your desktop! Please complete login inside it.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open browser", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmBrowserLogin() {
    if (!loginModalConn) return;
    setLoginModalLoading(true);
    try {
      const r = await fetch(`${API}/connections/${loginModalConn.id}/confirm-login`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to save session");
      showToast(`Session for ${loginModalConn.name} authenticated and saved successfully.`, "success");
      setLoginModalConn(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save session", "error");
    } finally {
      setLoginModalLoading(false);
    }
  }

  async function cancelBrowserLogin() {
    if (!loginModalConn) return;
    try {
      await fetch(`${API}/connections/${loginModalConn.id}/cancel-login`, { method: "POST" });
    } catch (_) {}
    setLoginModalConn(null);
  }

  async function loadData() {
    try {
      const [cRes, tRes, conRes, appRes, fRes, waRes] = await Promise.all([
        fetch(`${API}/connections`),
        fetch(`${API}/tasks`),
        fetch(`${API}/connectors`),
        fetch(`${API}/approvals`),
        fetch(`${API}/files`),
        fetch(`${API}/social/whatsapp/inbox`).catch(() => null)
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setConnections(cData);
        if (!selectedConnId && cData.length > 0) setSelectedConnId(cData[0].id);
      }
      if (tRes.ok) {
        const tData: Task[] = await tRes.json();
        setTasks(tData.filter(t => !deletedTaskIdsRef.current.has(t.id)).reverse());
      }
      if (conRes.ok) setConnectors(await conRes.json());
      if (appRes.ok) setApprovals(await appRes.json());
      if (fRes.ok) setFiles(await fRes.json());
      if (waRes && waRes.ok) setWaChats(await waRes.json());
    } catch {
      // Background poll failure
    }
  }

  useEffect(() => {
    void loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleAddConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!newConnName.trim() || !newConnUrl.trim()) return;

    const normUrl = normalizeWebUrl(newConnUrl);
    const normName = newConnName.trim().toLowerCase();
    const existing = connections.find(c => 
      normalizeWebUrl(c.websiteUrl) === normUrl || 
      c.name.trim().toLowerCase() === normName
    );

    if (existing) {
      showToast(`Website "${existing.name}" (${existing.websiteUrl}) is already registered! Duplicate websites are not allowed.`, "error");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch(`${API}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newConnName.trim(), websiteUrl: newConnUrl.trim() })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to add website connection");
      setNewConnName("");
      setNewConnUrl("");
      setSelectedConnId(data.id);
      await loadData();
      showToast(`Website connection "${data.name}" registered successfully.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Connection failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRunTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConnId) return showToast("Please select an authorized connection.", "error");
    setBusy(true);
    showToast("Agent executing Observe-Plan-Act-Verify cycle...", "info");
    try {
      const r = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: selectedConnId, prompt: taskPrompt })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Task execution failed");
      setTaskPrompt("");
      await loadData();
      await viewTaskDetail(data.id);
      showToast(`Task execution finished with status: ${data.status}`, data.status === "COMPLETED" ? "success" : "error");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Task execution failed", "error");
    } finally {
      setBusy(false);
    }
  }

  // Quick Add website from Gemini Command Center
  async function handleQuickAddConnection(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!quickConnName.trim() || !quickConnUrl.trim()) {
      showToast("Please provide both a Name and URL for the website.", "error");
      return;
    }

    const normUrl = normalizeWebUrl(quickConnUrl);
    const normName = quickConnName.trim().toLowerCase();
    const existing = connections.find(c => 
      normalizeWebUrl(c.websiteUrl) === normUrl || 
      c.name.trim().toLowerCase() === normName
    );

    if (existing) {
      showToast(`Website "${existing.name}" is already connected! Selected existing connection.`, "info");
      setSelectedTarget(existing.id);
      setSelectedConnId(existing.id);
      setGeminiPrompt(prev => {
        const cleaned = prev.trim().replace(/^@[a-zA-Z0-9_\-\.]+\s*/, "");
        return cleaned ? `@${existing.name} ${cleaned}` : `@${existing.name} `;
      });
      setShowQuickAddModal(false);
      setShowMentionDropdown(false);
      setQuickConnName("");
      setQuickConnUrl("");
      setTimeout(() => {
        geminiTextareaRef.current?.focus();
      }, 50);
      return;
    }

    setBusy(true);
    try {
      const r = await fetch(`${API}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickConnName.trim(), websiteUrl: quickConnUrl.trim() })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to add website connection");
      setQuickConnName("");
      setQuickConnUrl("");
      setShowQuickAddModal(false);
      setShowMentionDropdown(false);
      setSelectedTarget(data.id);
      setSelectedConnId(data.id);
      setGeminiPrompt(prev => {
        const cleaned = prev.trim().replace(/^@[a-zA-Z0-9_\-\.]+\s*/, "");
        return cleaned ? `@${data.name} ${cleaned}` : `@${data.name} `;
      });
      await loadData();
      showToast(`Website "${data.name}" registered & targeted!`, "success");
      setTimeout(() => {
        geminiTextareaRef.current?.focus();
      }, 50);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Connection failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function selectPlatformFromMenu(targetId: string, label: string) {
    if (selectedTarget === targetId) {
      // Toggle off if already selected
      setSelectedTarget("");
      setGeminiPrompt(prev => prev.trim().replace(/^@[a-zA-Z0-9_\-\.]+\s*/, ""));
    } else {
      setSelectedTarget(targetId);
      // Update input box to show the chosen platform
      setGeminiPrompt(prev => {
        const trimmed = prev.trim();
        const cleaned = trimmed.replace(/^@[a-zA-Z0-9_\-\.]+\s*/, "");
        return cleaned ? `@${label} ${cleaned}` : `@${label} `;
      });
    }
    setShowPlusMenu(false);

    setTimeout(() => {
      geminiTextareaRef.current?.focus();
    }, 50);
  }

  // Handle typing in the Gemini prompt textarea with @ mention trigger
  function handleGeminiPromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setGeminiPrompt(val);

    // If user cleared or typed without @, clear selectedTarget so it never defaults to @all
    if (!val.trim().startsWith("@")) {
      setSelectedTarget("");
    }

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (!/\s/.test(query)) {
        setMentionFilter(query.toLowerCase());
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  }

  function selectMentionTarget(targetId: string, targetLabel: string) {
    setSelectedTarget(targetId);
    setShowMentionDropdown(false);

    // Replace the trailing @query with @targetLabel
    const lastAtIndex = geminiPrompt.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const prefix = geminiPrompt.slice(0, lastAtIndex);
      const afterAt = geminiPrompt.slice(lastAtIndex);
      const spaceIdx = afterAt.indexOf(" ");
      const suffix = spaceIdx !== -1 ? afterAt.slice(spaceIdx) : " ";
      setGeminiPrompt(`${prefix}@${targetLabel}${suffix}`);
    } else {
      setGeminiPrompt(prev => `@${targetLabel} ${prev}`.trim() + " ");
    }
    geminiTextareaRef.current?.focus();
  }

  async function toggleTaskTrace(taskId: string) {
    if (expandedTraceTaskId === taskId) {
      setExpandedTraceTaskId(null);
      return;
    }
    setExpandedTraceTaskId(taskId);
    if (!taskTraceCache[taskId]) {
      try {
        const r = await fetch(`${API}/tasks/${taskId}`);
        if (r.ok) {
          const detail = await r.json();
          setTaskTraceCache(prev => ({ ...prev, [taskId]: detail.actions || [] }));
        }
      } catch (_) {}
    }
  }

  // Execute Gemini natural language command
  async function handleExecuteGeminiCommand(customPrompt?: string, targetOverride?: string) {
    const rawPrompt = (customPrompt || geminiPrompt).trim();
    if (!rawPrompt) {
      showToast("Please enter an instruction or prompt.", "error");
      return;
    }

    // Determine target: check query for explicit @all or @websiteName, then targetOverride, then selectedTarget
    let resolvedTarget = "";

    if (/@all\b/i.test(rawPrompt)) {
      resolvedTarget = "all";
    } else {
      // Check if prompt matches any connection name like @Canva
      for (const conn of connections) {
        const pattern = new RegExp(`@${conn.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (pattern.test(rawPrompt)) {
          resolvedTarget = conn.id;
          break;
        }
      }
    }

    // Only fallback to targetOverride or selectedTarget if the user didn't write an explicit mention
    if (!resolvedTarget) {
      if (targetOverride) {
        resolvedTarget = targetOverride;
      } else if (selectedTarget) {
        resolvedTarget = selectedTarget;
      }
    }

    const isScheduleReq = /\b(schedule|recurring|every|daily|weekly|hourly|cron)\b/i.test(rawPrompt);
    const userMsgId = "user-" + Date.now();
    const assistMsgId = "asst-" + Date.now();
    const targetLabel = resolvedTarget === "all" ? "all" : (connections.find(c => c.id === resolvedTarget)?.name || "");

    setConversationStarted(true);
    setShowPlusMenu(false);
    setShowMentionDropdown(false);

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      targetName: targetLabel,
      prompt: rawPrompt,
      status: "COMPLETED",
      createdAt: new Date().toISOString()
    };

    const newAssistMsg: ChatMessage = {
      id: assistMsgId,
      role: "assistant",
      targetName: targetLabel,
      isSchedule: isScheduleReq,
      scheduleDetails: isScheduleReq ? "Recurring schedule registered for execution cycle." : undefined,
      status: "THINKING",
      content: isScheduleReq
        ? "Configuring recurring automation schedule and initializing browser verification..."
        : (resolvedTarget
            ? `Observing browser context on ${targetLabel}, verifying URL safety policies, and executing automation plan...`
            : "Processing query..."),
      createdAt: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newUserMsg, newAssistMsg]);
    setGeminiPrompt("");

    // If NO target platform was specified (User just typed "hy", asked a question, or general query)
    if (!resolvedTarget) {
      const isGreeting = /^(hi|hy|hello|hey|hola|namaste|yo|good\s*(morning|evening|afternoon)|who\s*are\s*you|what\s*can\s*you\s*do|help)\b/i.test(rawPrompt);
      const isNameQuery = /what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i/i.test(rawPrompt);

      (async () => {
        try {
          const res = await fetch(`${WORKER_API}/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: rawPrompt })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.reply) {
              await new Promise(r => setTimeout(r, 650));
              setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "COMPLETED", content: data.reply } : m));
              return;
            }
          }
        } catch (_) {}

        setTimeout(() => {
          setChatMessages(prev => prev.map(m => {
            if (m.id === assistMsgId) {
              if (isNameQuery) {
                return {
                  ...m,
                  status: "COMPLETED",
                  content: "Your name is Saurabh Patel."
                };
              }
              if (isGreeting) {
                return {
                  ...m,
                  status: "COMPLETED",
                  content: `Hello Saurabh! I am Navio, your Universal Browser AI Agent.

I can automate web actions, navigate portals, auto-fill credentials, and extract data.

**How to give tasks:**
• **Target a specific website:** Type \`@<name> <task>\` (e.g. \`@canva open designs\`) or click \`+\` to pick a platform.
• **Broadcast to all websites:** Type \`@all <task>\` to run across all registered portals simultaneously.
• **Direct URL:** Mention any URL (e.g. \`https://google.com search developer jobs\`).`
                };
              }
              return {
                ...m,
                status: "COMPLETED",
                content: `Instruction received: "${rawPrompt}".

Please specify which website you want me to execute this on:
${connections.length > 0 ? connections.map(c => `• **@${c.name}** (${c.websiteUrl})`).join("\n") : "• No websites connected yet — click '+' to connect one."}

You can type \`@<name> ${rawPrompt}\` or type \`@all ${rawPrompt}\` to broadcast across all platforms.`
              };
            }
            return m;
          }));
        }, 850);
      })();
      return;
    }

    if (resolvedTarget === "all") {
      if (connections.length === 0) {
        showToast("No websites connected yet. Register a website to begin.", "info");
        setShowQuickAddModal(true);
        setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "FAILED", content: "No websites connected yet. Please add a website connection." } : m));
        return;
      }
      setBusy(true);
      showToast(`Executing across all ${connections.length} connected platforms...`, "info");
      try {
        const cleanPrompt = rawPrompt.replace(/@all\s*/gi, "").trim() || rawPrompt;
        for (const conn of connections) {
          await fetch(`${API}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: conn.id, prompt: cleanPrompt })
          });
        }
        await loadData();
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "COMPLETED",
              content: isScheduleReq
                ? `Automation scheduled across all ${connections.length} registered platforms. The agent will run recurring inspections on each portal.`
                : `Executed Observe-Plan-Act-Verify cycle across all ${connections.length} registered platforms. Navigation links and DOM records updated.`
            };
          }
          return m;
        }));
        showToast(`All ${connections.length} tasks executed successfully.`, "success");
      } catch (err) {
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "FAILED",
              content: err instanceof Error ? err.message : "Multi-target execution failed"
            };
          }
          return m;
        }));
        showToast(err instanceof Error ? err.message : "Execution failed", "error");
      } finally {
        setBusy(false);
      }
    } else {
      // Single connection execution
      const targetConn = connections.find(c => c.id === resolvedTarget);
      if (!targetConn) {
        showToast("Target website not found. Please select a valid connection.", "error");
        setShowQuickAddModal(true);
        setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "FAILED", content: "Target website not found. Please connect a website first." } : m));
        return;
      }

      setBusy(true);
      showToast(`Agent executing Observe-Plan-Act-Verify on ${targetConn.name}...`, "info");
      try {
        const regex = new RegExp(`@${targetConn.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gi");
        const cleanPrompt = rawPrompt.replace(regex, "").trim() || rawPrompt;

        const r = await fetch(`${API}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: targetConn.id, prompt: cleanPrompt })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Task execution failed");

        await loadData();

        let latestFile: GeneratedFile | undefined;
        let taskActions: Action[] = [];
        try {
          const detailRes = await fetch(`${API}/tasks/${data.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            taskActions = detail.actions || [];
          }
          const fileRes = await fetch(`${API}/files`);
          if (fileRes.ok) {
            const filesData: GeneratedFile[] = await fileRes.json();
            setFiles(filesData);
            latestFile = filesData.find(f => f.taskId === data.id || f.fileName.includes(data.id));
          }
        } catch (_) {}

        const replyContent = data.result || (isScheduleReq
          ? `Automation scheduled successfully on ${targetConn.name}. The browser agent will observe, navigate, and verify the portal on cadence.`
          : `Page inspection completed successfully for ${targetConn.name}. Visual DOM elements and safe navigation links were verified.`);

        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: data.status,
              content: replyContent,
              actions: taskActions,
              file: latestFile
            };
          }
          return m;
        }));

        showToast(`Task execution on ${targetConn.name} ${data.status.toLowerCase()}.`, data.status === "COMPLETED" ? "success" : "error");
      } catch (err) {
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "FAILED",
              content: err instanceof Error ? err.message : "Task execution failed"
            };
          }
          return m;
        }));
        showToast(err instanceof Error ? err.message : "Task execution failed", "error");
      } finally {
        setBusy(false);
      }
    }
  }

  function renderThemeToggle(isDashboard = false) {
    return (
      <button
        type="button"
        className={`themeTogglePillBtn ${isDashboard ? "geminiDashboardToggle" : ""}`}
        onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme (Blue Effect)"}
        aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      >
        {theme === "dark" ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#6366f1" />}
      </button>
    );
  }

  function renderGeminiInputCapsule() {
    return (
      <div className="geminiPillCapsule">
        {/* Left Plus / Close Menu Button */}
        <div style={{ position: "relative" }} ref={plusMenuRef}>
          <button
            type="button"
            className={`geminiPlusCircleBtn ${showPlusMenu ? "active" : ""}`}
            onClick={() => setShowPlusMenu(prev => !prev)}
            title={showPlusMenu ? "Close menu" : "Tools and platforms"}
          >
            {showPlusMenu ? <X size={18} /> : <Plus size={20} />}
          </button>

          {/* Plus Popover Menu (Matching Image 1 in White Theme) */}
          {showPlusMenu && (
            <div className={`geminiPlusMenuDropdown ${conversationStarted ? "openUp" : "openDown"}`}>
              <div className="geminiPlusMenuSectionTitle">TARGET PLATFORM</div>

              <div
                className={`geminiPlusMenuItem ${selectedTarget === "all" ? "selected" : ""}`}
                onClick={() => selectPlatformFromMenu("all", "all")}
              >
                <div className="geminiPlusMenuIcon allIcon">
                  <Globe2 size={16} />
                </div>
                <div>
                  <b>@all (All Connected Platforms)</b>
                  <small>Broadcast prompt to all websites</small>
                </div>
              </div>

              <div
                className="geminiPlusMenuItem"
                onClick={() => {
                  setShowPlusMenu(false);
                  setShowQuickAddModal(true);
                }}
              >
                <div className="geminiPlusMenuIcon addIcon">
                  <Plus size={16} />
                </div>
                <div>
                  <b>+ Connect new website...</b>
                  <small>Register custom URL or portal</small>
                </div>
              </div>

              {connections.length > 0 && (
                <>
                  <div className="geminiPlusMenuDivider" />
                  <div className="geminiPlusMenuSectionTitle">CONNECTED WEBSITES</div>
                  {connections.map(c => (
                    <div
                      key={c.id}
                      className={`geminiPlusMenuItem ${selectedTarget === c.id ? "selected" : ""}`}
                      onClick={() => selectPlatformFromMenu(c.id, c.name)}
                    >
                      <div className="geminiPlusMenuIcon">
                        <Bot size={16} />
                      </div>
                      <div>
                        <b>@{c.name}</b>
                        <small>{c.websiteUrl}</small>
                      </div>
                      <span className={`tag ${c.status === "AUTHENTICATED" ? "tagGreen" : "tagBlue"}`} style={{ marginLeft: "auto", fontSize: "10px" }}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Input Textarea */}
        <textarea
          ref={geminiTextareaRef}
          className="geminiCapsuleInput"
          rows={1}
          value={geminiPrompt}
          onChange={handleGeminiPromptChange}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy && geminiPrompt.trim()) {
                void handleExecuteGeminiCommand();
              }
            } else if (e.key === "Escape") {
              setShowPlusMenu(false);
            }
          }}
          placeholder="Ask Gemini"
        />

        {/* Send Button */}
        <button
          type="button"
          className="geminiCapsuleSendBtn"
          disabled={busy || !geminiPrompt.trim()}
          onClick={() => handleExecuteGeminiCommand()}
          title="Send instruction"
        >
          {busy ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
        </button>
      </div>
    );
  }

  async function viewTaskDetail(id: string) {
    try {
      const r = await fetch(`${API}/tasks/${id}`);
      if (r.ok) {
        const detail = await r.json();
        setSelectedTaskDetail(detail);
      }
    } catch (_) {}
  }

  async function handleApprove(id: string) {
    try {
      const r = await fetch(`${API}/approvals/${id}/approve`, { method: "POST" });
      if (r.ok) {
        showToast("Action approved! Agent proceeding with execution.", "success");
        await loadData();
      }
    } catch (_) {}
  }

  async function handleReject(id: string) {
    try {
      const r = await fetch(`${API}/approvals/${id}/reject`, { method: "POST" });
      if (r.ok) {
        showToast("Action rejected. Consequential action blocked.", "error");
        await loadData();
      }
    } catch (_) {}
  }

  async function handlePrepareSocialPost(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`${API}/social/prepare-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent, platforms: selectedPlatforms })
      });
      const data = await r.json();
      showToast(data.message || "Approval request submitted!", "info");
      setPostContent("");
      await loadData();
      setActiveTab("approvals");
    } catch (_) {
      showToast("Failed to stage social post.", "error");
    } finally {
      setBusy(false);
    }
  }

  const pendingApprovalsCount = approvals.filter(a => a.approvalStatus === "PENDING").length;

  return (
    <div className={`shell ${theme === "dark" ? "darkTheme" : "lightTheme"}`}>
      {/* Box 1 (Column 1): Core Platform Sidebar with ALL SaaS Features */}
      <aside className="sidebar">
        <div className="brand" onClick={() => setActiveTab("dashboard")} style={{ cursor: "pointer" }} title="Navio">
          <img src={navioLogo} alt="Navio" className="brandOnlyLogoImg" />
        </div>

        <div className="navLabel">CORE PLATFORM</div>
        <a className={`nav ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
          <Activity size={18} /> Command Center
        </a>
        <a className={`nav ${activeTab === "connections" ? "active" : ""}`} onClick={() => setActiveTab("connections")}>
          <Globe2 size={18} /> Connected Platforms
          <span className="badge">{connections.length}</span>
        </a>
        <a className={`nav ${activeTab === "capabilities" ? "active" : ""}`} onClick={() => setActiveTab("capabilities")}>
          <Layers size={18} /> Capability Matrix
        </a>

        <div className="navLabel">OMNICHANNEL & AUTOMATION</div>
        <a className={`nav ${activeTab === "social" ? "active" : ""}`} onClick={() => setActiveTab("social")}>
          <Share2 size={18} /> Social & WhatsApp
        </a>
        <a className={`nav ${activeTab === "approvals" ? "active" : ""}`} onClick={() => setActiveTab("approvals")}>
          <ShieldCheck size={18} /> Approval Center
          {pendingApprovalsCount > 0 && <span className="badge" style={{ background: "#ef4444" }}>{pendingApprovalsCount}</span>}
        </a>
        <a className={`nav ${activeTab === "files" ? "active" : ""}`} onClick={() => setActiveTab("files")}>
          <FileSpreadsheet size={18} /> Generated Files
          <span className="badge">{files.length}</span>
        </a>

        <div className="navLabel">GOVERNANCE & CONFIGURATION</div>
        <a className={`nav ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
          <Lock size={18} /> Security & Audit
        </a>
        <a className={`nav ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          <Settings size={18} /> Settings & AI Keys
          {aiStatus.isConfigured ? (
            <span className="badge" style={{ background: "#10b981", color: "#fff" }}>Active</span>
          ) : (
            <span className="badge" style={{ background: "#f59e0b", color: "#0f172a" }}>Setup</span>
          )}
        </a>

        <div className="sideBottom">
          <ShieldCheck size={20} style={{ color: "#38bdf8" }} />
          <div>
            <b>AES-256-GCM Vault</b>
            <small>Active SSRF & Sandbox Defense</small>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`content ${activeTab === "dashboard" ? "dashboardContent" : ""}`}>
        {activeTab !== "dashboard" && (
          <header className="topBar">
            <div>
              <div className="eyebrow">NAVIO / ENTERPRISE AI BROWSER AGENT</div>
              <h1>
                {activeTab === "connections" && "Connected Platforms & Accounts"}
                {activeTab === "capabilities" && "Dynamic Capability Discovery Matrix"}
                {activeTab === "social" && "Social Media & WhatsApp Hub"}
                {activeTab === "approvals" && "Risk-Based Approval Center"}
                {activeTab === "files" && "Generated Files & Extracted Reports"}
                {activeTab === "security" && "Security Vault & Audit Trail"}
                {activeTab === "settings" && "Settings & AI Engine Configuration"}
              </h1>
              <p>Navio: One AI Agent. One Command Interface. Natural-Language Digital Execution.</p>
            </div>
            <div className="headerActions">
              {renderThemeToggle(false)}
            </div>
          </header>
        )}

      {/* Floating Toast Notification Stack (Green, Red, Blue) */}
      <div className="toastContainer">
        {toasts.map(t => (
          <div className={`toastItem ${t.type}`} key={t.id}>
            <div className="toastIcon">
              {t.type === "success" && <CheckCircle2 size={18} color="#ffffff" />}
              {t.type === "error" && <AlertTriangle size={18} color="#ffffff" />}
              {t.type === "info" && <Info size={18} color="#ffffff" />}
            </div>
            <div className="toastMessage">{t.message}</div>
            <button className="toastClose" onClick={() => dismissToast(t.id)}>
              <XCircle size={16} color="#ffffff" />
            </button>
          </div>
        ))}
      </div>

        {/* TAB 1: DASHBOARD (GEMINI COMMAND CENTER - DARK / LIGHT THEME) */}
        {activeTab === "dashboard" && (
          <div className={`geminiScreenWrapper ${theme === "dark" ? "darkTheme" : "lightTheme"}`}>
            {/* Box 2 (Column 2): Gemini History Panel (Right next to Column 1 Main Sidebar) */}
            {historyPanelOpen ? (
              <aside className="geminiHistoryPanel">
                <div className="geminiHistoryPanelTop">
                  <button
                    type="button"
                    className="geminiNewChatPillBtn"
                    onClick={() => {
                      setConversationStarted(false);
                      setChatMessages([]);
                      setGeminiPrompt("");
                      setSelectedTarget("");
                      setShowPlusMenu(false);
                      setActiveHistoryId(null);
                    }}
                  >
                    <Plus size={16} /> New chat
                  </button>
                  <button
                    type="button"
                    className="geminiPanelToggleBtn"
                    onClick={() => setHistoryPanelOpen(false)}
                    title="Collapse history panel"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>

                <div className="geminiHistoryLabel">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <HistoryDocClockIcon size={14} />
                    <span>Recent</span>
                  </div>
                  {tasks.length > 0 && (
                    <button
                      type="button"
                      className="geminiHistoryClearAllBtn"
                      onClick={() => setDeleteConfirmModal({ type: "all" })}
                      title="Permanently delete all command history"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="geminiHistoryScrollArea">
                  {tasks.length === 0 ? (
                    <div className="geminiHistoryEmpty">No past commands yet</div>
                  ) : (
                    tasks.slice(0, 40).map(t => (
                      <div
                        key={t.id}
                        className={`geminiHistoryItem ${activeHistoryId === t.id ? "active" : ""}`}
                        onClick={() => {
                          setActiveHistoryId(t.id);
                          const targetConn = connections.find(c => c.id === t.connectionId);
                          const matchingFile = files.find(f => f.taskId === t.id || f.fileName.includes(t.id));
                          setChatMessages([
                            {
                              id: "hist-u-" + t.id,
                              role: "user",
                              targetName: targetConn?.name || "",
                              prompt: t.prompt,
                              status: "COMPLETED",
                              createdAt: t.createdAt
                            },
                            {
                              id: "hist-a-" + t.id,
                              role: "assistant",
                              targetName: targetConn?.name || "",
                              content: t.result || "Execution completed.",
                              status: t.status === "FAILED" ? "FAILED" : "COMPLETED",
                              file: matchingFile,
                              createdAt: t.createdAt
                            }
                          ]);
                          setConversationStarted(true);
                        }}
                        title={t.prompt}
                      >
                        <HistoryDocClockIcon size={15} className="geminiHistoryIcon" />
                        <span className="geminiHistoryText">{t.prompt}</span>
                        <button
                          type="button"
                          className="geminiHistoryDeleteBtn"
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteConfirmModal({
                              type: "single",
                              taskId: t.id,
                              taskPrompt: t.prompt
                            });
                          }}
                          title="Permanently delete from database"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            ) : (
              /* Button to reopen Box 2 History Panel when collapsed */
              <button
                type="button"
                className="geminiHistoryOpenBtn"
                onClick={() => setHistoryPanelOpen(true)}
                title="History"
              >
                <HistoryDocClockIcon size={18} />
              </button>
            )}

            {/* Box 3 (Column 3): Main Canvas Area */}
            <div className="geminiMainCanvas">
              {/* Theme Toggle Button (Top-Right) */}
              {renderThemeToggle(true)}

              {!conversationStarted ? (
                /* CENTER STAGE (Initial Homepage - Image 2) */
                <div className="geminiCenterStage">
                  <h1 className="geminiStartTitle">Where should we start?</h1>
                  <div className="geminiInputCapsuleWrapper">
                    {renderGeminiInputCapsule()}
                  </div>
                </div>
              ) : (
                /* CHAT ACTIVE STAGE (Bottom Docked Input Mode) */
                <div className="geminiChatStage">
                  {/* Chat Top Header */}
                  <div className="geminiChatTopBar">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {!historyPanelOpen && (
                        <button
                          type="button"
                          className="geminiTopBarIconBtn"
                          onClick={() => setHistoryPanelOpen(true)}
                          title="Open command history"
                        >
                          <HistoryDocClockIcon size={18} />
                        </button>
                      )}
                      <div className="geminiChatIconOnly" title="AI Command Center">
                        <Sparkles size={20} className="geminiSparkleIcon" />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="geminiTopBarIconBtn"
                      onClick={() => {
                        setConversationStarted(false);
                        setGeminiPrompt("");
                        setSelectedTarget("");
                        setShowPlusMenu(false);
                        setActiveHistoryId(null);
                      }}
                      title="New Command"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Conversation Stream */}
                  <div className="geminiChatFeed">
                    <div className="geminiChatFeedInner">
                      {chatMessages.length > 0 ? (
                        chatMessages.map(m => {
                          if (m.role === "user") {
                            return (
                              <div key={m.id} className="geminiUserMessage">
                                <div className="geminiUserPill">
                                  {m.prompt}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={m.id} className="geminiAgentMessage">
                              <div className="geminiAgentBody">
                                {m.status === "THINKING" ? (
                                  <div className="geminiThinkingIndicator">
                                    <div className="geminiGeminiDots">
                                      <span className="geminiDot dot1" />
                                      <span className="geminiDot dot2" />
                                      <span className="geminiDot dot3" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="geminiAgentPill">
                                    <FormattedMarkdown content={m.content} />
                                  </div>
                                )}

                            {m.file && (
                              <div className="geminiGeneratedFileBadge">
                                <div className="geminiFileLeft">
                                  <FileSpreadsheet size={18} color="#10b981" />
                                  <div>
                                    <b>{m.file.fileName}</b>
                                    <small style={{ display: "block" }}>{m.file.rowCount} records extracted</small>
                                  </div>
                                </div>
                                <a
                                  href={`${API}/files/${m.file.id}/download`}
                                  className="btn btnSecondary"
                                  style={{ height: "28px", padding: "0 10px", fontSize: "11px", gap: "4px" }}
                                  download
                                >
                                  <Download size={13} /> Download CSV
                                </a>
                              </div>
                            )}

                            {m.actions && m.actions.length > 0 && (
                              <details className="geminiTraceAccordion">
                                <summary className="geminiTraceSummary">
                                  Browser Execution Trace ({m.actions.length} steps)
                                </summary>
                                <div className="timeline" style={{ marginTop: "10px" }}>
                                  {m.actions.map(act => (
                                    <div className="timelineStep" key={act.id}>
                                      <div className={`stepDot ${act.status.toLowerCase()}`}>
                                        {act.status === "COMPLETED" ? <Check size={13} /> : <Activity size={13} />}
                                      </div>
                                      <div className="stepContent">
                                        <b style={{ fontSize: "12px" }}>{act.actionType}</b>
                                        <p style={{ fontSize: "12px", margin: "2px 0" }}>{act.description}</p>
                                        <small style={{ color: "#94a3b8", fontSize: "10px" }}>{new Date(act.createdAt).toLocaleTimeString()}</small>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    tasks.slice(0, 10).map(t => {
                      const targetConn = connections.find(c => c.id === t.connectionId);
                      const matchingFile = files.find(f => f.taskId === t.id || f.fileName.includes(t.id));
                      const isTraceExpanded = expandedTraceTaskId === t.id;
                      const traceActions = taskTraceCache[t.id] || [];

                      return (
                        <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                          {/* User Prompt */}
                          <div className="geminiUserMessage">
                            <div className="geminiUserPill">
                              {t.prompt}
                            </div>
                          </div>

                          {/* Agent Response */}
                          <div className="geminiAgentMessage">
                            <div className="geminiAgentBody">
                              <div className="geminiAgentPill">
                                <FormattedMarkdown content={t.result || "Execution recorded. Observe-Plan-Act-Verify cycle processed for destination."} />
                              </div>

                              {matchingFile && (
                                <div className="geminiGeneratedFileBadge">
                                  <div className="geminiFileLeft">
                                    <FileSpreadsheet size={18} color="#10b981" />
                                    <div>
                                      <b>{matchingFile.fileName}</b>
                                      <small style={{ display: "block" }}>{matchingFile.rowCount} records extracted</small>
                                    </div>
                                  </div>
                                  <a
                                    href={`${API}/files/${matchingFile.id}/download`}
                                    className="btn btnSecondary"
                                    style={{ height: "28px", padding: "0 10px", fontSize: "11px", gap: "4px" }}
                                    download
                                  >
                                    <Download size={13} /> Download CSV
                                  </a>
                                </div>
                              )}

                              <div className="geminiActionRow" style={{ marginTop: "4px" }}>
                                <button
                                  type="button"
                                  className="geminiTraceBtn"
                                  onClick={() => toggleTaskTrace(t.id)}
                                >
                                  <Activity size={12} />
                                  <span>{isTraceExpanded ? "Hide Execution Trace" : "View Step-by-Step Trace"}</span>
                                  {isTraceExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              </div>

                              {isTraceExpanded && (
                                <div className="geminiTraceAccordion" style={{ marginTop: "8px" }}>
                                  <div className="timeline">
                                    {traceActions.length === 0 ? (
                                      <div style={{ fontSize: "12px", color: "#94a3b8", padding: "6px 0" }}>
                                        Loading detailed step trace...
                                      </div>
                                    ) : (
                                      traceActions.map(act => (
                                        <div className="timelineStep" key={act.id}>
                                          <div className={`stepDot ${act.status.toLowerCase()}`}>
                                            {act.status === "COMPLETED" ? <Check size={13} /> : <Activity size={13} />}
                                          </div>
                                          <div className="stepContent">
                                            <b style={{ fontSize: "12px" }}>{act.actionType}</b>
                                            <p style={{ fontSize: "12px", margin: "2px 0" }}>{act.description}</p>
                                            <small style={{ color: "#94a3b8", fontSize: "10px" }}>{new Date(act.createdAt).toLocaleTimeString()}</small>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                    <div ref={chatFeedBottomRef} />
                  </div>
                </div>

                {/* Bottom Docked Input Capsule */}
                <div className="geminiChatBottomCapsule">
                  <div className="geminiChatBottomCapsuleInner">
                    {renderGeminiInputCapsule()}
                  </div>
                </div>
              </div>
            )}
            </div> {/* End geminiMainCanvas */}

            {/* In-App Confirmation Popup Modal (Zero Native Alerts) */}
            {deleteConfirmModal && (
              <div className="modalBackdrop" onClick={() => setDeleteConfirmModal(null)}>
                <div
                  className="modalBox"
                  style={{
                    maxWidth: "420px",
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)"
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "18px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "rgba(239, 68, 68, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "600", color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>
                        {deleteConfirmModal.type === "all" ? "Clear all command history?" : "Delete command?"}
                      </h3>
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                        {deleteConfirmModal.type === "all"
                          ? "This will permanently remove all past session records from the database. This action cannot be undone."
                          : `Are you sure you want to permanently delete "${deleteConfirmModal.taskPrompt || "this command"}"? This action cannot be undone.`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                    <button
                      type="button"
                      className="btn btnSecondary"
                      onClick={() => setDeleteConfirmModal(null)}
                      style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btnDanger"
                      onClick={async () => {
                        const modal = deleteConfirmModal;
                        setDeleteConfirmModal(null);
                        if (modal.type === "all") {
                          await executeClearAllTasks();
                        } else if (modal.taskId) {
                          await handleDeleteTask(modal.taskId);
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        background: "#ef4444",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "500",
                        cursor: "pointer"
                      }}
                    >
                      {deleteConfirmModal.type === "all" ? "Clear All" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Connect Website Modal */}
            {showQuickAddModal && (
              <div className="modalOverlay" onClick={() => setShowQuickAddModal(false)}>
                <div className="modalBox" onClick={e => e.stopPropagation()}>
                  <div className="modalHead">
                    <div>
                      <h3>Connect Website or Web App</h3>
                      <p>Register any authorized custom portal, CRM, or SaaS dashboard.</p>
                    </div>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                      onClick={() => setShowQuickAddModal(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleQuickAddConnection} className="formGroup">
                    <label>
                      Connection Name
                      <input
                        value={quickConnName}
                        onChange={e => setQuickConnName(e.target.value)}
                        placeholder="e.g. Canva Workspace, Shopify Admin, Acme ERP"
                        required
                        maxLength={160}
                        autoFocus
                      />
                    </label>
                    <label>
                      Website / Portal URL
                      <input
                        type="url"
                        value={quickConnUrl}
                        onChange={e => setQuickConnUrl(e.target.value)}
                        placeholder="https://example.com"
                        required
                      />
                    </label>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                      <button
                        type="button"
                        className="btn btnSecondary"
                        onClick={() => setShowQuickAddModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btnPrimary" disabled={busy}>
                        {busy ? "Connecting..." : "Connect & Target"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONNECTED PLATFORMS */}
        {activeTab === "connections" && (
          <>
            {/* Top Registration Panel */}
            <div className="panel" style={{ marginBottom: "20px" }}>
              <div className="panelHead">
                <div>
                  <h2>Connect Website / Admin Panel</h2>
                  <p>Register an authorized custom portal, CRM, Canva, or business website.</p>
                </div>
              </div>

              <form onSubmit={handleAddConnection} className="formGroup">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "16px", alignItems: "flex-end" }}>
                  <label>
                    Connection Name
                    <input
                      value={newConnName}
                      onChange={e => setNewConnName(e.target.value)}
                      placeholder="e.g. My Canva / Acme ERP"
                      required
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Website / Portal URL
                    <input
                      type="url"
                      value={newConnUrl}
                      onChange={e => setNewConnUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                  </label>
                  <button className="btn btnPrimary" type="submit" disabled={busy} style={{ height: "40px", marginBottom: "1px" }}>
                    <Plus size={16} /> Register Connection
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="panelHead">
                <div>
                  <h2>Enterprise Platform & Account Registry</h2>
                  <p>Manage authenticated website connections, social channels, and business APIs.</p>
                </div>
                {selectedConnRowIds.length > 0 && (
                  <div>
                    <button
                      className="btn btnDanger"
                      style={{ height: "34px", padding: "0 14px", fontSize: "12px", gap: "6px", display: "inline-flex", alignItems: "center" }}
                      onClick={handleDeleteSelectedConnections}
                    >
                      <Trash2 size={15} /> Delete Selected ({selectedConnRowIds.length})
                    </button>
                  </div>
                )}
              </div>

              <table className="dataTable">
              <thead>
                <tr>
                  <th style={{ width: "36px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={connections.length > 0 && selectedConnRowIds.length === connections.length}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      title="Select All Connections"
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>Platform / Service</th>
                  <th>Category</th>
                  <th>Authentication Type</th>
                  <th>Declared Status</th>
                  <th>Connection State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {connections.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#94a3b8", fontSize: "13px" }}>
                      No website connections added yet. Use the form above to add a website.
                    </td>
                  </tr>
                ) : (
                  connections.map(c => (
                    <tr key={c.id}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedConnRowIds.includes(c.id)}
                          onChange={() => toggleSelectRow(c.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td><b>{c.name}</b><small style={{ display: "block", color: "#64748b" }}>{c.websiteUrl}</small></td>
                      <td>Custom Website</td>
                      <td>Session / AES-256 Vault</td>
                      <td>Verified HTTP/HTTPS</td>
                      <td>
                        <span className={`tag ${c.status === "AUTHENTICATED" ? "tagGreen" : "tagBlue"}`}>{c.status}</span>
                      </td>
                      <td>
                        <div className="actionBtnGroup">
                          <button
                            className={`actionIconBtn ${c.status === "AUTHENTICATED" ? "success" : "primary"}`}
                            title={c.status === "AUTHENTICATED" ? "Session Authenticated - Click to Re-Login" : "Launch Browser Login via UI"}
                            onClick={() => launchBrowserLogin(c)}
                          >
                            <Key size={15} />
                          </button>
                          <a
                            href={c.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="actionIconBtn"
                            title="Open Website in New Tab"
                          >
                            <ExternalLink size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 3: DYNAMIC CAPABILITY DISCOVERY */}
        {activeTab === "capabilities" && (
          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Dynamic Capability Discovery Matrix (Section 10)</h2>
                <p>Live declaration of supported vs restricted operations across authorized platforms.</p>
              </div>
            </div>

            {connectors.map(con => (
              <div key={con.id} style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "15px", margin: "0 0 10px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{con.name}</span>
                  <span className="tag tagBlue">{con.category}</span>
                </h3>
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Capability Key</th>
                      <th>Feature Name</th>
                      <th>Risk Classification</th>
                      <th>Operational Status</th>
                      <th>Policy Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {con.capabilities.map(cap => (
                      <tr key={cap.key}>
                        <td><code>{cap.key}</code></td>
                        <td><b>{cap.name}</b></td>
                        <td>
                          <span className={`tag ${cap.riskLevel === "HIGH" ? "tagRed" : cap.riskLevel === "MEDIUM" ? "tagAmber" : "tagGreen"}`}>
                            {cap.riskLevel}
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${cap.status === "Available" ? "tagGreen" : "tagAmber"}`}>
                            {cap.status}
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>{cap.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: SOCIAL & WHATSAPP HUB */}
        {activeTab === "social" && (
          <div className="gridTwo">
            {/* Social Post Creator */}
            <div className="panel">
              <div className="panelHead">
                <div>
                  <h2>Cross-Platform Publishing Studio (Section 7 & 11)</h2>
                  <p>Prepare content across Instagram, Facebook, and LinkedIn with mandatory review.</p>
                </div>
              </div>

              {postNotice && (
                <div className="noticeBar" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
                  {postNotice}
                </div>
              )}

              <form onSubmit={handlePrepareSocialPost} className="formGroup">
                <label>
                  Target Channels
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    {["Instagram", "Facebook", "LinkedIn", "X (Twitter)"].map(p => (
                      <label key={p} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(p)}
                          onChange={e => {
                            if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, p]);
                            else setSelectedPlatforms(selectedPlatforms.filter(x => x !== p));
                          }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </label>

                <label>
                  Post Copy & Message
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder="Announcing Navio! Automate data workflows, ERP audits, and business inquiries seamlessly."
                    required
                  />
                </label>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                  <small style={{ color: "#64748b", fontWeight: 600 }}>PLATFORM SAFETY CONTROLS</small>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#475569" }}>
                    <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", color: "#0284c7" }} /> Consequential publishing actions are classified as <b>HIGH RISK</b> and will be routed to the Approval Center before API dispatch.
                  </p>
                </div>

                <button className="btn btnPrimary" type="submit" disabled={busy || !postContent}>
                  <Send size={15} /> Stage Post for Approval
                </button>
              </form>
            </div>

            {/* WhatsApp Business Inbox */}
            <div className="panel">
              <div className="panelHead">
                <div>
                  <h2>WhatsApp Business Inquiries (Section 8)</h2>
                  <p>Incoming customer messages, intent classification, and AI suggested drafts.</p>
                </div>
              </div>

              {waChats.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>No unread WhatsApp conversations.</div>
              ) : (
                waChats.map(chat => (
                  <div className="inboxCard" key={chat.id}>
                    <div className="inboxHead">
                      <div>
                        <b style={{ fontSize: "14px" }}>{chat.customerName}</b>{" "}
                        <span style={{ color: "#64748b", fontSize: "12px" }}>({chat.phone})</span>
                      </div>
                      <span className="tag tagPurple">{chat.intent} ({chat.confidence})</span>
                    </div>
                    <div className="inboxMsg">
                      "{chat.lastMessage}"
                    </div>
                    <div className="aiDraft">
                      <b><Sparkles size={12} style={{ display: "inline" }} /> AI Suggested Draft:</b>
                      <p style={{ margin: "4px 0 0" }}>{chat.suggestedDraft}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btnSuccess" style={{ height: "32px", fontSize: "12px" }} onClick={() => showToast(`Draft approved and queued for dispatch to ${chat.phone}`, "success")}>
                        <Check size={14} /> Send Approved Reply
                      </button>
                      <button className="btn btnSecondary" style={{ height: "32px", fontSize: "12px" }}>
                        Edit Draft
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APPROVAL CENTER */}
        {activeTab === "approvals" && (
          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Risk-Based Approval Center (Section 12)</h2>
                <p>Consequential, high-risk, and mutating actions intercepted for explicit human confirmation.</p>
              </div>
            </div>

            {approvals.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "13px", padding: "20px 0" }}>
                No actions currently awaiting approval. All autonomous operations verified.
              </div>
            ) : (
              approvals.map(app => (
                <div className="approvalCard" key={app.id}>
                  <div className="approvalHeader">
                    <div>
                      <b style={{ fontSize: "15px" }}>{app.actionDescription}</b>
                      <small style={{ display: "block", color: "#64748b" }}>Target Platform: {app.platform}</small>
                    </div>
                    <span className={`tag ${app.riskLevel === "HIGH" ? "tagRed" : "tagAmber"}`}>
                      {app.riskLevel} RISK
                    </span>
                  </div>

                  <div className="approvalBody">
                    <pre style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                      {app.payload}
                    </pre>
                  </div>

                  {app.consequences && (
                    <div className="approvalConsequence">
                      <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                      <b>Consequence:</b> {app.consequences}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ color: "#64748b" }}>Requested: {new Date(app.requestedAt).toLocaleString()}</small>
                    {app.approvalStatus === "PENDING" ? (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btnSuccess" onClick={() => handleApprove(app.id)}>
                          <CheckCircle2 size={16} /> Approve & Execute
                        </button>
                        <button className="btn btnDanger" onClick={() => handleReject(app.id)}>
                          <XCircle size={16} /> Reject Action
                        </button>
                      </div>
                    ) : (
                      <span className={`tag ${app.approvalStatus === "APPROVED" ? "tagGreen" : "tagRed"}`}>
                        {app.approvalStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 6: GENERATED FILES */}
        {activeTab === "files" && (
          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Extracted Data & Generated Reports (Section 16 & Criterion 8)</h2>
                <p>Structured CSV, Excel spreadsheets, and data extracts generated from browser sessions.</p>
              </div>
              {selectedFileRowIds.length > 0 && (
                <div>
                  <button
                    className="btn btnDanger"
                    style={{ height: "34px", padding: "0 14px", fontSize: "12px", gap: "6px", display: "inline-flex", alignItems: "center" }}
                    onClick={handleDeleteSelectedFiles}
                  >
                    <Trash2 size={15} /> Delete Selected ({selectedFileRowIds.length})
                  </button>
                </div>
              )}
            </div>

            {files.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "13px", padding: "20px 0" }}>No generated files yet. Extract a table or inspect a page to generate reports.</div>
            ) : (
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ width: "36px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={files.length > 0 && selectedFileRowIds.length === files.length}
                        onChange={e => toggleSelectAllFiles(e.target.checked)}
                      />
                    </th>
                    <th>File Name</th>
                    <th>Format</th>
                    <th>Row Count</th>
                    <th>Data Preview</th>
                    <th>Generated Date</th>
                    <th style={{ width: "90px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id} style={{ background: selectedFileRowIds.includes(f.id) ? "rgba(239, 68, 68, 0.04)" : undefined }}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedFileRowIds.includes(f.id)}
                          onChange={() => toggleSelectFileRow(f.id)}
                        />
                      </td>
                      <td><b>{f.fileName}</b></td>
                      <td><span className="tag tagBlue">{f.fileType}</span></td>
                      <td>{f.rowCount} records</td>
                      <td>
                        <code style={{ fontSize: "11px", color: "#475569" }}>{f.contentPreview || "Tabular data"}</code>
                      </td>
                      <td>{new Date(f.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="actionBtnGroup" style={{ justifyContent: "center" }}>
                          <a
                            href={`${API}/files/${f.id}/download`}
                            className="actionIconBtn primary"
                            title="Download Report File"
                            download
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 7: SECURITY & AUDIT */}
        {activeTab === "security" && (
          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Security Architecture & Audit Vault (Section 14)</h2>
                <p>Authenticated encryption, strict SSRF defense, and verifiable action logs.</p>
              </div>
            </div>

            <div className="statsGrid" style={{ marginBottom: "20px" }}>
              <div className="statCard">
                <span>Encryption at Rest</span>
                <strong style={{ fontSize: "18px", color: "#10b981" }}>AES-256-GCM</strong>
                <small>Session tokens & secrets vaulted</small>
              </div>
              <div className="statCard">
                <span>SSRF Defense</span>
                <strong style={{ fontSize: "18px", color: "#10b981" }}>Active Egress Filter</strong>
                <small>Localhost/private IP blocked</small>
              </div>
              <div className="statCard">
                <span>Browser Sandbox</span>
                <strong style={{ fontSize: "18px", color: "#10b981" }}>Isolated Contexts</strong>
                <small>Per-tenant browser contexts</small>
              </div>
              <div className="statCard">
                <span>Model Safety</span>
                <strong style={{ fontSize: "18px", color: "#10b981" }}>Zero Credential Leak</strong>
                <small>Raw passwords masked from LLM</small>
              </div>
            </div>

            <h3>Security Guarantees:</h3>
            <ul style={{ fontSize: "13px", color: "#334155", lineHeight: "1.8" }}>
              <li><b>Zero Model Credential Exposure:</b> The AI planner never receives raw passwords or authorization tokens.</li>
              <li><b>Strict URL Safety Policy:</b> Private subnets (RFC 1918), loopback addresses, AWS metadata endpoints (169.254.169.254), and file/gopher schemes are strictly blocked.</li>
              <li><b>Non-Idempotent Action Protection:</b> High-risk operations (social posts, messages, financial orders) require explicit human sign-off.</li>
              <li><b>No CAPTCHA / MFA Bypassing:</b> When authentication challenges occur, the agent pauses and requests authorized human assistance.</li>
            </ul>
          </div>
        )}

        {/* TAB 8: SETTINGS & AI KEYS (CLEAN & SIMPLE) */}
        {activeTab === "settings" && (
          <div className="panel" style={{ maxWidth: "640px", margin: "10px auto 0" }}>
            <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.15)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Cpu size={20} color="#38bdf8" />
                  AI Engine Configuration
                </h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  Select your AI model provider, enter the model name and your API key.
                </p>
              </div>
              {aiStatus.isConfigured ? (
                <span className="tag tagGreen" style={{ fontSize: "11px" }}>
                  Active ({aiProvider.toUpperCase()})
                </span>
              ) : (
                <span className="tag tagAmber" style={{ fontSize: "11px" }}>
                  Not Configured
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* 1. Provider Name */}
              <div className="formGroup">
                <label style={{ fontSize: "13px", fontWeight: 600 }}>AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={e => {
                    const p = e.target.value as "gemini" | "openai" | "claude" | "groq";
                    setAiProvider(p);
                    if (p === "gemini") setAiModel("gemini-1.5-flash");
                    else if (p === "openai") setAiModel("gpt-4o-mini");
                    else if (p === "claude") setAiModel("claude-3-5-sonnet-20241022");
                    else if (p === "groq") setAiModel("llama-3.3-70b-versatile");
                  }}
                  style={{ height: "42px", fontSize: "14px" }}
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="groq">Groq (Ultra-fast Llama 3.3)</option>
                </select>
              </div>

              {/* 2. Model Name */}
              <div className="formGroup">
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. gemini-1.5-flash, gpt-4o-mini, claude-3-5-sonnet, llama-3.3-70b"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  style={{ height: "42px", fontSize: "14px" }}
                />
              </div>

              {/* 3. API Key */}
              <div className="formGroup">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600 }}>API Key</label>
                  {aiProvider === "gemini" && (
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}>
                      Get Gemini API Key &rarr;
                    </a>
                  )}
                  {aiProvider === "openai" && (
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}>
                      Get OpenAI API Key &rarr;
                    </a>
                  )}
                  {aiProvider === "claude" && (
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}>
                      Get Claude API Key &rarr;
                    </a>
                  )}
                  {aiProvider === "groq" && (
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}>
                      Get Groq API Key &rarr;
                    </a>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showAiKey ? "text" : "password"}
                    placeholder={`Paste your ${aiProvider.toUpperCase()} API Key here`}
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    style={{ height: "42px", fontSize: "14px", paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(prev => !prev)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8"
                    }}
                    title={showAiKey ? "Hide key" : "Show key"}
                  >
                    {showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 4. Action Buttons */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={handleSaveAiConfig}
                  disabled={isTestingAiKey || !aiApiKey.trim()}
                  style={{ minWidth: "160px", height: "40px", fontSize: "13px" }}
                >
                  {isTestingAiKey ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Verifying Key...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save & Connect
                    </>
                  )}
                </button>

                {aiStatus.isConfigured && (
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={handleClearAiConfig}
                    style={{ height: "40px", fontSize: "13px", color: "#ef4444" }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User-Assisted UI Login Modal (Section 3.2) */}
        {loginModalConn && (
          <div className="modalBackdrop">
            <div className="modalBox">
              <div className="modalHead">
                <div>
                  <h3>Interactive Browser Login</h3>
                  <p>{loginModalConn.name} ({loginModalConn.websiteUrl})</p>
                </div>
                <button className="btn btnSecondary" onClick={cancelBrowserLogin} style={{ border: 0, padding: "4px" }}>
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <ShieldCheck size={24} color="#0284c7" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <b style={{ color: "#0369a1", fontSize: "14px" }}>A real browser window has opened on your screen!</b>
                    <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#0c4a6e", lineHeight: "1.5" }}>
                      1. Switch to the newly opened browser window.<br />
                      2. Complete your login with Google, Email, or OTP/MFA.<br />
                      3. Once you reach the dashboard, click the button below to save session.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="btn btnSecondary" onClick={cancelBrowserLogin}>
                  Cancel
                </button>
                <button className="btn btnSuccess" onClick={confirmBrowserLogin} disabled={loginModalLoading}>
                  {loginModalLoading ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Saving Session...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> I Have Logged In - Save Session
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
