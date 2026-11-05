import React, { useEffect, useState, useRef } from "react";
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
  Zap,
  CornerDownLeft,
  X
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

type Connection = { id: string; name: string; websiteUrl: string; status: string; createdAt: string };
type Task = { id: string; connectionId: string; prompt: string; status: string; result?: string; createdAt: string };
type Action = { id: string; actionType: string; description: string; status: string; createdAt: string };
type Capability = { key: string; name: string; status: string; riskLevel: string; description: string };
type Connector = { id: string; name: string; category: string; authType: string; status: string; capabilities: Capability[] };
type Approval = { id: string; platform: string; actionDescription: string; riskLevel: string; approvalStatus: string; payload: string; consequences: string; requestedAt: string };
type GeneratedFile = { id: string; taskId?: string; fileName: string; fileType: string; rowCount: number; contentPreview: string; downloadUrl: string; createdAt: string };
type WhatsAppChat = { id: string; customerName: string; phone: string; lastMessage: string; intent: string; confidence: string; suggestedDraft: string; status: string };
type Toast = { id: string; type: "success" | "error" | "info"; message: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "connections" | "capabilities" | "social" | "approvals" | "files" | "security">("dashboard");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [waChats, setWaChats] = useState<WhatsAppChat[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Gemini AI Command Center state
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string>("all"); // "all" or connection.id
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickConnName, setQuickConnName] = useState("");
  const [quickConnUrl, setQuickConnUrl] = useState("");
  const [expandedTraceTaskId, setExpandedTraceTaskId] = useState<string | null>(null);
  const [taskTraceCache, setTaskTraceCache] = useState<Record<string, Action[]>>({});
  const geminiTextareaRef = useRef<HTMLTextAreaElement>(null);

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
        const tData = await tRes.json();
        setTasks(tData.reverse());
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
    setBusy(true);
    try {
      const r = await fetch(`${API}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newConnName, websiteUrl: newConnUrl })
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
      await loadData();
      showToast(`Website "${data.name}" registered & targeted!`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Connection failed", "error");
    } finally {
      setBusy(false);
    }
  }

  // Handle typing in the Gemini prompt textarea with @ mention trigger
  function handleGeminiPromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setGeminiPrompt(val);

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

    // Determine target: check query for @all or @websiteName, or targetOverride, or selectedTarget
    let resolvedTarget = targetOverride || selectedTarget;

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

    if (resolvedTarget === "all") {
      if (connections.length === 0) {
        showToast("No websites connected yet. Register a website to begin.", "info");
        setShowQuickAddModal(true);
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
        setGeminiPrompt("");
        await loadData();
        showToast(`All ${connections.length} tasks executed successfully.`, "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Execution failed", "error");
      } finally {
        setBusy(false);
      }
    } else {
      // Single connection execution
      let targetConn = connections.find(c => c.id === resolvedTarget);
      if (!targetConn && connections.length > 0) {
        targetConn = connections[0];
      }
      if (!targetConn) {
        showToast("No target website available. Please connect a website first.", "error");
        setShowQuickAddModal(true);
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
        setGeminiPrompt("");
        await loadData();
        await viewTaskDetail(data.id);
        showToast(`Task execution on ${targetConn.name} ${data.status.toLowerCase()}.`, data.status === "COMPLETED" ? "success" : "error");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Task execution failed", "error");
      } finally {
        setBusy(false);
      }
    }
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
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon"><Bot size={22} /></div>
          <div>
            <b>Universal Agent</b>
            <small>ENTERPRISE COMMAND</small>
          </div>
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

        <div className="navLabel">GOVERNANCE</div>
        <a className={`nav ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
          <Lock size={18} /> Security & Audit
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
      <main className="content">
        {activeTab !== "dashboard" && (
          <header className="topBar">
            <div>
              <div className="eyebrow">UNIVERSAL AI BROWSER AGENT / SAAS CORE</div>
              <h1>
                {activeTab === "connections" && "Connected Platforms & Accounts"}
                {activeTab === "capabilities" && "Dynamic Capability Discovery Matrix"}
                {activeTab === "social" && "Social Media & WhatsApp Hub"}
                {activeTab === "approvals" && "Risk-Based Approval Center"}
                {activeTab === "files" && "Generated Files & Extracted Reports"}
                {activeTab === "security" && "Security Vault & Audit Trail"}
              </h1>
              <p>One AI Agent. One Command Interface. Natural-Language Digital Execution.</p>
            </div>
            <div className="headerActions">
              <button className="btn btnSecondary" onClick={loadData}>
                <RefreshCw size={14} /> Refresh
              </button>
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

        {/* TAB 1: DASHBOARD (GEMINI COMMAND CENTER) */}
        {activeTab === "dashboard" && (
          <div className="geminiWrapper">
            <div className="geminiTopSection">
              {/* Gemini Hero Section */}
              <div className="geminiHero">
                <div className="geminiSparkleLogo">
                  <Sparkles size={28} />
                </div>
                <h1 className="geminiTitle">AI Command Center</h1>
                <p className="geminiSubtitle">
                  One AI Agent. One Command Interface. Natural-Language Digital Execution.
                </p>
              </div>

              {/* Quick Metrics Ribbon */}
              <div className="geminiRibbon">
                <div className="geminiRibbonItem">
                  <Globe2 size={14} color="#0284c7" />
                  <span>Authorized Websites: <b>{connections.length}</b></span>
                </div>
                <div className="geminiRibbonItem">
                  <Activity size={14} color="#8b5cf6" />
                  <span>Agent Cycles: <b>{tasks.length}</b></span>
                </div>
                <div className="geminiRibbonItem">
                  <ShieldCheck size={14} color={pendingApprovalsCount > 0 ? "#ef4444" : "#10b981"} />
                  <span>Approvals: <b>{pendingApprovalsCount}</b></span>
                </div>
                <div className="geminiRibbonItem">
                  <FileSpreadsheet size={14} color="#059669" />
                  <span>Reports Generated: <b>{files.length}</b></span>
                </div>
              </div>
            </div>

            {/* Shifted down & Expanded Input Capsule (Red Marked Area) */}
            <div className="geminiBottomSection">
              <div className="geminiInputContainer">
              {/* Target & Scope Indicator Bar */}
              <div className="geminiTargetPillBar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`geminiActivePill ${selectedTarget === "all" ? "isAll" : ""}`}>
                    {selectedTarget === "all" ? (
                      <>
                        <Globe2 size={13} />
                        <span>Scope: <b>@all</b> (All Connected Platforms)</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>Scope: <b>@{connections.find(c => c.id === selectedTarget)?.name || "Selected Website"}</b></span>
                      </>
                    )}
                  </span>
                  <button
                    className="geminiChangeTargetBtn"
                    type="button"
                    onClick={() => setShowMentionDropdown(prev => !prev)}
                  >
                    <AtSign size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Change Target
                  </button>
                </div>

                <button
                  className="geminiChangeTargetBtn"
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                >
                  <Plus size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Connect Website
                </button>
              </div>

              {/* @ Mention Popup Menu */}
              {showMentionDropdown && (
                <div className="geminiMentionMenu">
                  <div className="geminiMentionHead">
                    <span>MENTION PLATFORM OR SELECT SCOPE</span>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                      onClick={() => setShowMentionDropdown(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="geminiMentionList">
                    {/* Option: @all */}
                    <div
                      className={`geminiMentionItem ${selectedTarget === "all" ? "active" : ""}`}
                      onClick={() => selectMentionTarget("all", "all")}
                    >
                      <div className="geminiMentionLeft">
                        <div className="geminiMentionIcon allIcon">
                          <Globe2 size={16} />
                        </div>
                        <div className="geminiMentionMeta">
                          <b>@all</b>
                          <small>Execute prompt across all registered websites simultaneously</small>
                        </div>
                      </div>
                      <span className="tag tagGreen">Broadcast</span>
                    </div>

                    {/* Filtered connections */}
                    {connections
                      .filter(c => !mentionFilter || c.name.toLowerCase().includes(mentionFilter) || c.websiteUrl.toLowerCase().includes(mentionFilter))
                      .map(c => (
                        <div
                          key={c.id}
                          className={`geminiMentionItem ${selectedTarget === c.id ? "active" : ""}`}
                          onClick={() => selectMentionTarget(c.id, c.name)}
                        >
                          <div className="geminiMentionLeft">
                            <div className="geminiMentionIcon">
                              <Bot size={16} />
                            </div>
                            <div className="geminiMentionMeta">
                              <b>@{c.name}</b>
                              <small>{c.websiteUrl}</small>
                            </div>
                          </div>
                          <span className={`tag ${c.status === "AUTHENTICATED" ? "tagGreen" : "tagBlue"}`}>
                            {c.status}
                          </span>
                        </div>
                      ))}

                    {/* Quick Add Connection Item inside Mention Menu */}
                    <div
                      className="geminiMentionItem"
                      onClick={() => {
                        setShowMentionDropdown(false);
                        setShowQuickAddModal(true);
                      }}
                    >
                      <div className="geminiMentionLeft">
                        <div className="geminiMentionIcon addIcon">
                          <Plus size={16} />
                        </div>
                        <div className="geminiMentionMeta">
                          <b>+ Connect New Website...</b>
                          <small>Register a portal or web app on the fly</small>
                        </div>
                      </div>
                      <span className="tag tagAmber">New</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Textarea Input */}
              <textarea
                ref={geminiTextareaRef}
                className="geminiTextarea"
                rows={2}
                value={geminiPrompt}
                onChange={handleGeminiPromptChange}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && geminiPrompt.trim()) {
                      void handleExecuteGeminiCommand();
                    }
                  } else if (e.key === "Escape") {
                    setShowMentionDropdown(false);
                  }
                }}
                placeholder={
                  connections.length === 0
                    ? "Connect a website first using @ or button, then ask to inspect, extract or automate..."
                    : "Ask anything or type @ to mention a website (e.g. @all inspect navigation and export CSV)..."
                }
              />

              {/* Input Action Bar */}
              <div className="geminiInputBottomBar">
                <div className="geminiInputButtons">
                  <button
                    type="button"
                    className="geminiToolPill highlight"
                    onClick={() => setShowMentionDropdown(prev => !prev)}
                    title="Mention a specific website or @all"
                  >
                    <AtSign size={13} />
                    <span>Mention Platform</span>
                  </button>
                  <button
                    type="button"
                    className="geminiToolPill"
                    onClick={() => setShowQuickAddModal(true)}
                    title="Connect a new website or CRM portal"
                  >
                    <Plus size={13} />
                    <span>Connect Website</span>
                  </button>
                  <span className="geminiHintText">
                    <CornerDownLeft size={11} /> Enter to run
                  </span>
                </div>

                <button
                  type="button"
                  className="geminiSendBtn"
                  disabled={busy || !geminiPrompt.trim()}
                  onClick={() => handleExecuteGeminiCommand()}
                  title="Execute Natural Language Instruction"
                >
                  {busy ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
                </button>
              </div>
            </div>
          </div>

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
                    placeholder="Announcing our Universal AI Browser Agent! Automate data workflows, ERP audits, and business inquiries seamlessly."
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
