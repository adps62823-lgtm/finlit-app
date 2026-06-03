import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthCard from "./components/AuthCard";
import AppShell from "./components/AppShell";
import GlobalChatWidget from "./components/GlobalChatWidget";
import LogEditModal from "./components/LogEditModal";
import Splash from "./components/Splash";
import { auth } from "./firebase";
import { apiRequest } from "./services/api";
import { createChatSocket } from "./services/chat";
import { uploadToCloudinary } from "./services/upload";
import { isOverdue } from "./utils/format";

// ── Lazy-load every page so Vite splits them into separate chunks.
// Only the chunk for the current route is downloaded on first visit.
const CommandCenterPage  = lazy(() => import("./pages/CommandCenterPage"));
const ClientBookPage     = lazy(() => import("./pages/ClientBookPage"));
const ClientDetailPage   = lazy(() => import("./pages/ClientDetailPage"));
const MeetingsPage       = lazy(() => import("./pages/MeetingsPage"));
const ResearchLabPage    = lazy(() => import("./pages/ResearchLabPage"));
const TransactionsPage   = lazy(() => import("./pages/TransactionsPage"));

// Minimal inline fallback shown while a lazy chunk downloads (usually <200ms on repeat)
function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", color: "var(--text-3)", fontSize: 13,
    }}>
      Loading…
    </div>
  );
}

