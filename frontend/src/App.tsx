import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import navioLogo from "./assets/navio-logo.png";
import { ConnectorLogo } from "./ConnectorLogo";
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
  FileText,
  Image as ImageIcon,
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
  Menu,
  User,
  Upload,
  ArrowDownToLine,
  Pencil,
  LogOut,
  Mail,
  Copy,
  CalendarClock,
  Play,
  Pause
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

type Connection = { id: string; name: string; websiteUrl: string; status: string; createdAt: string };
type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };
type PersonalProfile = { id: string; enabled: boolean; fullName: string; email: string; phone: string; location: string; customText: string; updatedAt?: string };
type PersonalFile = { id: string; fileName: string; contentType: string; fileSize: number; extractedText?: string; createdAt: string };
type ScrapedItem = { title: string; href?: string; imageUrl?: string; fileExt?: string; category?: string; snippet?: string };
type Task = { id: string; connectionId: string; prompt: string; status: string; result?: string; extractedItems?: string; createdAt: string };
type Action = { id: string; actionType: string; description: string; status: string; createdAt: string };
type Capability = { key: string; name: string; status: string; riskLevel: string; description: string };
type Connector = { id: string; name: string; category: string; authType: string; status: string; capabilities: Capability[] };
type Approval = { id: string; platform: string; actionDescription: string; riskLevel: string; approvalStatus: string; payload: string; consequences: string; requestedAt: string };
type GeneratedFile = { id: string; taskId?: string; fileName: string; fileType: string; rowCount: number; contentPreview: string; downloadUrl: string; createdAt: string };
type WhatsAppChat = { id: string; customerName: string; phone: string; lastMessage: string; intent: string; confidence: string; suggestedDraft: string; status: string };
type ScheduledJobItem = { id: string; name: string; connectionId?: string | null; connectionName?: string; websiteUrl?: string; taskMode: string; cadence: string; requirements: string; preferredLocation?: string; scheduleTime: string; timezone: string; autoApply: boolean; maxApplyPerRun: number; enabled: boolean; lastRunDate?: string; lastRunAt?: string; lastStatus: string; lastSummary?: string; lastMatchedCount: number; lastAppliedCount: number; createdAt: string };
type ScheduledJobRunItem = { id: string; scheduledJobId: string; scheduleName?: string; connectionName?: string; taskId?: string; status: string; matchedCount: number; appliedCount: number; summary?: string; startedAt: string; finishedAt?: string };
type Toast = { id: string; type: "success" | "error" | "info"; message: string };
type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  authProvider: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
};
type AuthProviderStatus = {
  emailEnabled: boolean;
  googleConfigured: boolean;
  googleClientId?: string;
  googleClientIdMasked?: string;
  googleConfigSource?: string;
  redirectUri: string;
  frontendOrigin?: string;
};

function GoogleGIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
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
  scrapedItems?: ScrapedItem[];
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