export default function App() {
  const [token,      setToken]      = useState("");
  const [user,       setUser]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [logs,       setLogs]       = useState([]);
  const [messages,   setMessages]   = useState([]);
  const [clients,    setClients]    = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [filters,    setFilters]    = useState({ query: "", staff: "" });
  const [editingLog, setEditingLog] = useState(null);
  const [theme,      setTheme]      = useState(() => localStorage.getItem("theme") || "dark");
  const socketRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem("authToken");
      if (savedToken) {
        try {
          await loadSessionData(savedToken);
        } catch {
          // token expired / invalid — fall through to login screen
          localStorage.removeItem("authToken");
        }
      }
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = createChatSocket(token);
    socketRef.current = socket;
    socket.on("chat:new", (msg) => setMessages((c) => [...c, msg]));
    return () => { socketRef.current = null; socket.disconnect(); };
  }, [token]);

  async function refreshData(sessionToken = token) {
    const [loadedLogs, loadedClients, loadedTasks] = await Promise.all([
      apiRequest("/logs",             sessionToken),
      apiRequest("/clients?limit=200", sessionToken),
      apiRequest("/tasks?limit=200",   sessionToken),
    ]);
    setLogs(loadedLogs);
    setClients(loadedClients);
    setTasks(loadedTasks);
  }

  async function loadSessionData(sessionToken) {
    // Fire all initial requests in parallel
    const [me, loadedMessages, loadedLogs, loadedClients, loadedTasks] = await Promise.all([
      apiRequest("/auth/me",              sessionToken),
      apiRequest("/chat/history?limit=50", sessionToken),
      apiRequest("/logs",                 sessionToken),
      apiRequest("/clients?limit=200",    sessionToken),
      apiRequest("/tasks?limit=200",      sessionToken),
    ]);
    setToken(sessionToken);
    setUser(me.user);
    setMessages(loadedMessages);
    setLogs(loadedLogs);
    setClients(loadedClients);
    setTasks(loadedTasks);
  }

  const handleCreateLog    = async (p)       => { await apiRequest("/logs",          token, { method: "POST",   body: JSON.stringify(p) }); await refreshData(); };
  const handleUpdateLog    = async (log, v)  => { await apiRequest(`/logs/${log._id}`, token, { method: "PUT",  body: JSON.stringify(v) }); await refreshData(); };
  const handleDeleteLog    = async (id)      => { await apiRequest(`/logs/${id}`,    token, { method: "DELETE" }); await refreshData(); };
  const handleCreateTask   = async (p)       => { await apiRequest("/tasks",         token, { method: "POST",   body: JSON.stringify(p) }); await refreshData(); };
  const handleUpdateTask   = async (id, v)   => { await apiRequest(`/tasks/${id}`,   token, { method: "PATCH",  body: JSON.stringify(v) }); await refreshData(); };
  const handleDeleteTask   = async (id)      => { await apiRequest(`/tasks/${id}`,   token, { method: "DELETE" }); await refreshData(); };
  const handleUpdateClient = async (id, v)   => { await apiRequest(`/clients/${id}`, token, { method: "PATCH",  body: JSON.stringify(v) }); await refreshData(); };

  async function handleSendChat({ text, file }) {
    const attachment = file ? await uploadToCloudinary(file, token) : null;
    const socket = socketRef.current;
    if (!socket) throw new Error("Chat connection is not ready yet");
    await new Promise((resolve, reject) => {
      socket.emit("chat:send", { text, ...(attachment || {}) }, (ack) => {
        ack?.ok ? resolve() : reject(new Error(ack?.message || "Failed to send"));
      });
    });
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("authToken");
    setToken(""); setUser(null);
    setLogs([]); setMessages([]); setClients([]); setTasks([]);
  }

  const stats = useMemo(() => {
    if (!user) return { totalLogs: 0, todayLogs: 0, uniqueClients: 0, attachmentMessages: 0, teamCoverage: 0, logsByStaff: {}, openTasks: 0, overdueTasks: 0 };
    const today = new Date().toDateString();
    const logsByStaff = logs.reduce((acc, l) => { acc[l.staffName] = (acc[l.staffName] || 0) + 1; return acc; }, {});
    const openTasks   = tasks.filter((t) => t.status === "open");
    return {
      totalLogs:         logs.length,
      todayLogs:         logs.filter((l) => new Date(l.createdAt).toDateString() === today).length,
      uniqueClients:     clients.length,
      attachmentMessages: messages.filter((m) => m.attachmentUrl).length,
      teamCoverage:      Object.keys(logsByStaff).length,
      logsByStaff,
      openTasks:         openTasks.length,
      overdueTasks:      openTasks.filter((t) => isOverdue(t.dueDate)).length,
    };
  }, [clients, logs, messages, tasks, user]);

  const filteredLogs = useMemo(() => logs.filter((l) => {
    const hay = `${l.clientName} ${l.location} ${l.notes} ${l.staffName}`.toLowerCase();
    return (!filters.query || hay.includes(filters.query.toLowerCase()))
        && (!filters.staff || l.staffName === filters.staff);
  }), [filters, logs]);

  const handleFilterChange = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  if (loading) return <Splash />;

  if (!user) {
    return (
      <AuthCard
        onLogin={async (tok) => { setLoading(true); await loadSessionData(tok); setLoading(false); }}
      />
    );
  }

  return (
    <BrowserRouter>
      <AppShell onLogout={handleLogout} onToggleTheme={toggleTheme} stats={stats} theme={theme} user={user}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/app/command" />} />
            <Route path="/app/command" element={
              <CommandCenterPage clients={clients} logs={logs} messages={messages} stats={stats} tasks={tasks} user={user} />
            } />
            <Route path="/app/clients" element={<ClientBookPage clients={clients} tasks={tasks} />} />
            <Route path="/app/clients/:clientId" element={
              <ClientDetailPage
                clients={clients} logs={logs} tasks={tasks}
                onCreateTask={handleCreateTask}
                onDeleteTask={handleDeleteTask}
                onToggleTaskStatus={(task, status) => handleUpdateTask(task._id, { status })}
                onUpdateClient={handleUpdateClient}
              />
            } />
            <Route path="/app/meetings" element={
              <MeetingsPage
                filters={filters} logs={filteredLogs} user={user}
                onCreateLog={handleCreateLog}
                onDeleteLog={handleDeleteLog}
                onFilterChange={handleFilterChange}
                onUpdateLog={setEditingLog}
              />
            } />
            <Route path="/app/transactions" element={<TransactionsPage />} />
            <Route path="/app/research"     element={<ResearchLabPage />} />
          </Routes>
        </Suspense>
      </AppShell>

      <GlobalChatWidget messages={messages} onSend={handleSendChat} />
      <LogEditModal
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSave={async (log, values) => { await handleUpdateLog(log, values); setEditingLog(null); }}
      />
    </BrowserRouter>
  );
}