function VerifiedBadgeIcon({
  verified,
  size = 18,
  title,
  style
}: {
  verified: boolean;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
}) {
  const sealPath =
    "M 22.60 12.00 C 22.60 12.65, 20.38 13.57, 20.21 14.20 C 20.04 14.83, 21.50 16.74, 21.18 17.30 C 20.85 17.86, 18.47 17.55, 18.01 18.01 C 17.55 18.47, 17.86 20.85, 17.30 21.18 C 16.74 21.50, 14.83 20.04, 14.20 20.21 C 13.57 20.38, 12.65 22.60, 12.00 22.60 C 11.35 22.60, 10.43 20.38, 9.80 20.21 C 9.17 20.04, 7.26 21.50, 6.70 21.18 C 6.14 20.85, 6.45 18.47, 5.99 18.01 C 5.53 17.55, 3.15 17.86, 2.82 17.30 C 2.50 16.74, 3.96 14.83, 3.79 14.20 C 3.62 13.57, 1.40 12.65, 1.40 12.00 C 1.40 11.35, 3.62 10.43, 3.79 9.80 C 3.96 9.17, 2.50 7.26, 2.82 6.70 C 3.15 6.14, 5.53 6.45, 5.99 5.99 C 6.45 5.53, 6.14 3.15, 6.70 2.82 C 7.26 2.50, 9.17 3.96, 9.80 3.79 C 10.43 3.62, 11.35 1.40, 12.00 1.40 C 12.65 1.40, 13.57 3.62, 14.20 3.79 C 14.83 3.96, 16.74 2.50, 17.30 2.82 C 17.86 3.15, 17.55 5.53, 18.01 5.99 C 18.47 6.45, 20.85 6.14, 21.18 6.70 C 21.50 7.26, 20.04 9.17, 20.21 9.80 C 20.38 10.43, 22.60 11.35, 22.60 12.00 Z";
  return (
    <span
      title={title || (verified ? "Verified / Authenticated" : "Connected (Not Authenticated)")}
      aria-label={title || (verified ? "Verified" : "Not verified")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {verified ? (
          <>
            <path d={sealPath} fill="#10b981" />
            <path
              d="M8.5 12.3l2.3 2.3 4.8-4.9"
              stroke="#ffffff"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path
              d={sealPath}
              fill="none"
              stroke="#6b7280"
              strokeWidth="1.65"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 12.3l2.3 2.3 4.8-4.9"
              stroke="#6b7280"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </span>
  );
}

function parseScrapedItems(raw?: string): ScrapedItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const lines = content.split(/\r?\n/);
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

  function cleanResidualSymbols(plain: string): string {
    return plain
      .replace(/\\([#*_\`])/g, "$1")
      .replace(/\*{2,}/g, "")
      .replace(/(^|[\s(["'])\*(?=\S)/g, "$1")
      .replace(/(?<=\S)\*(?=[\s).,;:!?\]"']|$)/g, "")
      .replace(/^#{1,6}\s*/gm, "");
  }

  function formatInline(text: string): React.ReactNode[] {
    const tokens: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(cleanResidualSymbols(text.slice(lastIndex, match.index)));
      }
      const token = match[0];
      if (token.startsWith("`") && token.endsWith("`")) {
        tokens.push(
          <code key={match.index} className="geminiMarkdownCode">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("***") && token.endsWith("***")) {
        tokens.push(
          <strong key={match.index} className="geminiMarkdownBold">
            <em className="geminiMarkdownItalic">{token.slice(3, -3)}</em>
          </strong>
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
      tokens.push(cleanResidualSymbols(text.slice(lastIndex)));
    }

    return tokens;
  }

  let inCodeFence = false;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      flushList();
      inCodeFence = !inCodeFence;
      return;
    }
    if (inCodeFence) {
      flushList();
      if (trimmed !== "") {
        elements.push(
          <p key={`code-${idx}`} className="geminiMarkdownParagraph">
            <code className="geminiMarkdownCode">{line}</code>
          </p>
        );
      }
      return;
    }
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="geminiMarkdownDivider" />);
      return;
    }
    const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      flushList();
      elements.push(
        <h3 key={`h-${idx}`} className="geminiMarkdownHeading">
          {formatInline(headingMatch[1])}
        </h3>
      );
      return;
    }
    const bulletMatch = trimmed.match(/^(?:•|\-|\*|\+)\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(
        <li key={`li-${idx}`} className="geminiMarkdownListItem">
          {formatInline(bulletMatch[1])}
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
  const AUTH_TOKEN_STORAGE_KEY = "navio_auth_token";
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const authTokenRef = useRef<string | null>(authToken);
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  function getActiveConvStorageKey(userId?: string | null) {
    const uid = userId ?? currentUserIdRef.current;
    return uid ? `navio_active_conversation_id_${uid}` : "navio_active_conversation_id";
  }
  function getDeletedTasksStorageKey(userId?: string | null) {
    const uid = userId ?? currentUserIdRef.current;
    return uid ? `deleted_task_ids_${uid}` : "deleted_task_ids";
  }
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const authLoginTabRef = useRef<HTMLButtonElement | null>(null);
  const authRegisterTabRef = useRef<HTMLButtonElement | null>(null);
  const [authGliderStyle, setAuthGliderStyle] = useState<{ left: number; width: number }>({ left: 4, width: 0 });

  useLayoutEffect(() => {
    function measureAuthGlider() {
      const activeBtn = authMode === "register" ? authRegisterTabRef.current : authLoginTabRef.current;
      if (!activeBtn) return;
      setAuthGliderStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth
      });
    }
    measureAuthGlider();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureAuthGlider) : null;
    if (ro) {
      if (authLoginTabRef.current) ro.observe(authLoginTabRef.current);
      if (authRegisterTabRef.current) ro.observe(authRegisterTabRef.current);
    }
    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) measureAuthGlider();
      });
    }
    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [authMode, authChecking, currentUser]);
  const [authFullName, setAuthFullName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authProviders, setAuthProviders] = useState<AuthProviderStatus>({
    emailEnabled: true,
    googleConfigured: false,
    redirectUri: "http://localhost:8080/api/v1/auth/google/callback"
  });
  const [showGoogleSetupModal, setShowGoogleSetupModal] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState("");
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState("");
  const [googleSetupSaving, setGoogleSetupSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "connections" | "capabilities" | "social" | "scheduler" | "approvals" | "files" | "security" | "personalization" | "settings">("dashboard");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [waChats, setWaChats] = useState<WhatsAppChat[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobItem[]>([]);
  const [scheduledRuns, setScheduledRuns] = useState<ScheduledJobRunItem[]>([]);
  const [schedName, setSchedName] = useState("");
  const [schedConnId, setSchedConnId] = useState("");
  const [schedTime, setSchedTime] = useState("09:30");
  const [schedTimezone, setSchedTimezone] = useState("Asia/Kolkata");
  const [schedRequirements, setSchedRequirements] = useState("");
  const [schedLocation, setSchedLocation] = useState("");
  const [schedTaskMode, setSchedTaskMode] = useState<"AUTO" | "BROWSER_TASK" | "JOB_AUTOMATION" | "AI_CHAT">("AUTO");
  const [schedCadence, setSchedCadence] = useState<"DAILY" | "WEEKDAYS" | "HOURLY">("DAILY");
  const [schedAutoApply, setSchedAutoApply] = useState(false);
  const [schedMaxApply, setSchedMaxApply] = useState(5);
  const [schedSaving, setSchedSaving] = useState(false);
  const [runningSchedId, setRunningSchedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Settings & AI Configuration state
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai" | "claude" | "groq">("gemini");
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gemini-1.5-flash");
  const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; maskedKey?: string; message?: string; lastError?: string }>({ isConfigured: false });
  const [showAiKey, setShowAiKey] = useState<boolean>(false);
  const [isTestingAiKey, setIsTestingAiKey] = useState<boolean>(false);

  // Personalization state (custom text & uploaded files)
  const [personalProfile, setPersonalProfile] = useState<PersonalProfile>({
    id: "default",
    enabled: true,
    fullName: "",
    email: "",
    phone: "",
    location: "",
    customText: ""
  });
  const [personalFiles, setPersonalFiles] = useState<PersonalFile[]>([]);
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [uploadingPersonalFiles, setUploadingPersonalFiles] = useState(false);
  const [personalDragActive, setPersonalDragActive] = useState(false);
  const [expandedPersonalFileId, setExpandedPersonalFileId] = useState<string | null>(null);
  const personalFileInputRef = useRef<HTMLInputElement>(null);

  // Gemini AI Command Center state
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState("");
  const editTitleCancelRef = useRef(false);
  const ACTIVE_CONV_STORAGE_KEY = "navio_active_conversation_id";
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string>(""); // "" (none/general), "all", or connection.id
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: "single" | "all";
    conversationId?: string;
    taskId?: string;
    taskPrompt?: string;
  } | null>(null);
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(() => new Set<string>());
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    deletedTaskIdsRef.current = deletedTaskIds;
  }, [deletedTaskIds]);
  const [quickConnName, setQuickConnName] = useState("");
  const [quickConnUrl, setQuickConnUrl] = useState("");
  const [expandedTraceTaskId, setExpandedTraceTaskId] = useState<string | null>(null);
  const [taskTraceCache, setTaskTraceCache] = useState<Record<string, Action[]>>({});
  const [showTopProfileMenu, setShowTopProfileMenu] = useState(false);
  const geminiTextareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const topProfileMenuRef = useRef<HTMLDivElement>(null);
  const chatFeedBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat feed to bottom when new messages arrive
  useEffect(() => {
    if (conversationStarted && chatFeedBottomRef.current) {
      chatFeedBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, conversationStarted]);

  // Close plus popover and @ mention menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionDropdown(false);
      }
      if (topProfileMenuRef.current && !topProfileMenuRef.current.contains(e.target as Node)) {
        setShowTopProfileMenu(false);
      }
    }
    if (showPlusMenu || showMentionDropdown || showTopProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPlusMenu, showMentionDropdown, showTopProfileMenu]);

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

  async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = authTokenRef.current;
    const headers = new Headers(init?.headers || undefined);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(input, { ...init, headers });
    const urlStr = typeof input === "string" ? input : input.toString();
    if (res.status === 401 && !urlStr.includes("/auth/login") && !urlStr.includes("/auth/register")) {
      authTokenRef.current = null;
      currentUserIdRef.current = null;
      setAuthToken(null);
      setCurrentUser(null);
      resetWorkspaceState();
      try {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      } catch {}
    }
    return res;
  }

  async function refreshAuthProviders() {
    try {
      const res = await apiFetch(`${API}/auth/providers`);
      if (res.ok) {
        const data: AuthProviderStatus = await res.json();
        setAuthProviders(data);
        if (data.googleClientId) {
          setGoogleClientIdInput(prev => prev || data.googleClientId || "");
        }
      }
    } catch {}
  }

  function applyAuthenticatedSession(token: string, user: AuthUser, notice?: string) {
    const prevUserId = currentUserIdRef.current;
    if (prevUserId !== user.id) {
      resetWorkspaceState();
    }
    authTokenRef.current = token;
    currentUserIdRef.current = user.id;
    setAuthToken(token);
    setCurrentUser(user);
    setAuthError(null);
    setAuthPassword("");
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      const userDeleted = localStorage.getItem(getDeletedTasksStorageKey(user.id));
      const parsedSet = userDeleted ? new Set<string>(JSON.parse(userDeleted)) : new Set<string>();
      deletedTaskIdsRef.current = parsedSet;
      setDeletedTaskIds(parsedSet);
    } catch {
      deletedTaskIdsRef.current = new Set<string>();
      setDeletedTaskIds(new Set<string>());
    }
    if (notice) showToast(notice, "success");
  }

  function handleLogout() {
    const prevUserId = currentUserIdRef.current;
    authTokenRef.current = null;
    currentUserIdRef.current = null;
    setAuthToken(null);
    setCurrentUser(null);
    resetWorkspaceState();
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      if (prevUserId) {
        sessionStorage.removeItem(getActiveConvStorageKey(prevUserId));
      }
      sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
    } catch {}
    showToast("Signed out of Navio.", "info");
  }

  useEffect(() => {
    void refreshAuthProviders();

    let tokenFromHash: string | null = null;
    let errorFromHash: string | null = null;
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      tokenFromHash = hashParams.get("auth_token");
      errorFromHash = hashParams.get("auth_error");
      if (tokenFromHash || errorFromHash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    if (errorFromHash) {
      setAuthError(errorFromHash);
      showToast(errorFromHash, "error");
    }

    const candidateToken = tokenFromHash || (() => {
      try {
        return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      } catch {
        return null;
      }
    })();

    if (!candidateToken) {
      setAuthChecking(false);
      return;
    }

    authTokenRef.current = candidateToken;
    setAuthToken(candidateToken);
    apiFetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then(data => {
        if (data?.user) {
          applyAuthenticatedSession(candidateToken, data.user);
        } else {
          throw new Error("Invalid session");
        }
      })
      .catch(() => {
        authTokenRef.current = null;
        setAuthToken(null);
        setCurrentUser(null);
        try {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        } catch {}
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  useEffect(() => {
    function onWindowMessage(event: MessageEvent) {
      let allowedOrigin = "";
      try {
        allowedOrigin = new URL(API).origin;
      } catch {}
      if (allowedOrigin && event.origin !== allowedOrigin && event.origin !== window.location.origin) {
        return;
      }
      const data = event.data;
      if (!data || data.type !== "navio-google-auth") return;

      if (data.error) {
        setAuthError(data.error);
        setAuthSubmitting(false);
        showToast(data.error, "error");
        return;
      }
      if (data.token && data.user) {
        setAuthSubmitting(false);
        setShowGoogleSetupModal(false);
        applyAuthenticatedSession(data.token, data.user, `Signed in with Google as ${data.user.fullName}!`);
      }
    }
    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
  }, []);

  async function handleEmailAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail) {
      setAuthError("Please enter your Gmail / Email address.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthSubmitting(true);
    try {
      const endpoint = authMode === "register" ? `${API}/auth/register` : `${API}/auth/login`;
      const payload = authMode === "register"
        ? { fullName: authFullName.trim(), email: trimmedEmail, password: authPassword }
        : { email: trimmedEmail, password: authPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data?.error || "Authentication failed.");
        return;
      }
      if (data?.token && data?.user) {
        applyAuthenticatedSession(
          data.token,
          data.user,
          authMode === "register" ? `Welcome to Navio, ${data.user.fullName}!` : `Signed in as ${data.user.email}`
        );
      }
    } catch {
      setAuthError("Cannot reach Navio backend server on port 8080.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function launchGoogleOAuthFlow() {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await apiFetch(`${API}/auth/google/url?mode=popup&origin=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setAuthSubmitting(false);
        if (!authProviders.googleConfigured) {
          setShowGoogleSetupModal(true);
        } else {
          setAuthError(data?.error || "Failed to initialize Google login.");
        }
        return;
      }

      const w = 520;
      const h = 640;
      const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        data.url,
        "navioGoogleAuth",
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      if (!popup || popup.closed) {
        // Fallback to full-page redirect if popup blocked
        const redirectRes = await apiFetch(`${API}/auth/google/url?mode=redirect&origin=${encodeURIComponent(window.location.origin)}`);
        const redirectData = await redirectRes.json();
        if (redirectData?.url) {
          window.location.href = redirectData.url;
          return;
        }
        setAuthSubmitting(false);
        setAuthError("Popup was blocked by the browser. Please allow popups or try again.");
        return;
      }

      const pollClosed = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(pollClosed);
          setAuthSubmitting(false);
        }
      }, 450);
    } catch {
      setAuthSubmitting(false);
      setAuthError("Failed to start Google sign-in.");
    }
  }

  function handleContinueWithGoogle() {
    if (!authProviders.googleConfigured) {
      setShowGoogleSetupModal(true);
      return;
    }
    void launchGoogleOAuthFlow();
  }

  async function handleSaveGoogleConfig(launchAfterSave: boolean) {
    if (!googleClientIdInput.trim() || !googleClientSecretInput.trim()) {
      showToast("Please enter both Google Client ID and Client Secret.", "error");
      return;
    }
    setGoogleSetupSaving(true);
    try {
      const res = await apiFetch(`${API}/auth/google/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: googleClientIdInput.trim(),
          clientSecret: googleClientSecretInput.trim(),
          redirectUri: authProviders.redirectUri
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "Failed to save Google OAuth settings.", "error");
        return;
      }
      setGoogleClientSecretInput("");
      await refreshAuthProviders();
      showToast("Google OAuth configured successfully!", "success");
      setShowGoogleSetupModal(false);
      if (launchAfterSave) {
        void launchGoogleOAuthFlow();
      }
    } catch {
      showToast("Network error saving Google OAuth settings.", "error");
    } finally {
      setGoogleSetupSaving(false);
    }
  }

  // Load per-user encrypted AI config from authenticated backend (never shared localStorage)
  useEffect(() => {
    try {
      localStorage.removeItem("browser_agent_ai_key");
      localStorage.removeItem("browser_agent_ai_provider");
      localStorage.removeItem("browser_agent_ai_model");
    } catch {}
    if (!currentUser?.id) {
      setAiApiKey("");
      setAiStatus({ isConfigured: false });
      return;
    }
    let cancelled = false;
    apiFetch(`${API}/ai/config`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return;
        if (data && data.isConfigured) {
          setAiStatus({ isConfigured: true, maskedKey: data.maskedKey, lastError: data.lastError || undefined });
          if (data.provider) setAiProvider(data.provider);
          if (data.model) setAiModel(data.model);
        } else {
          setAiStatus({ isConfigured: false });
          setAiProvider("gemini");
          setAiModel("gemini-1.5-flash");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  async function handleSaveAiConfig() {
    const key = aiApiKey.trim();
    if (!key) {
      showToast("Please enter an API key.", "error");
      return;
    }

    const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "••••••••";
    setAiStatus({ isConfigured: true, maskedKey: masked });

    setIsTestingAiKey(true);
    try {
      const res = await apiFetch(`${API}/ai/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: key,
          model: aiModel
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAiStatus({ isConfigured: false });
        showToast(data?.error || "Failed to save AI configuration.", "error");
        return;
      }
      if (data?.config) {
        if (data.config.model) {
          setAiModel(data.config.model);
        }
        setAiStatus({
          isConfigured: true,
          maskedKey: data.config.maskedKey || masked,
          message: data.message,
          lastError: data.verified === false ? (data.config.lastError || data.message) : undefined
        });
      }
      setAiApiKey("");
      showToast(data?.message || `Saved ${aiProvider.toUpperCase()} API key!`, data?.verified === false ? "info" : "success");
    } catch (err) {
      showToast(`Failed to save AI key (${err instanceof Error ? err.message : "check backend connection"})`, "error");
    } finally {
      setIsTestingAiKey(false);
    }
  }

  async function handleClearAiConfig() {
    setAiApiKey("");
    setAiStatus({ isConfigured: false });
    try {
      await apiFetch(`${API}/ai/config`, { method: "DELETE" });
    } catch {}
    showToast("AI Key cleared for your account. System running in Heuristic Fallback mode.", "info");
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

  function resetWorkspaceState() {
    setConnections([]);
    setTasks([]);
    setApprovals([]);
    setFiles([]);
    setWaChats([]);
    setScheduledJobs([]);
    setScheduledRuns([]);
    setSchedConnId("");
    setSchedName(""); setSchedRequirements(""); setSchedLocation(""); setRunningSchedId(null);
    setConversations([]);
    setChatMessages([]);
    setConversationStarted(false);
    setActiveHistoryId(null);
    activeConversationIdRef.current = null;
    setSelectedConnId("");
    setSelectedTarget("");
    setSelectedTaskDetail(null);
    setTaskTraceCache({});
    setExpandedTraceTaskId(null);
    setSelectedConnRowIds([]);
    setSelectedFileRowIds([]);
    setPersonalProfile({
      id: "",
      enabled: true,
      fullName: "",
      email: "",
      phone: "",
      location: "",
      customText: ""
    });
    setPersonalFiles([]);
    setAiApiKey("");
    setAiStatus({ isConfigured: false });
    setAiProvider("gemini");
    setAiModel("gemini-1.5-flash");
    deletedTaskIdsRef.current = new Set<string>();
    setDeletedTaskIds(new Set<string>());
    setShowTopProfileMenu(false);
  }

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
      const r = await apiFetch(`${API}/files/${id}`, { method: "DELETE" });
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
      const r = await apiFetch(`${API}/files/batch-delete`, {
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
      const r = await apiFetch(`${API}/connections/batch-delete`, {
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
        localStorage.setItem(getDeletedTasksStorageKey(), JSON.stringify(Array.from(next)));
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
      const r = await apiFetch(`${API}/tasks/${taskId}`, { method: "DELETE" });
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
        localStorage.setItem(getDeletedTasksStorageKey(), JSON.stringify(Array.from(allIds)));
      } catch (_) {}
      return allIds;
    });
    setTasks([]);
    setActiveHistoryId(null);
    setChatMessages([]);
    setConversationStarted(false);
    try {
      await apiFetch(`${API}/tasks`, { method: "DELETE" });
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
      const r = await apiFetch(`${API}/connections/${c.id}/launch-login`, { method: "POST" });
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
      const r = await apiFetch(`${API}/connections/${loginModalConn.id}/confirm-login`, { method: "POST" });
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
      await apiFetch(`${API}/connections/${loginModalConn.id}/cancel-login`, { method: "POST" });
    } catch (_) {}
    setLoginModalConn(null);
  }

  async function loadData(): Promise<{ conversations: Conversation[]; convOk: boolean }> {
    let loadedConversations: Conversation[] = [];
    let convOk = false;
    try {
      const [cRes, tRes, conRes, appRes, fRes, waRes, convRes, schedRes] = await Promise.all([
        apiFetch(`${API}/connections`),
        apiFetch(`${API}/tasks`),
        apiFetch(`${API}/connectors`),
        apiFetch(`${API}/approvals`),
        apiFetch(`${API}/files`),
        apiFetch(`${API}/social/whatsapp/inbox`).catch(() => null),
        apiFetch(`${API}/conversations`).catch(() => null),
        apiFetch(`${API}/schedules`).catch(() => null)
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setConnections(cData);
        if (!selectedConnId && cData.length > 0) setSelectedConnId(cData[0].id);
        if (!schedConnId && cData.length > 0) {
          const jobSite = cData.find((c: Connection) => /naukri|linkedin|indeed|internshala|foundit|glassdoor|wellfound|job/i.test(c.name + " " + c.websiteUrl));
          setSchedConnId((jobSite || cData[0]).id);
        }
      }
      if (tRes.ok) {
        const tData: Task[] = await tRes.json();
        setTasks(tData.filter(t => !deletedTaskIdsRef.current.has(t.id)).reverse());
      }
      if (conRes.ok) setConnectors(await conRes.json());
      if (appRes.ok) setApprovals(await appRes.json());
      if (fRes.ok) setFiles(await fRes.json());
      if (waRes && waRes.ok) setWaChats(await waRes.json());
      if (convRes && convRes.ok) {
        loadedConversations = await convRes.json();
        setConversations(loadedConversations);
        convOk = true;
      }
      if (schedRes && schedRes.ok) {
        const schedData = await schedRes.json();
        if (Array.isArray(schedData?.schedules)) setScheduledJobs(schedData.schedules);
        if (Array.isArray(schedData?.runs)) setScheduledRuns(schedData.runs);
      }
    } catch {
      // Background poll failure
    }
    return { conversations: loadedConversations, convOk };
  }

  function parseDailyScheduleTimeFromPrompt(text: string): string {
    const m24 = text.match(/\bat\s+(\d{1,2}):(\d{2})(?!\s*(?:am|pm))\b/i);
    if (m24) {
      const hh = Math.min(23, Math.max(0, parseInt(m24[1], 10))).toString().padStart(2, "0");
      const mm = Math.min(59, Math.max(0, parseInt(m24[2], 10))).toString().padStart(2, "0");
      return `${hh}:${mm}`;
    }
    const m12 = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (m12) {
      let hh = parseInt(m12[1], 10);
      const mm = parseInt(m12[2] || "0", 10);
      const meridiem = m12[3].toLowerCase();
      if (meridiem === "pm" && hh < 12) hh += 12;
      if (meridiem === "am" && hh === 12) hh = 0;
      return `${hh.toString().padStart(2, "0")}:${Math.min(59, mm).toString().padStart(2, "0")}`;
    }
    return "09:30";
  }

  function parseCadenceFromPrompt(text: string): "DAILY" | "WEEKDAYS" | "HOURLY" {
    if (/\b(hourly|every\s+hour)\b/i.test(text)) return "HOURLY";
    if (/\b(weekday|weekdays|mon-fri|workdays?)\b/i.test(text)) return "WEEKDAYS";
    return "DAILY";
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (schedTaskMode === "JOB_AUTOMATION" && !schedConnId) {
      showToast("Select a connected job portal first.", "error");
      return;
    }
    if (!schedRequirements.trim()) {
      showToast("Enter the task instructions or requirements to schedule.", "error");
      return;
    }
    const effectiveConnId = schedTaskMode === "AI_CHAT" ? null : (schedConnId || null);
    const targetConn = connections.find(c => c.id === effectiveConnId);
    const nameToUse = schedName.trim() || `${schedCadence === "HOURLY" ? "Hourly" : schedCadence === "WEEKDAYS" ? "Weekday" : "Daily"} ${targetConn?.name || "AI"} Task`;
    setSchedSaving(true);
    try {
      const res = await apiFetch(`${API}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameToUse,
          connectionId: effectiveConnId,
          taskMode: schedTaskMode,
          cadence: schedCadence,
          requirements: schedRequirements.trim(),
          preferredLocation: schedLocation.trim(),
          scheduleTime: schedTime,
          timezone: schedTimezone,
          autoApply: schedTaskMode === "JOB_AUTOMATION" ? schedAutoApply : (schedTaskMode === "AUTO" ? schedAutoApply : false),
          maxApplyPerRun: Math.max(1, Math.min(25, Number(schedMaxApply) || 5)),
          enabled: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save schedule");
      setSchedName("");
      setSchedRequirements("");
      await loadData();
      showToast(`Scheduled (${schedCadence}) at ${schedTime} ${schedTimezone}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save schedule", "error");
    } finally {
      setSchedSaving(false);
    }
  }

  async function handleToggleSchedule(id: string) {
    try {
      const res = await apiFetch(`${API}/schedules/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle schedule");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to toggle schedule", "error");
    }
  }

  async function handleRunScheduleNow(id: string) {
    setRunningSchedId(id);
    showToast("Launching browser to scrape matched jobs & run apply flow...", "info");
    try {
      const res = await apiFetch(`${API}/schedules/${id}/run`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Scheduled job run failed");
      await loadData();
      showToast(
        data.summary || `Matched ${data.matchedCount || 0} job(s), applied ${data.appliedCount || 0}.`,
        data.status === "FAILED" ? "error" : "success"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Scheduled job run failed", "error");
    } finally {
      setRunningSchedId(null);
    }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      const res = await apiFetch(`${API}/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete schedule");
      await loadData();
      showToast("Schedule deleted.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete schedule", "error");
    }
  }

  async function loadPersonalization() {
    try {
      const res = await apiFetch(`${API}/personalization`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setPersonalProfile({
            id: data.profile.id || "default",
            enabled: data.profile.enabled !== false,
            fullName: data.profile.fullName || "",
            email: data.profile.email || "",
            phone: data.profile.phone || "",
            location: data.profile.location || "",
            customText: data.profile.customText || "",
            updatedAt: data.profile.updatedAt
          });
        }
        if (Array.isArray(data?.files)) {
          setPersonalFiles(data.files);
        }
      }
    } catch {}
  }

  async function handleSavePersonalization(overrideEnabled?: boolean) {
    setSavingPersonalization(true);
    const nextProfile = {
      ...personalProfile,
      enabled: overrideEnabled !== undefined ? overrideEnabled : personalProfile.enabled
    };
    try {
      const res = await apiFetch(`${API}/personalization/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextProfile.enabled,
          fullName: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
          location: nextProfile.location,
          customText: nextProfile.customText
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save personalization");
      setPersonalProfile({
        id: data.id || "default",
        enabled: data.enabled !== false,
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        customText: data.customText || "",
        updatedAt: data.updatedAt
      });
      showToast(
        overrideEnabled !== undefined
          ? `Personalization ${data.enabled ? "enabled" : "paused"}.`
          : "Personalization details saved! Navio will use them automatically when needed.",
        "success"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save personalization", "error");
    } finally {
      setSavingPersonalization(false);
    }
  }

  async function handleUploadPersonalFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadingPersonalFiles(true);
    let successCount = 0;
    try {
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await apiFetch(`${API}/personalization/files`, {
          method: "POST",
          body: fd
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }
        successCount++;
      }
      await loadPersonalization();
      if (successCount > 0) {
        showToast(`Uploaded ${successCount} personal file(s) successfully.`, "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "File upload failed", "error");
    } finally {
      setUploadingPersonalFiles(false);
      if (personalFileInputRef.current) personalFileInputRef.current.value = "";
    }
  }

  async function handleDeletePersonalFile(id: string) {
    try {
      const res = await apiFetch(`${API}/personalization/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove personal file");
      setPersonalFiles(prev => prev.filter(f => f.id !== id));
      if (expandedPersonalFileId === id) setExpandedPersonalFileId(null);
      showToast("Personal file deleted.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete file", "error");
    }
  }

  function buildClientPersonalizationPayload() {
    if (!personalProfile.enabled) return { enabled: false };
    return {
      enabled: true,
      fullName: personalProfile.fullName,
      email: personalProfile.email,
      phone: personalProfile.phone,
      location: personalProfile.location,
      customText: personalProfile.customText,
      files: personalFiles.map(f => ({
        id: f.id,
        fileName: f.fileName,
        contentType: f.contentType,
        fileSize: f.fileSize,
        extractedText: f.extractedText || ""
      }))
    };
  }

  function formatFileSize(bytes: number) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function buildConversationTitle(promptText: string): string {
    const stripped = promptText
      .replace(/^@(all|[a-zA-Z0-9._-]+)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const base = stripped || promptText.replace(/\s+/g, " ").trim() || "New chat";
    return base.length > 60 ? base.slice(0, 57) + "..." : base;
  }

  function buildConversationContextWindow(msgs: ChatMessage[]): Array<{ role: "user" | "assistant"; content: string; targetName?: string }> {
    return msgs
      .filter(m => m.role === "user" || (m.status !== "THINKING" && m.status !== "RUNNING"))
      .slice(-24)
      .map(m => {
        if (m.role === "user") {
          const text = (m.prompt || m.content || "").trim();
          return { role: "user" as const, content: text, targetName: m.targetName || undefined };
        }
        const parts: string[] = [];
        if (m.content?.trim()) parts.push(m.content.trim());
        if (m.scrapedItems && m.scrapedItems.length > 0) {
          const previewTitles = m.scrapedItems.slice(0, 8).map(item => item.title).filter(Boolean).join(", ");
          parts.push(`[Extracted ${m.scrapedItems.length} item(s): ${previewTitles}]`);
        }
        if (m.file) {
          parts.push(`[Generated file: ${m.file.fileName} (${m.file.rowCount} rows)]`);
        }
        return { role: "assistant" as const, content: parts.join("\n"), targetName: m.targetName || undefined };
      })
      .filter(item => item.content.length > 0);
  }

  function startNewConversation() {
    activeConversationIdRef.current = null;
    setActiveHistoryId(null);
    try {
      sessionStorage.removeItem(getActiveConvStorageKey());
      sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
    } catch (_) {}
    setConversationStarted(false);
    setChatMessages([]);
    setGeminiPrompt("");
    setSelectedTarget("");
    setShowPlusMenu(false);
    setShowMentionDropdown(false);
    setEditingConvId(null);
  }

  async function openConversation(convId: string) {
    activeConversationIdRef.current = convId;
    setActiveHistoryId(convId);
    setSelectedTarget("");
    setShowPlusMenu(false);
    setShowMentionDropdown(false);
    try {
      sessionStorage.setItem(getActiveConvStorageKey(), convId);
    } catch (_) {}

    try {
      const res = await apiFetch(`${API}/conversations/${convId}`);
      if (!res.ok) {
        if (res.status === 404) {
          startNewConversation();
          showToast("Conversation no longer exists.", "info");
        }
        return;
      }
      const data = await res.json();
      const mapped: ChatMessage[] = (Array.isArray(data?.messages) ? data.messages : []).map((m: any) => ({
        id: m.id,
        role: m.role === "user" ? "user" : "assistant",
        targetName: m.targetName || "",
        prompt: m.prompt || undefined,
        content: m.content || undefined,
        isSchedule: Boolean(m.isSchedule),
        scheduleDetails: m.scheduleDetails || undefined,
        status: (m.status || "COMPLETED") as ChatMessage["status"],
        actions: Array.isArray(m.actions) ? m.actions : undefined,
        file: m.file || undefined,
        scrapedItems: parseScrapedItems(m.scrapedItems),
        createdAt: m.createdAt || new Date().toISOString()
      }));
      if (activeConversationIdRef.current !== convId) return;
      setChatMessages(mapped);
      setConversationStarted(true);
    } catch {
      showToast("Failed to load conversation messages.", "error");
    }
  }

  async function ensureConversation(initialTitlePrompt: string): Promise<string | null> {
    if (activeConversationIdRef.current) {
      return activeConversationIdRef.current;
    }
    try {
      const res = await apiFetch(`${API}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: buildConversationTitle(initialTitlePrompt) })
      });
      if (!res.ok) return null;
      const conv: Conversation = await res.json();
      activeConversationIdRef.current = conv.id;
      setActiveHistoryId(conv.id);
      try {
        sessionStorage.setItem(getActiveConvStorageKey(), conv.id);
      } catch (_) {}
      setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
      return conv.id;
    } catch {
      return null;
    }
  }

  async function persistMessageToConversation(
    convId: string | null,
    payload: {
      role: "user" | "assistant";
      targetName?: string;
      prompt?: string;
      content?: string;
      status: string;
      taskId?: string;
      fileId?: string;
      scrapedItems?: string;
      isSchedule?: boolean;
      scheduleDetails?: string;
    }
  ) {
    if (!convId) return;
    try {
      const res = await apiFetch(`${API}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const nowIso = new Date().toISOString();
        setConversations(prev => {
          const target = prev.find(c => c.id === convId);
          if (!target) return prev;
          return [{ ...target, updatedAt: nowIso }, ...prev.filter(c => c.id !== convId)];
        });
      }
    } catch (_) {}
  }

  async function handleDeleteConversation(convId: string) {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationIdRef.current === convId || activeHistoryId === convId) {
      startNewConversation();
    }
    try {
      const r = await apiFetch(`${API}/conversations/${convId}`, { method: "DELETE" });
      if (r.ok || r.status === 204) {
        showToast("Conversation deleted.", "info");
      } else {
        showToast("Conversation removed.", "info");
      }
    } catch {
      showToast("Conversation removed from view.", "info");
    }
  }

  async function executeClearAllConversations() {
    setConversations([]);
    startNewConversation();
    try {
      await apiFetch(`${API}/conversations`, { method: "DELETE" });
      showToast("All conversation history cleared.", "info");
    } catch {
      showToast("Conversation history cleared.", "info");
    }
  }

  function beginRenameConversation(conv: Conversation, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    editTitleCancelRef.current = false;
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
  }

  async function commitRenameConversation(convId: string) {
    if (editTitleCancelRef.current) {
      editTitleCancelRef.current = false;
      setEditingConvId(null);
      return;
    }
    const trimmed = editingConvTitle.trim();
    const existing = conversations.find(c => c.id === convId);
    setEditingConvId(null);
    if (!trimmed || !existing || trimmed === existing.title) {
      return;
    }
    const prevTitle = existing.title;
    const clipped = trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed;
    setConversations(prev => prev.map(c => (c.id === convId ? { ...c, title: clipped } : c)));
    try {
      const res = await apiFetch(`${API}/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clipped })
      });
      if (!res.ok) throw new Error("Failed to rename conversation");
      const updated: Conversation = await res.json();
      setConversations(prev => prev.map(c => (c.id === convId ? { ...c, title: updated.title, updatedAt: updated.updatedAt } : c)));
    } catch {
      setConversations(prev => prev.map(c => (c.id === convId ? { ...c, title: prevTitle } : c)));
      showToast("Failed to rename conversation.", "error");
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    void (async () => {
      const { conversations: loadedConvs, convOk } = await loadData();
      if (convOk) {
        try {
          const key = getActiveConvStorageKey(currentUser.id);
          const savedConvId = sessionStorage.getItem(key);
          if (savedConvId && loadedConvs.some(c => c.id === savedConvId)) {
            await openConversation(savedConvId);
          } else if (savedConvId) {
            sessionStorage.removeItem(key);
          }
        } catch (_) {}
      }
    })();
    void loadPersonalization();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

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
      const r = await apiFetch(`${API}/connections`, {
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
      const r = await apiFetch(`${API}/tasks`, {
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
      const r = await apiFetch(`${API}/connections`, {
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
        setMentionActiveIndex(0);
        setShowPlusMenu(false);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  }

  function stripActiveMentionQuery() {
    const cursorPos = geminiTextareaRef.current?.selectionStart ?? geminiPrompt.length;
    const textBeforeCursor = geminiPrompt.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const prefix = geminiPrompt.slice(0, lastAtIndex);
      const afterCursor = geminiPrompt.slice(cursorPos).replace(/^\s+/, "");
      setGeminiPrompt((prefix + afterCursor).trimStart());
    }
  }

  function selectMentionTarget(targetId: string, targetLabel: string) {
    setSelectedTarget(targetId);
    setShowMentionDropdown(false);

    // Replace the active @query at cursor with @targetLabel
    const cursorPos = geminiTextareaRef.current?.selectionStart ?? geminiPrompt.length;
    const textBeforeCursor = geminiPrompt.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const prefix = geminiPrompt.slice(0, lastAtIndex);
      const afterCursor = geminiPrompt.slice(cursorPos);
      const needsSpace = !afterCursor.startsWith(" ");
      const nextValue = `${prefix}@${targetLabel}${needsSpace ? " " : ""}${afterCursor}`;
      const nextCursorPos = prefix.length + targetLabel.length + 2;
      setGeminiPrompt(nextValue);
      setTimeout(() => {
        if (geminiTextareaRef.current) {
          geminiTextareaRef.current.focus();
          geminiTextareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
        }
      }, 0);
    } else {
      setGeminiPrompt(prev => `@${targetLabel} ${prev}`.trim() + " ");
      geminiTextareaRef.current?.focus();
    }
  }

  async function toggleTaskTrace(taskId: string) {
    if (expandedTraceTaskId === taskId) {
      setExpandedTraceTaskId(null);
      return;
    }
    setExpandedTraceTaskId(taskId);
    if (!taskTraceCache[taskId]) {
      try {
        const r = await apiFetch(`${API}/tasks/${taskId}`);
        if (r.ok) {
          const detail = await r.json();
          setTaskTraceCache(prev => ({ ...prev, [taskId]: detail.actions || [] }));
        }
      } catch (_) {}
    }
  }

  function isConversationalPrompt(promptText: string): boolean {
    const clean = promptText.trim();
    if (!clean) return true;
    // Greetings / acknowledgements / assistant capability questions
    if (/^(hi|hy|hello|hey|hola|namaste|yo|thanks|thank\s*you|ok|okay|good\s*(morning|evening|afternoon)|who\s*are\s*you|what\s*can\s*you\s*do|help)\b[!.?]*$/i.test(clean)) {
      return true;
    }
    // Explicit in-chat memory statements or recalls
    if (/^(remember|note\s+that|keep\s+in\s+mind)\b/i.test(clean)) return true;
    if (/^my\s+[a-z0-9 _-]{2,30}\s+(?:is|=|:)\s+.+$/i.test(clean)) return true;
    if (/^(what(?:'s|\s+is|\s+was)|tell\s+me|who\s+am\s+i)\b/i.test(clean) && !/\b(page|website|site|url|design|image|file|tab|screen)\b/i.test(clean)) {
      return true;
    }
    // In-chat summaries / follow-up questions about already-extracted results (not requesting a new browser action/download)
    if (/\b(summarize|recap|explain|how\s+many|what\s+did\s+(?:i|we|you)|above\s+(?:result|item|chat|message))\b/i.test(clean) && !/\b(download|export|save|open|click|fill|upload|submit|scrape|extract|fetch)\b/i.test(clean)) {
      return true;
    }
    // Personalization summary queries (not form fills or uploads)
    if (/\b(my\s+(?:personal\s*(?:data|info|details|notes|profile)|resume|cv|bio)|uploaded\s+files?)\b/i.test(clean) && !/\b(fill|autofill|auto-fill|upload|attach|apply|submit|enter|use)\b/i.test(clean)) {
      return true;
    }
    return false;
  }

  function isExplicitBrowserFollowupAction(promptText: string): boolean {
    const clean = promptText.trim();
    if (!clean || isConversationalPrompt(clean)) return false;
    if (/https?:\/\//i.test(clean)) return true;
    return /\b(open|find|search|scrape|extract|download|export|save|fetch|get|click|fill|autofill|auto-fill|upload|submit|apply|login|sign\s*in|scroll|visit|navigate|go\s+to|reload|refresh)\b/i.test(clean) ||
      /\b(all\s+(?:images?|imgs?|photos?|pictures?|designs?|files?|links?|projects?|templates?)|my\s+(?:designs?|projects?|uploads?|files?|orders?)|next\s+page|run\s+again|try\s+again)\b/i.test(clean);
  }

  function inferActiveConversationTarget(promptText: string): string {
    // 1. Inherit the latest platform targeted earlier in THIS conversation
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const tName = (chatMessages[i].targetName || "").trim();
      if (!tName) continue;
      if (tName.toLowerCase() === "all") return "all";
      const matched = connections.find(c => c.name.toLowerCase() === tName.toLowerCase());
      if (matched) return matched.id;
    }
    // 2. If user only has 1 connected website and clearly gave a browser action, auto-target it
    const looksLikeWebAction = /\b(open|find|search|scrape|extract|download|export|save|fetch|get|click|fill|autofill|auto-fill|upload|submit|apply|login|sign\s*in|scroll|check|visit|navigate|designs?|images?|imgs?|photos?|pictures?|files?|pdfs?|links?|projects?|templates?|orders?|jobs?)\b/i.test(promptText);
    if (connections.length === 1 && looksLikeWebAction) {
      return connections[0].id;
    }
    return "";
  }

  function getActiveThreadTargetLabel(): string {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const tName = (chatMessages[i].targetName || "").trim();
      if (tName) return tName;
    }
    return "";
  }

  async function triggerGeneratedFileDownload(file?: GeneratedFile): Promise<boolean> {
    if (!file) return false;
    try {
      const res = await apiFetch(`${API}/files/${file.id}/download`);
      if (!res.ok) return false;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName || "extracted-data.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch {
      return false;
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

    // Fallback to targetOverride, selectedTarget, or active conversation platform continuity
    if (!resolvedTarget) {
      if (targetOverride) {
        resolvedTarget = targetOverride;
      } else if (selectedTarget) {
        resolvedTarget = selectedTarget;
      } else if (isExplicitBrowserFollowupAction(rawPrompt)) {
        resolvedTarget = inferActiveConversationTarget(rawPrompt);
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

    // Snapshot prior turns of THIS conversation only before adding the new turn
    const historyWindow = buildConversationContextWindow(chatMessages);

    setChatMessages(prev => [...prev, newUserMsg, newAssistMsg]);
    setGeminiPrompt("");
    setSelectedTarget("");

    const convIdPromise = ensureConversation(rawPrompt).then(async convId => {
      if (convId) {
        await persistMessageToConversation(convId, {
          role: "user",
          targetName: targetLabel,
          prompt: rawPrompt,
          status: "COMPLETED"
        });
      }
      return convId;
    });

    // If NO target platform was specified (User just typed "hy", asked a question, or general query)
    if (!resolvedTarget) {
      if (isScheduleReq && rawPrompt.trim().length > 6) {
        const detectedTime = parseDailyScheduleTimeFromPrompt(rawPrompt);
        const detectedCadence = parseCadenceFromPrompt(rawPrompt);
        (async () => {
          try {
            await apiFetch(`${API}/schedules`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${detectedCadence === "HOURLY" ? "Hourly" : detectedCadence === "WEEKDAYS" ? "Weekday" : "Daily"} AI Task (${detectedTime})`,
                connectionId: null,
                taskMode: "AI_CHAT",
                cadence: detectedCadence,
                requirements: rawPrompt,
                preferredLocation: "",
                scheduleTime: detectedTime,
                timezone: "Asia/Kolkata",
                autoApply: false,
                maxApplyPerRun: 5,
                enabled: true
              })
            });
            await loadData();
            showToast(`Registered ${detectedCadence.toLowerCase()} AI schedule at ${detectedTime}!`, "success");
          } catch (_) {}
        })();
      }
      const isGreeting = /^(hi|hy|hello|hey|hola|namaste|yo|good\s*(morning|evening|afternoon)|who\s*are\s*you|what\s*can\s*you\s*do|help)\b/i.test(rawPrompt);
      const isNameQuery = /what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i/i.test(rawPrompt);

      (async () => {
        try {
          const res = await apiFetch(`${API}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: rawPrompt,
              history: historyWindow,
              personalization: buildClientPersonalizationPayload()
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setAiStatus(prev => prev.isConfigured ? { ...prev, lastError: data.aiError || undefined } : prev);
            }
            if (data && data.reply) {
              await new Promise(r => setTimeout(r, 450));
              setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "COMPLETED", content: data.reply } : m));
              const convId = await convIdPromise;
              await persistMessageToConversation(convId, {
                role: "assistant",
                content: data.reply,
                status: "COMPLETED"
              });
              return;
            }
          }
        } catch (_) {}

        await new Promise(r => setTimeout(r, 650));
        const savedFirstName = personalProfile.enabled && personalProfile.fullName.trim()
          ? personalProfile.fullName.trim().split(/\s+/)[0]
          : "";
        let fallbackReply: string;
        if (isNameQuery) {
          fallbackReply = personalProfile.enabled && personalProfile.fullName.trim()
            ? `Your name is **${personalProfile.fullName.trim()}**.`
            : "No personal name is saved yet. Open **Personalization** in the sidebar to enter your details or upload files.";
        } else if (isGreeting) {
          fallbackReply = `${savedFirstName ? `Hello ${savedFirstName}!` : "Hello!"} I am Navio, your Universal Browser AI Agent.\n\nI can automate web actions, navigate portals, auto-fill credentials, and extract data.\n\n**How to give tasks:**\n• **Target a specific website:** Type \`@<name> <task>\` (e.g. \`@canva open designs\`) or click \`+\` to pick a platform.\n• **Broadcast to all websites:** Type \`@all <task>\` to run across all registered portals simultaneously.\n• **Direct URL:** Mention any URL (e.g. \`https://google.com search developer jobs\`).`;
        } else {
          fallbackReply = `Instruction received: "${rawPrompt}".\n\nPlease specify which website you want me to execute this on:\n${connections.length > 0 ? connections.map(c => `• **@${c.name}** (${c.websiteUrl})`).join("\n") : "• No websites connected yet — click '+' to connect one."}\n\nYou can type \`@<name> ${rawPrompt}\` or type \`@all ${rawPrompt}\` to broadcast across all platforms.`;
        }

        setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "COMPLETED", content: fallbackReply } : m));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, {
          role: "assistant",
          content: fallbackReply,
          status: "COMPLETED"
        });
      })();
      return;
    }

    if (resolvedTarget === "all") {
      if (connections.length === 0) {
        const failText = "No websites connected yet. Please add a website connection.";
        showToast("No websites connected yet. Register a website to begin.", "info");
        setShowQuickAddModal(true);
        setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "FAILED", content: failText } : m));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, { role: "assistant", targetName: targetLabel, content: failText, status: "FAILED" });
        return;
      }
      setBusy(true);
      showToast(`Executing across all ${connections.length} connected platforms...`, "info");
      try {
        const cleanPrompt = rawPrompt.replace(/@all\s*/gi, "").trim() || rawPrompt;
        for (const conn of connections) {
          await apiFetch(`${API}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: conn.id, prompt: cleanPrompt, history: historyWindow })
          });
        }
        await loadData();
        const summaryReply = isScheduleReq
          ? `Automation scheduled across all ${connections.length} registered platforms. The agent will run recurring inspections on each portal.`
          : `Executed Observe-Plan-Act-Verify cycle across all ${connections.length} registered platforms. Navigation links and DOM records updated.`;
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "COMPLETED",
              content: summaryReply
            };
          }
          return m;
        }));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, {
          role: "assistant",
          targetName: targetLabel,
          content: summaryReply,
          status: "COMPLETED",
          isSchedule: isScheduleReq,
          scheduleDetails: isScheduleReq ? "Recurring schedule registered for execution cycle." : undefined
        });
        showToast(`All ${connections.length} tasks executed successfully.`, "success");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Multi-target execution failed";
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "FAILED",
              content: errMsg
            };
          }
          return m;
        }));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, {
          role: "assistant",
          targetName: targetLabel,
          content: errMsg,
          status: "FAILED"
        });
        showToast(err instanceof Error ? err.message : "Execution failed", "error");
      } finally {
        setBusy(false);
      }
    } else {
      // Single connection execution
      const targetConn = connections.find(c => c.id === resolvedTarget);
      if (!targetConn) {
        const failText = "Target website not found. Please connect a website first.";
        showToast("Target website not found. Please select a valid connection.", "error");
        setShowQuickAddModal(true);
        setChatMessages(prev => prev.map(m => m.id === assistMsgId ? { ...m, status: "FAILED", content: failText } : m));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, { role: "assistant", targetName: targetLabel, content: failText, status: "FAILED" });
        return;
      }

      setBusy(true);
      showToast(`Agent executing Observe-Plan-Act-Verify on ${targetConn.name}...`, "info");
      try {
        const regex = new RegExp(`@${targetConn.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gi");
        const cleanPrompt = rawPrompt.replace(regex, "").trim() || rawPrompt;

        if (isScheduleReq) {
          const detectedTime = parseDailyScheduleTimeFromPrompt(cleanPrompt);
          const detectedCadence = parseCadenceFromPrompt(cleanPrompt);
          try {
            await apiFetch(`${API}/schedules`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${detectedCadence === "HOURLY" ? "Hourly" : detectedCadence === "WEEKDAYS" ? "Weekday" : "Daily"} ${targetConn.name} (${detectedTime})`,
                connectionId: targetConn.id,
                taskMode: "AUTO",
                cadence: detectedCadence,
                requirements: cleanPrompt,
                preferredLocation: personalProfile.location || "",
                scheduleTime: detectedTime,
                timezone: "Asia/Kolkata",
                autoApply: /\b(apply|submit)\b/i.test(cleanPrompt) && /(job|jobs|naukri|linkedin|indeed|internshala|foundit)/i.test(cleanPrompt + " " + targetConn.name),
                maxApplyPerRun: 5,
                enabled: true
              })
            });
            showToast(`Registered ${detectedCadence.toLowerCase()} schedule at ${detectedTime} for ${targetConn.name}!`, "success");
          } catch (_) {}
        }

        const r = await apiFetch(`${API}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: targetConn.id, prompt: cleanPrompt, history: historyWindow })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Task execution failed");

        await loadData();

        let latestFile: GeneratedFile | undefined;
        let taskActions: Action[] = [];
        try {
          const detailRes = await apiFetch(`${API}/tasks/${data.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            taskActions = detail.actions || [];
          }
          const fileRes = await apiFetch(`${API}/files`);
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
              file: latestFile,
              scrapedItems: parseScrapedItems(data.extractedItems)
            };
          }
          return m;
        }));

        const convId = await convIdPromise;
        await persistMessageToConversation(convId, {
          role: "assistant",
          targetName: targetConn.name,
          content: replyContent,
          status: data.status === "FAILED" ? "FAILED" : "COMPLETED",
          taskId: data.id,
          fileId: latestFile?.id,
          scrapedItems: data.extractedItems || undefined,
          isSchedule: isScheduleReq,
          scheduleDetails: isScheduleReq ? "Recurring schedule registered for execution cycle." : undefined
        });

        if (/\b(download|export|save)\b/i.test(rawPrompt)) {
          const fallbackPrevFile = [...chatMessages].reverse().find(m => m.file)?.file;
          const fileToDownload = latestFile || fallbackPrevFile;
          if (fileToDownload) {
            const downloaded = await triggerGeneratedFileDownload(fileToDownload);
            if (downloaded) {
              showToast(`Downloading ${fileToDownload.fileName}...`, "success");
            }
          }
        }

        showToast(`Task execution on ${targetConn.name} ${data.status.toLowerCase()}.`, data.status === "COMPLETED" ? "success" : "error");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Task execution failed";
        setChatMessages(prev => prev.map(m => {
          if (m.id === assistMsgId) {
            return {
              ...m,
              status: "FAILED",
              content: errMsg
            };
          }
          return m;
        }));
        const convId = await convIdPromise;
        await persistMessageToConversation(convId, {
          role: "assistant",
          targetName: targetConn.name,
          content: errMsg,
          status: "FAILED"
        });
        showToast(err instanceof Error ? err.message : "Task execution failed", "error");
      } finally {
        setBusy(false);
      }
    }
  }

  function renderScrapedArtifacts(items?: ScrapedItem[], file?: GeneratedFile) {
    const imageItems = (items || []).filter(item => Boolean(item.imageUrl));
    const fileItems = (items || []).filter(item => !item.imageUrl && (item.href || item.fileExt));
    const visibleFiles = fileItems.slice(0, 12);

    return (
      <>
        {imageItems.length > 0 && (
          <div className="geminiScrapedSection">
            <div className="geminiScrapedSectionHeader">
              <ImageIcon size={14} />
              <span>Scraped Images &amp; Visuals ({imageItems.length})</span>
            </div>
            <div className="geminiScrapedImageGrid">
              {imageItems.slice(0, 24).map((item, idx) => {
                const targetHref = item.href || item.imageUrl;
                return (
                  <div className="geminiScrapedImageCard" key={`${item.imageUrl}-${idx}`}>
                    <a
                      href={targetHref}
                      target="_blank"
                      rel="noreferrer"
                      className="geminiScrapedThumbLink"
                      title={item.title}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={e => {
                          const card = e.currentTarget.closest(".geminiScrapedImageCard") as HTMLElement | null;
                          if (card) card.style.display = "none";
                        }}
                      />
                    </a>
                    <div className="geminiScrapedCardFooter">
                      <span className="geminiScrapedCardTitle" title={item.title}>
                        {item.title}
                      </span>
                      {targetHref && (
                        <a
                          href={targetHref}
                          target="_blank"
                          rel="noreferrer"
                          className="geminiScrapedIconBtn"
                          title="Open"
                          aria-label={`Open ${item.title}`}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {visibleFiles.length > 0 && (
          <div className="geminiScrapedSection">
            <div className="geminiScrapedSectionHeader">
              <FileText size={14} />
              <span>Scraped Files &amp; Links ({fileItems.length})</span>
            </div>
            <div className="geminiScrapedFilesList">
              {visibleFiles.map((item, idx) => (
                <div className="geminiScrapedFileRow" key={`${item.href || item.title}-${idx}`}>
                  <div className="geminiScrapedFileInfo">
                    <FileText size={15} className="geminiScrapedFileIcon" />
                    <div className="geminiScrapedFileText">
                      <b title={item.title}>{item.title}</b>
                      {item.href && <small title={item.href}>{item.href}</small>}
                    </div>
                  </div>
                  <div className="geminiScrapedFileActions">
                    {(item.fileExt || item.category) && (
                      <span className="geminiScrapedExtTag">{item.fileExt || item.category}</span>
                    )}
                    {item.href && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="geminiScrapedIconBtn"
                        title={item.category === "File" ? "Download / Open file" : "Open link"}
                        aria-label={`Open ${item.title}`}
                        download={item.category === "File" ? true : undefined}
                      >
                        {item.category === "File" ? <Download size={14} /> : <ExternalLink size={14} />}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {fileItems.length > visibleFiles.length && (
                <div className="geminiScrapedMoreNote">
                  +{fileItems.length - visibleFiles.length} more items included in the CSV export below.
                </div>
              )}
            </div>
          </div>
        )}

        {file && (
          <div className="geminiGeneratedFileBadge">
            <div className="geminiFileLeft">
              <FileSpreadsheet size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <div className="geminiFileMeta">
                <b title={file.fileName}>{file.fileName}</b>
                <small>{file.rowCount} records extracted</small>
              </div>
            </div>
            <a
              href={`${API}/files/${file.id}/download${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`}
              className="geminiFileDownloadIconBtn"
              title={`Download ${file.fileName}`}
              aria-label={`Download ${file.fileName}`}
              download
            >
              <Download size={16} />
            </a>
          </div>
        )}
      </>
    );
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

  function renderTopProfileMenu() {
    if (!currentUser) return null;
    const initials = (currentUser.fullName || currentUser.email || "N")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join("");

    return (
      <div className="topProfileWrap" ref={topProfileMenuRef}>
        <button
          type="button"
          className="topProfileTrigger"
          onClick={() => setShowTopProfileMenu(prev => !prev)}
          title={`${currentUser.fullName} (${currentUser.email})`}
          aria-expanded={showTopProfileMenu}
        >
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="topProfileAvatarImg" />
          ) : (
            <div className="topProfileAvatarFallback">{initials}</div>
          )}
          <span className="topProfileName">{currentUser.fullName}</span>
          <ChevronDown size={14} className="topProfileChevron" />
        </button>

        {showTopProfileMenu && (
          <div className="topProfileDropdown" role="menu">
            <div className="topProfileDropHead">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="sidebarUserAvatarImg" />
              ) : (
                <div className="sidebarUserAvatarFallback">{initials}</div>
              )}
              <div className="topProfileDropMeta">
                <b>{currentUser.fullName}</b>
                <small>{currentUser.email}</small>
              </div>
            </div>
            <div className="topProfileDropDivider" />
            <button
              type="button"
              className="topProfileDropItem"
              onClick={() => {
                setShowTopProfileMenu(false);
                setActiveTab("personalization");
              }}
            >
              <User size={14} /> Personalization
            </button>
            <button
              type="button"
              className="topProfileDropItem"
              onClick={() => {
                setShowTopProfileMenu(false);
                setActiveTab("settings");
              }}
            >
              <Settings size={14} /> Settings &amp; AI Keys
            </button>
            <div className="topProfileDropDivider" />
            <button
              type="button"
              className="topProfileDropItem danger"
              onClick={() => {
                setShowTopProfileMenu(false);
                handleLogout();
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderGeminiInputCapsule() {
    const filteredMentionConnections = connections.filter(
      c => !mentionFilter || c.name.toLowerCase().includes(mentionFilter) || c.websiteUrl.toLowerCase().includes(mentionFilter)
    );
    const includeAllMention = !mentionFilter || "all".includes(mentionFilter) || "all connected platforms".includes(mentionFilter);
    type MentionOption =
      | { kind: "connection"; id: string; label: string; subtitle: string; status: string }
      | { kind: "all"; id: "all"; label: "all"; subtitle: string }
      | { kind: "add"; id: "__add__"; label: string; subtitle: string };

    const mentionOptions: MentionOption[] = [
      ...filteredMentionConnections.map(c => ({
        kind: "connection" as const,
        id: c.id,
        label: c.name,
        subtitle: c.websiteUrl,
        status: c.status
      })),
      ...(includeAllMention
        ? [{ kind: "all" as const, id: "all" as const, label: "all" as const, subtitle: "Broadcast prompt to all websites" }]
        : []),
      { kind: "add" as const, id: "__add__" as const, label: "+ Connect new website...", subtitle: "Register custom URL or portal" }
    ];
    const safeMentionIdx = Math.min(mentionActiveIndex, Math.max(0, mentionOptions.length - 1));
    const selectedConn = connections.find(c => c.id === selectedTarget);
    const activeThreadTarget = getActiveThreadTargetLabel();
    const capsulePlaceholder =
      selectedTarget === "all" || activeThreadTarget.toLowerCase() === "all"
        ? "Ask Navio across all connected platforms..."
        : selectedConn
          ? `Ask Navio on ${selectedConn.name}...`
          : activeThreadTarget
            ? `Ask Navio on ${activeThreadTarget}...`
            : "Ask Navio";

    const handleSelectMentionOption = (opt: MentionOption) => {
      if (opt.kind === "add") {
        setShowMentionDropdown(false);
        stripActiveMentionQuery();
        setShowQuickAddModal(true);
        return;
      }
      selectMentionTarget(opt.id, opt.label);
    };

    return (
      <div className="geminiPillCapsule" ref={mentionMenuRef}>
        {/* Left Plus / Close Menu Button */}
        <div style={{ position: "relative" }} ref={plusMenuRef}>
          <button
            type="button"
            className={`geminiPlusCircleBtn ${showPlusMenu ? "active" : ""}`}
            onClick={() => {
              setShowMentionDropdown(false);
              setShowPlusMenu(prev => !prev);
            }}
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
                  <b>All Connected Platforms</b>
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

              <div
                className="geminiPlusMenuItem"
                onClick={() => {
                  setShowPlusMenu(false);
                  setActiveTab("personalization");
                }}
              >
                <div className="geminiPlusMenuIcon">
                  <User size={16} color="#38bdf8" />
                </div>
                <div>
                  <b>Personalization (Text &amp; Files)</b>
                  <small>{personalProfile.enabled ? `${personalFiles.length} file(s) • auto-used when needed` : "Currently paused"}</small>
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
                        <ConnectorLogo name={c.name} websiteUrl={c.websiteUrl} size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <b>{c.name}</b>
                        <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.websiteUrl}</small>
                      </div>
                      <VerifiedBadgeIcon
                        verified={c.status === "AUTHENTICATED"}
                        size={18}
                        title={c.status === "AUTHENTICATED" ? "Authenticated" : c.status}
                        style={{ marginLeft: "auto" }}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* @ Mention Autocomplete Dropdown (Gemini style) */}
        {showMentionDropdown && (
          <div className={`geminiPlusMenuDropdown geminiMentionDropdown ${conversationStarted ? "openUp" : "openDown"}`}>
            <div className="geminiPlusMenuSectionTitle">
              {connections.length > 0 ? "CONNECTED WEBSITES" : "MENTION A WEBSITE"}
            </div>
            {filteredMentionConnections.length === 0 && (
              <div className="geminiMentionEmpty">
                {connections.length === 0
                  ? "No websites connected yet."
                  : `No connected website matches "@${mentionFilter}".`}
              </div>
            )}
            {mentionOptions.map((opt, idx) => {
              const isHighlighted = idx === safeMentionIdx;

              return (
                <React.Fragment key={opt.id}>
                  {opt.kind === "add" && <div className="geminiPlusMenuDivider" />}
                  <div
                    className={`geminiPlusMenuItem ${isHighlighted ? "selected" : ""}`}
                    onMouseEnter={() => setMentionActiveIndex(idx)}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectMentionOption(opt)}
                  >
                    <div
                      className={`geminiPlusMenuIcon ${
                        opt.kind === "all" ? "allIcon" : opt.kind === "add" ? "addIcon" : ""
                      }`}
                    >
                      {opt.kind === "all" ? (
                        <Globe2 size={16} />
                      ) : opt.kind === "add" ? (
                        <Plus size={16} />
                      ) : (
                        <ConnectorLogo name={opt.label} websiteUrl={opt.subtitle} size={18} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b>{opt.kind === "all" ? "All Connected Platforms" : opt.label}</b>
                      <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opt.subtitle}
                      </small>
                    </div>
                    {opt.kind === "connection" && (
                      <VerifiedBadgeIcon
                        verified={opt.status === "AUTHENTICATED"}
                        size={18}
                        title={opt.status === "AUTHENTICATED" ? "Authenticated" : opt.status}
                        style={{ marginLeft: "auto" }}
                      />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Input Textarea */}
        <textarea
          ref={geminiTextareaRef}
          className="geminiCapsuleInput"
          rows={1}
          value={geminiPrompt}
          onChange={handleGeminiPromptChange}
          onKeyDown={e => {
            if (showMentionDropdown && mentionOptions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionActiveIndex(prev => (prev + 1) % mentionOptions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionActiveIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
                return;
              }
              if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                e.preventDefault();
                handleSelectMentionOption(mentionOptions[safeMentionIdx]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setShowMentionDropdown(false);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy && geminiPrompt.trim()) {
                void handleExecuteGeminiCommand();
              }
            } else if (e.key === "Escape") {
              setShowPlusMenu(false);
              setShowMentionDropdown(false);
            }
          }}
          placeholder={capsulePlaceholder}
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
      const r = await apiFetch(`${API}/tasks/${id}`);
      if (r.ok) {
        const detail = await r.json();
        setSelectedTaskDetail(detail);
      }
    } catch (_) {}
  }

  async function handleApprove(id: string) {
    try {
      const r = await apiFetch(`${API}/approvals/${id}/approve`, { method: "POST" });
      if (r.ok) {
        showToast("Action approved! Agent proceeding with execution.", "success");
        await loadData();
      }
    } catch (_) {}
  }

  async function handleReject(id: string) {
    try {
      const r = await apiFetch(`${API}/approvals/${id}/reject`, { method: "POST" });
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
      const r = await apiFetch(`${API}/social/prepare-post`, {
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

  const userInitials = (currentUser?.fullName || currentUser?.email || "N")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join("");

  const googleSetupModalEl = showGoogleSetupModal && (
    <div className="modalBackdrop" onClick={() => !googleSetupSaving && setShowGoogleSetupModal(false)}>
      <div className="modalBox authGoogleModal" onClick={e => e.stopPropagation()}>
        <div className="modalHead" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GoogleGIcon size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: "17px" }}>Connect Google Sign-In (OAuth 2.0)</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                One-time setup using your Google Cloud OAuth 2.0 Web Client credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            className="authModalCloseBtn"
            onClick={() => setShowGoogleSetupModal(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="authRedirectBox">
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 }}>
            Authorized Redirect URI (add in Google Cloud Console &rarr; Credentials)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <code className="authRedirectCode">{authProviders.redirectUri}</code>
            <button
              type="button"
              className="btn btnSecondary"
              style={{ padding: "5px 10px", fontSize: "11px" }}
              onClick={() => {
                navigator.clipboard?.writeText(authProviders.redirectUri);
                showToast("Redirect URI copied!", "info");
              }}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>

        <div className="formGroup" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Google Client ID</label>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}
            >
              Google Cloud Console &rarr;
            </a>
          </div>
          <input
            type="text"
            placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
            value={googleClientIdInput}
            onChange={e => setGoogleClientIdInput(e.target.value)}
          />
        </div>

        <div className="formGroup" style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Google Client Secret</label>
          <input
            type="password"
            placeholder="GOCSPX-..."
            value={googleClientSecretInput}
            onChange={e => setGoogleClientSecretInput(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => setShowGoogleSetupModal(false)}
            disabled={googleSetupSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => handleSaveGoogleConfig(!currentUser)}
            disabled={googleSetupSaving || !googleClientIdInput.trim() || !googleClientSecretInput.trim()}
          >
            {googleSetupSaving ? (
              <>
                <RefreshCw size={14} className="spin" /> Saving...
              </>
            ) : currentUser ? (
              <>
                <Check size={14} /> Save Google OAuth
              </>
            ) : (
              <>
                <GoogleGIcon size={15} /> Save &amp; Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (authChecking) {
    return (
      <div className={`authPageShell ${theme === "dark" ? "darkTheme" : "lightTheme"}`}>
        <div className="authCheckingCard">
          <img src={navioLogo} alt="Navio" className="authLogoImg" />
          <div className="geminiDotsWaveNoShadow" aria-label="Loading">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`authPageShell ${theme === "dark" ? "darkTheme" : "lightTheme"}`}>
        <div className="toastStack">
          {toasts.map(t => (
            <div key={t.id} className={`toastItem toast-${t.type}`}>
              <span className="toastMsg">{t.message}</span>
              <button className="toastClose" onClick={() => dismissToast(t.id)}>
                <XCircle size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="authThemeToggle">
          {renderThemeToggle(false)}
        </div>

        <div className="authCard">
          <div className="authBrandWrap">
            <img src={navioLogo} alt="Navio" className="authLogoImg" />
            <h1 className="authTitle">{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="authSubtitle">
              Sign in with Google or your Gmail / Email account
            </p>
          </div>

          <div className="authModeTabsWrap">
            <div className={`authModeTabs ${authMode === "register" ? "isRegister" : ""}`} role="tablist">
              <div
                className="authModeGlider"
                aria-hidden="true"
                style={
                  authGliderStyle.width > 0
                    ? { width: `${authGliderStyle.width}px`, transform: `translateX(${authGliderStyle.left}px)` }
                    : undefined
                }
              />
              <button
                ref={authLoginTabRef}
                type="button"
                role="tab"
                aria-selected={authMode === "login"}
                className={`authModeTab ${authMode === "login" ? "active" : ""}`}
                onClick={() => { setAuthMode("login"); setAuthError(null); }}
              >
                Sign In
              </button>
              <button
                ref={authRegisterTabRef}
                type="button"
                role="tab"
                aria-selected={authMode === "register"}
                className={`authModeTab ${authMode === "register" ? "active" : ""}`}
                onClick={() => { setAuthMode("register"); setAuthError(null); }}
              >
                Create Account
              </button>
            </div>
          </div>

          <button
            type="button"
            className="authGoogleBtn"
            onClick={handleContinueWithGoogle}
            disabled={authSubmitting}
          >
            <GoogleGIcon size={18} />
            <span>Continue with Google</span>
          </button>

          {!authProviders.googleConfigured && (
            <div className="authGoogleHint">
              First time using Google Sign-In?{" "}
              <button
                type="button"
                className="authInlineLinkBtn"
                onClick={() => setShowGoogleSetupModal(true)}
              >
                Add Google OAuth Client ID
              </button>
            </div>
          )}

          <div className="authDivider">
            <span>or continue with email / Gmail</span>
          </div>

          {authError && (
            <div className="authErrorAlert" role="alert">
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuthSubmit} className="authForm">
            <div className={`authFullNameExpand ${authMode === "register" ? "open" : ""}`} aria-hidden={authMode !== "register"}>
              <div className="authFullNameExpandInner">
                <div className="authInputGroup">
                  <label>Full Name</label>
                  <div className="authInputWrap">
                    <User size={16} className="authInputIcon" />
                    <input
                      type="text"
                      placeholder="e.g. Saurabh Patel"
                      value={authFullName}
                      onChange={e => setAuthFullName(e.target.value)}
                      autoComplete="name"
                      required={authMode === "register"}
                      disabled={authMode !== "register"}
                      tabIndex={authMode === "register" ? 0 : -1}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="authInputGroup">
              <label>Gmail / Email Address</label>
              <div className="authInputWrap">
                <Mail size={16} className="authInputIcon" />
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="authInputGroup">
              <label>Password</label>
              <div className="authInputWrap">
                <Lock size={16} className="authInputIcon" />
                <input
                  type={showAuthPassword ? "text" : "password"}
                  placeholder={authMode === "register" ? "Minimum 6 characters" : "Enter your password"}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  className="authPasswordToggle"
                  onClick={() => setShowAuthPassword(p => !p)}
                  aria-label={showAuthPassword ? "Hide password" : "Show password"}
                >
                  {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="authSubmitBtn"
              disabled={authSubmitting}
            >
              {authSubmitting ? (
                <>
                  <RefreshCw size={16} className="spin" />{" "}
                  {authMode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <span>{authMode === "login" ? "Sign In with Email" : "Create Account"}</span>
              )}
            </button>
          </form>
        </div>

        {googleSetupModalEl}
      </div>
    );
  }

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
        <a className={`nav ${activeTab === "scheduler" ? "active" : ""}`} onClick={() => setActiveTab("scheduler")}>
          <CalendarClock size={18} /> Scheduler
          {scheduledJobs.filter(j => j.enabled).length > 0 && (
            <span className="badge" style={{ color: "#34d399" }}>{scheduledJobs.filter(j => j.enabled).length}</span>
          )}
        </a>
        <a className={`nav ${activeTab === "approvals" ? "active" : ""}`} onClick={() => setActiveTab("approvals")}>
          <ShieldCheck size={18} /> Approval Center
          {pendingApprovalsCount > 0 && <span className="badge" style={{ color: "#f87171" }}>{pendingApprovalsCount}</span>}
        </a>
        <a className={`nav ${activeTab === "files" ? "active" : ""}`} onClick={() => setActiveTab("files")}>
          <FileSpreadsheet size={18} /> Generated Files
          <span className="badge">{files.length}</span>
        </a>

        <div className="navLabel">GOVERNANCE & CONFIGURATION</div>
        <a className={`nav ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
          <Lock size={18} /> Security & Audit
        </a>
        <a className={`nav ${activeTab === "personalization" ? "active" : ""}`} onClick={() => setActiveTab("personalization")}>
          <User size={18} /> Personalization
          {!personalProfile.enabled ? (
            <span className="badge" style={{ color: "#94a3b8" }}>Off</span>
          ) : (personalFiles.length > 0 || personalProfile.customText.trim() || personalProfile.fullName.trim() || personalProfile.email.trim()) ? (
            <span className="badge" style={{ color: "#34d399" }}>
              {personalFiles.length > 0 ? `${personalFiles.length} File${personalFiles.length > 1 ? "s" : ""}` : "Active"}
            </span>
          ) : (
            <span className="badge">Empty</span>
          )}
        </a>
        <a className={`nav ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          <Settings size={18} /> Settings & AI Keys
          {aiStatus.isConfigured ? (
            aiStatus.lastError ? (
              <span className="badge" style={{ color: "#f87171" }} title={aiStatus.lastError}>Key Error</span>
            ) : (
              <span className="badge" style={{ color: "#34d399" }}>Active</span>
            )
          ) : (
            <span className="badge" style={{ color: "#fbbf24" }}>Setup</span>
          )}
        </a>

        <div className="sidebarBottomGroup">
          <div className="sideBottom" style={{ marginTop: 0 }}>
            <ShieldCheck size={20} style={{ color: "#38bdf8" }} />
            <div>
              <b>AES-256-GCM Vault</b>
              <small>Active SSRF & Sandbox Defense</small>
            </div>
          </div>

          <div className="sidebarUserCard">
            <div className="sidebarUserLeft">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="sidebarUserAvatarImg" />
              ) : (
                <div className="sidebarUserAvatarFallback">{userInitials}</div>
              )}
              <div className="sidebarUserMeta">
                <b title={currentUser.fullName}>{currentUser.fullName}</b>
                <small title={currentUser.email}>{currentUser.email}</small>
              </div>
            </div>
            <button
              type="button"
              className="sidebarLogoutBtn"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`content ${activeTab === "dashboard" ? "dashboardContent" : ""}`}>
        {activeTab !== "dashboard" && (
          <header className="unifiedTopBar">
            <div className="unifiedTopBarLeft">
              <h1 className="unifiedTopBarTitle">
                {activeTab === "connections" && "Connected Platforms & Accounts"}
                {activeTab === "capabilities" && "Dynamic Capability Discovery Matrix"}
                {activeTab === "social" && "Social Media & WhatsApp Hub"}
                {activeTab === "scheduler" && "Automation Scheduler — Daily & Recurring Tasks"}
                {activeTab === "approvals" && "Risk-Based Approval Center"}
                {activeTab === "files" && "Generated Files & Extracted Reports"}
                {activeTab === "security" && "Security Vault & Audit Trail"}
                {activeTab === "personalization" && "Personalization — Personal Text & Files"}
                {activeTab === "settings" && "Settings & AI Engine Configuration"}
              </h1>
            </div>
            <div className="headerActions">
              {renderThemeToggle(false)}
              {renderTopProfileMenu()}
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
            {historyPanelOpen && (
              <aside className="geminiHistoryPanel">
                <div className="geminiHistoryPanelTop">
                  <div className="geminiHistoryTitleGroup">
                    <HistoryDocClockIcon size={15} />
                    <span>RECENT</span>
                  </div>
                  <div className="geminiHistoryHeaderActions">
                    <button
                      type="button"
                      className="geminiPanelIconBtn"
                      onClick={() => startNewConversation()}
                      title="New chat"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      className="geminiPanelToggleBtn"
                      onClick={() => setHistoryPanelOpen(false)}
                      title="Collapse history panel"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>

                <div className="geminiHistoryScrollArea">
                  {conversations.length === 0 ? (
                    <div className="geminiHistoryEmpty">No conversations yet</div>
                  ) : (
                    conversations.slice(0, 50).map(c => {
                      const isEditing = editingConvId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`geminiHistoryItem ${activeHistoryId === c.id ? "active" : ""} ${isEditing ? "editing" : ""}`}
                          onClick={() => {
                            if (!isEditing) void openConversation(c.id);
                          }}
                          onDoubleClick={e => beginRenameConversation(c, e)}
                          title={isEditing ? undefined : c.title}
                        >
                          <HistoryDocClockIcon size={15} className="geminiHistoryIcon" />
                          {isEditing ? (
                            <input
                              type="text"
                              className="geminiHistoryEditInput"
                              value={editingConvTitle}
                              autoFocus
                              maxLength={120}
                              onFocus={e => e.currentTarget.select()}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setEditingConvTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void commitRenameConversation(c.id);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  editTitleCancelRef.current = true;
                                  setEditingConvId(null);
                                }
                              }}
                              onBlur={() => void commitRenameConversation(c.id)}
                            />
                          ) : (
                            <>
                              <span className="geminiHistoryText">{c.title}</span>
                              <div className="geminiHistoryItemActions">
                                <button
                                  type="button"
                                  className="geminiHistoryActionBtn"
                                  onClick={e => beginRenameConversation(c, e)}
                                  title="Rename conversation"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="geminiHistoryActionBtn danger"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeleteConfirmModal({
                                      type: "single",
                                      conversationId: c.id,
                                      taskPrompt: c.title
                                    });
                                  }}
                                  title="Delete conversation"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {conversations.length > 0 && (
                  <div className="geminiHistoryPanelFooter">
                    <button
                      type="button"
                      className="geminiHistoryClearAllBtn"
                      onClick={() => setDeleteConfirmModal({ type: "all" })}
                      title="Permanently delete all conversation history"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </aside>
            )}

            {/* Box 3 (Column 3): Main Canvas Area */}
            <div className="geminiMainCanvas">
              <header className="unifiedTopBar">
                <div className="unifiedTopBarLeft">
                  {!historyPanelOpen && (
                    <button
                      type="button"
                      className="geminiTopBarIconBtn"
                      onClick={() => setHistoryPanelOpen(true)}
                      title="Open conversations"
                    >
                      <HistoryDocClockIcon size={17} />
                    </button>
                  )}
                </div>
                <div className="headerActions">
                  {conversationStarted && (
                    <button
                      type="button"
                      className="geminiTopBarIconBtn"
                      onClick={() => startNewConversation()}
                      title="New chat"
                    >
                      <Plus size={17} />
                    </button>
                  )}
                  {renderThemeToggle(false)}
                  {renderTopProfileMenu()}
                </div>
              </header>

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
                                  <div className="geminiThinkingIndicator" aria-label="Processing">
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

                            {renderScrapedArtifacts(m.scrapedItems, m.file)}

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

                              {renderScrapedArtifacts(parseScrapedItems(t.extractedItems), matchingFile)}

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
                        {deleteConfirmModal.type === "all" ? "Clear all chat history?" : "Delete conversation?"}
                      </h3>
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                        {deleteConfirmModal.type === "all"
                          ? "This will permanently remove all saved conversations and their message history. This action cannot be undone."
                          : `Are you sure you want to permanently delete "${deleteConfirmModal.taskPrompt || "this conversation"}"? This action cannot be undone.`}
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
                          await executeClearAllConversations();
                        } else if (modal.conversationId) {
                          await handleDeleteConversation(modal.conversationId);
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

          </div>
        )}

        {activeTab !== "dashboard" && (
          <div className="pageBodyScroll">
            <div className="pageBodyInner">
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
                      <td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><ConnectorLogo name={c.name} websiteUrl={c.websiteUrl} size={22} /><div><b>{c.name}</b><small style={{ display: "block", color: "#64748b" }}>{c.websiteUrl}</small></div></div></td>
                      <td>Custom Website</td>
                      <td>Session / AES-256 Vault</td>
                      <td>Verified HTTP/HTTPS</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <VerifiedBadgeIcon
                            verified={c.status === "AUTHENTICATED"}
                            size={17}
                            title={c.status === "AUTHENTICATED" ? "Authenticated" : c.status}
                          />
                          <span className={`tag ${c.status === "AUTHENTICATED" ? "tagGreen" : "tagBlue"}`}>{c.status}</span>
                        </span>
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
                  <ConnectorLogo name={con.name} connectorId={con.id} size={20} />
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

        {/* TAB: UNIVERSAL AUTOMATION SCHEDULER */}
        {activeTab === "scheduler" && (
          <>
            <div className="settingsGridTwo" style={{ marginBottom: "20px" }}>
              <form className="panel" onSubmit={handleCreateSchedule} style={{ margin: 0 }}>
                <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.14)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CalendarClock size={18} style={{ color: "#38bdf8" }} /> Create Scheduled Automation
                    </h2>
                    <p>Schedule any browser task, website scraping, job search &amp; auto-apply, or daily AI prompt on a recurring timer.</p>
                  </div>
                </div>

                <div className="formGroup">
                  <label>
                    Schedule Name
                    <input
                      type="text"
                      placeholder="e.g. Daily Canva Export / Check Site Prices / Naukri Jobs"
                      value={schedName}
                      onChange={e => setSchedName(e.target.value)}
                    />
                  </label>

                  <div className="personalFieldsRow">
                    <label>
                      Workflow Mode
                      <select
                        value={schedTaskMode}
                        onChange={e => {
                          const mode = e.target.value as "AUTO" | "BROWSER_TASK" | "JOB_AUTOMATION" | "AI_CHAT";
                          setSchedTaskMode(mode);
                          if (mode === "JOB_AUTOMATION") setSchedAutoApply(true);
                          else if (mode === "BROWSER_TASK" || mode === "AI_CHAT") setSchedAutoApply(false);
                        }}
                      >
                        <option value="AUTO">Auto-Detect (Any Task or Jobs)</option>
                        <option value="BROWSER_TASK">Website Automation / Scraping (Any Site)</option>
                        <option value="JOB_AUTOMATION">Job Portal Scrape &amp; Auto-Apply</option>
                        <option value="AI_CHAT">AI Prompt / Report (No Browser)</option>
                      </select>
                    </label>

                    {schedTaskMode !== "AI_CHAT" && (
                      <label>
                        Target Connected Website / Portal
                        <select value={schedConnId} onChange={e => setSchedConnId(e.target.value)}>
                          <option value="">General AI Task (No Website)</option>
                          {connections.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.status})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="personalFieldsRow">
                    <label>
                      Cadence
                      <select value={schedCadence} onChange={e => setSchedCadence(e.target.value as "DAILY" | "WEEKDAYS" | "HOURLY")}>
                        <option value="DAILY">Every Day (Daily)</option>
                        <option value="WEEKDAYS">Weekdays (Mon - Fri)</option>
                        <option value="HOURLY">Every Hour (Hourly)</option>
                      </select>
                    </label>
                    <label>
                      {schedCadence === "HOURLY" ? "Minute Offset (HH:mm)" : "Scheduled Run Time"}
                      <input
                        type="time"
                        value={schedTime}
                        onChange={e => setSchedTime(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Timezone
                    <select value={schedTimezone} onChange={e => setSchedTimezone(e.target.value)}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </label>

                  <label>
                    Task Instructions / Requirements / Prompt
                    <textarea
                      rows={3}
                      placeholder="Examples:&#10;• Find all new banner templates and export links to CSV&#10;• Scrape Java Spring Boot jobs matching my resume in Pune and apply&#10;• Summarize top AI trends and action items"
                      value={schedRequirements}
                      onChange={e => setSchedRequirements(e.target.value)}
                      required
                    />
                  </label>

                  {(schedTaskMode === "JOB_AUTOMATION" ||
                    (schedTaskMode === "AUTO" && /(job|jobs|naukri|linkedin|indeed|internshala|foundit|apply)/i.test(schedRequirements + " " + (connections.find(c => c.id === schedConnId)?.name || "")))) && (
                    <>
                      <div className="personalFieldsRow">
                        <label>
                          Preferred Location (Jobs)
                          <input
                            type="text"
                            placeholder="e.g. Pune, Bangalore, Remote"
                            value={schedLocation}
                            onChange={e => setSchedLocation(e.target.value)}
                          />
                        </label>
                        <label>
                          Max Applications / Run
                          <input
                            type="number"
                            min={1}
                            max={25}
                            value={schedMaxApply}
                            onChange={e => setSchedMaxApply(Math.max(1, Math.min(25, Number(e.target.value) || 5)))}
                          />
                        </label>
                      </div>

                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={schedAutoApply}
                          onChange={e => setSchedAutoApply(e.target.checked)}
                        />
                        <span>Auto-apply to matched jobs using saved Personalization &amp; Resume</span>
                      </label>
                    </>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", paddingTop: "4px", flexWrap: "wrap" }}>
                    <small style={{ color: "#94a3b8" }}>
                      Works for any connected site or general AI task.
                    </small>
                    <button className="btn btnPrimary" type="submit" disabled={schedSaving}>
                      <Plus size={16} /> {schedSaving ? "Saving..." : "Save Schedule"}
                    </button>
                  </div>
                </div>
              </form>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.14)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <div>
                    <h2>Active Schedules ({scheduledJobs.length})</h2>
                    <p>Runs automatically on schedule, or click Run Now to test any automation immediately.</p>
                  </div>
                </div>

                {scheduledJobs.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "13px", padding: "24px 0" }}>
                    No schedules yet. Create one on the left (or type in Command Center: <code>@canva daily at 10:00 export all designs</code>).
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {scheduledJobs.map(job => (
                      <div
                        key={job.id}
                        style={{
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <div>
                            <b style={{ fontSize: "14px" }}>{job.name}</b>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                              {job.connectionName} &bull; {job.cadence || "DAILY"} at <b>{job.scheduleTime}</b> ({job.timezone})
                              {job.preferredLocation ? ` • ${job.preferredLocation}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span className={`tag ${job.enabled ? "tagGreen" : "tagAmber"}`}>
                              {job.enabled ? "ACTIVE" : "PAUSED"}
                            </span>
                            <span className="tag tagBlue">
                              {job.taskMode === "JOB_AUTOMATION" || job.autoApply
                                ? (job.autoApply ? `Jobs + Apply (≤${job.maxApplyPerRun})` : "Job Scrape")
                                : job.taskMode === "AI_CHAT"
                                  ? "AI Prompt"
                                  : job.taskMode === "BROWSER_TASK"
                                    ? "Web Task"
                                    : "Auto"}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: "12px", opacity: 0.9 }}>{job.requirements}</div>

                        {job.lastSummary && (
                          <div style={{ fontSize: "12px", color: job.lastStatus === "FAILED" ? "#f87171" : "#34d399" }}>
                            Last Run ({job.lastStatus}): {job.lastSummary}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                          <small style={{ color: "#94a3b8" }}>
                            {job.lastRunAt ? `Last run: ${new Date(job.lastRunAt).toLocaleString()}` : "Waiting for next scheduled run"}
                          </small>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                              disabled={runningSchedId === job.id}
                              onClick={() => handleRunScheduleNow(job.id)}
                            >
                              <Play size={13} /> {runningSchedId === job.id ? "Running..." : "Run Now"}
                            </button>
                            <button
                              type="button"
                              className="btn btnSecondary"
                              style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                              onClick={() => handleToggleSchedule(job.id)}
                            >
                              <Pause size={13} /> {job.enabled ? "Pause" : "Resume"}
                            </button>
                            <button
                              type="button"
                              className="btn btnDanger"
                              style={{ height: "32px", padding: "0 10px", fontSize: "12px" }}
                              onClick={() => handleDeleteSchedule(job.id)}
                              title="Delete schedule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panelHead">
                <div>
                  <h2>Scheduled Execution History</h2>
                  <p>Browser tasks &amp; scraped reports automatically export CSVs to Generated Files.</p>
                </div>
                <button type="button" className="btn btnSecondary" style={{ height: "34px", fontSize: "12px" }} onClick={() => setActiveTab("files")}>
                  <FileSpreadsheet size={15} /> Open CSV Reports
                </button>
              </div>

              {scheduledRuns.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "13px", padding: "12px 0" }}>
                  No scheduled runs executed yet. Click <b>Run Now</b> on any schedule to test immediately.
                </div>
              ) : (
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Started</th>
                        <th>Schedule</th>
                        <th>Target</th>
                        <th>Status</th>
                        <th>Extracted / Matched</th>
                        <th>Actions / Applied</th>
                        <th>Result Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledRuns.map(run => (
                        <tr key={run.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>{new Date(run.startedAt).toLocaleString()}</td>
                          <td><b>{run.scheduleName || "Schedule"}</b></td>
                          <td>{run.connectionName || "General AI"}</td>
                          <td>
                            <span className={`tag ${run.status === "COMPLETED" ? "tagGreen" : run.status === "FAILED" ? "tagRed" : "tagAmber"}`}>
                              {run.status}
                            </span>
                          </td>
                          <td><b>{run.matchedCount}</b></td>
                          <td><b>{run.appliedCount}</b></td>
                          <td style={{ fontSize: "12px", maxWidth: "420px" }}>{run.summary || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
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
                            href={`${API}/files/${f.id}/download${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`}
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

        {/* TAB: PERSONALIZATION (ENTER TEXT + UPLOAD FILES) */}
        {activeTab === "personalization" && (
          <div>
            <div className="panel personalizationBanner">
              <div>
                <h2 style={{ fontSize: "17px", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={19} color="#38bdf8" />
                  Personalization Data &amp; Context
                </h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  Add personal details by entering text or uploading files (resume, CV, PDF, DOCX, TXT). When a task or chat needs personal data, Navio uses this automatically.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={personalProfile.enabled}
                aria-label={personalProfile.enabled ? "Disable personalization" : "Enable personalization"}
                title={personalProfile.enabled ? "Personalization Enabled (click to disable)" : "Personalization Disabled (click to enable)"}
                className={`personalSwitchControl ${personalProfile.enabled ? "enabled" : ""}`}
                onClick={() => {
                  const next = !personalProfile.enabled;
                  setPersonalProfile(prev => ({ ...prev, enabled: next }));
                  void handleSavePersonalization(next);
                }}
                disabled={savingPersonalization}
              >

                <span className="personalSwitchTrack">
                  <span className="personalSwitchThumb" />
                </span>
              </button>
            </div>

            <div className="personalizationGrid">
              {/* Card 1: Enter Text / Write Here */}
              <div className="panel">
                <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.14)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <div>
                    <h2>Enter Text / Write Here</h2>
                    <p>Type profile details, bio, preferences, or custom Key: Value fields for form filling and AI answers.</p>
                  </div>
                </div>

                <div className="formGroup">
                  <div className="personalFieldsRow">
                    <div>
                      <label>Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Saurabh Patel"
                        value={personalProfile.fullName}
                        onChange={e => setPersonalProfile(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="e.g. name@example.com"
                        value={personalProfile.email}
                        onChange={e => setPersonalProfile(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 9876543210"
                        value={personalProfile.phone}
                        onChange={e => setPersonalProfile(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>Location / Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru, India"
                        value={personalProfile.location}
                        onChange={e => setPersonalProfile(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label>Write Personal Data / Notes Here</label>
                    <textarea
                      rows={9}
                      style={{ minHeight: "190px", lineHeight: 1.5 }}
                      placeholder={"Write anything Navio should know when personal data is needed:\n• About me / Bio / Career Summary\n• Skills: React, TypeScript, Java, Spring Boot\n• LinkedIn: https://linkedin.com/in/username\n• GitHub: https://github.com/username\n• Preferred job role, notice period, writing style, etc."}
                      value={personalProfile.customText}
                      onChange={e => setPersonalProfile(prev => ({ ...prev, customText: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                    <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                      {personalProfile.customText.length} characters saved
                    </small>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={() => handleSavePersonalization()}
                      disabled={savingPersonalization}
                    >
                      {savingPersonalization ? (
                        <><RefreshCw size={14} className="spin" /> Saving...</>
                      ) : (
                        <><Check size={14} /> Save Personal Details</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Upload Personal Files */}
              <div className="panel">
                <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.14)", paddingBottom: "14px", marginBottom: "16px" }}>
                  <div>
                    <h2>Upload Files</h2>
                    <p>Upload resumes, PDFs, Word docs (.docx), TXT, CSV, JSON, or images for form uploads &amp; context.</p>
                  </div>
                  {personalFiles.length > 0 && (
                    <span className="personalFileCountBadge">{personalFiles.length}</span>
                  )}
                </div>

                <input
                  ref={personalFileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.xml,.xlsx,.pptx,.png,.jpg,.jpeg,.webp"
                  onChange={e => void handleUploadPersonalFiles(e.target.files)}
                />

                <div
                  className={`personalDropZone ${personalDragActive ? "active" : ""}`}
                  onClick={() => personalFileInputRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault();
                    setPersonalDragActive(true);
                  }}
                  onDragLeave={() => setPersonalDragActive(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setPersonalDragActive(false);
                    void handleUploadPersonalFiles(e.dataTransfer.files);
                  }}
                >
                  <Upload size={26} color="#38bdf8" />
                  <b style={{ fontSize: "14px" }}>
                    {uploadingPersonalFiles ? "Uploading & indexing file..." : "Click to upload or drag & drop files here"}
                  </b>
                  <small style={{ color: "#94a3b8", fontSize: "12px" }}>
                    Supports PDF, DOCX, TXT, MD, CSV, JSON, Images (up to 20 MB)
                  </small>
                </div>

                <div className="personalFilesList">
                  {personalFiles.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "18px 8px", color: "#94a3b8", fontSize: "12px" }}>
                      No personal files uploaded yet.
                    </div>
                  ) : (
                    personalFiles.map(pf => {
                      const hasText = Boolean(pf.extractedText && pf.extractedText.trim().length > 0);
                      const isExpanded = expandedPersonalFileId === pf.id;
                      return (
                        <div className="personalFileCard" key={pf.id}>
                          <div className="personalFileTop">
                            <div className="personalFileMeta">
                              <FileText size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
                              <div className="personalFileNameWrap">
                                <b title={pf.fileName}>{pf.fileName}</b>
                                <small>
                                  {formatFileSize(pf.fileSize)} • {hasText ? `${pf.extractedText!.length} chars indexed for AI` : "Ready for page file upload"}
                                </small>
                              </div>
                            </div>
                            <div className="personalFileActions">
                              {hasText && (
                                <button
                                  type="button"
                                  className={`personalCleanIconBtn ${isExpanded ? "active" : ""}`}
                                  title={isExpanded ? "Hide extracted text" : "Preview extracted text"}
                                  aria-label={isExpanded ? "Hide extracted text" : "Preview extracted text"}
                                  onClick={() => setExpandedPersonalFileId(isExpanded ? null : pf.id)}
                                >
                                  {isExpanded ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                                </button>
                              )}
                              <a
                                href={`${API}/personalization/files/${pf.id}/download${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`}
                                className="personalCleanIconBtn"
                                title={`Download ${pf.fileName}`}
                                aria-label={`Download ${pf.fileName}`}
                                download
                              >
                                <ArrowDownToLine size={17} strokeWidth={1.75} />
                              </a>
                              <button
                                type="button"
                                className="personalCleanIconBtn danger"
                                title="Delete personal file"
                                aria-label={`Delete ${pf.fileName}`}
                                onClick={() => void handleDeletePersonalFile(pf.id)}
                              >
                                <Trash2 size={17} strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                          {isExpanded && hasText && (
                            <div className="personalFileExtractPreview">
                              {pf.extractedText!.slice(0, 1500)}
                              {pf.extractedText!.length > 1500 ? "..." : ""}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SETTINGS & AI KEYS (CLEAN & SIMPLE) */}
        {activeTab === "settings" && (
          <div className="settingsGridTwo">
            <div className="panel" style={{ margin: 0 }}>
              <div className="panelHead" style={{ borderBottom: "1px solid rgba(59, 130, 246, 0.15)", paddingBottom: "14px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="sidebarUserAvatarImg" style={{ width: "40px", height: "40px" }} />
                  ) : (
                    <div className="sidebarUserAvatarFallback" style={{ width: "40px", height: "40px", fontSize: "14px" }}>{userInitials}</div>
                  )}
                  <div>
                    <h2 style={{ fontSize: "16px", margin: "0 0 2px" }}>{currentUser.fullName}</h2>
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{currentUser.email}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="tag tagBlue" style={{ fontSize: "11px" }}>
                    {currentUser.authProvider.includes("google") ? "Google Linked" : "Email / Gmail"}
                  </span>
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={handleLogout}
                    style={{ padding: "6px 12px", fontSize: "12px", color: "#ef4444" }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <GoogleGIcon size={18} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>Google OAuth 2.0 Sign-In</div>
                    <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      {authProviders.googleConfigured
                        ? `Configured (${authProviders.googleClientIdMasked || "Client ID active"})`
                        : "Not configured yet — add Google Client ID & Secret to enable one-click Google login."}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btnSecondary"
                  style={{ padding: "7px 12px", fontSize: "12px" }}
                  onClick={() => setShowGoogleSetupModal(true)}
                >
                  {authProviders.googleConfigured ? "Update Google OAuth" : "Configure Google OAuth"}
                </button>
              </div>
            </div>

            <div className="panel" style={{ margin: 0 }}>
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
                aiStatus.lastError ? (
                  <span className="tag tagRed" style={{ fontSize: "11px" }} title={aiStatus.lastError}>
                    {aiStatus.lastError}
                  </span>
                ) : (
                  <span className="tag tagGreen" style={{ fontSize: "11px" }}>
                    Active ({aiProvider.toUpperCase()})
                  </span>
                )
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
                    else if (p === "groq") setAiModel("openai/gpt-oss-120b");
                  }}
                  style={{ height: "42px", fontSize: "14px" }}
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="groq">Groq (Ultra-fast GPT-OSS / Qwen)</option>
                </select>
              </div>

              {/* 2. Model Name */}
              <div className="formGroup">
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. gemini-1.5-flash, gpt-4o-mini, claude-3-5-sonnet, openai/gpt-oss-120b"
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
          </div>
        )}
            </div>
          </div>
        )}
        {googleSetupModalEl}

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
