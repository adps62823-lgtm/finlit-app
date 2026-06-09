import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthCard from "./components/AuthCard";
import AppShell from "./components/AppShell";
import BulkClientImportModal from "./components/BulkClientImportModal";
import GlobalChatWidget from "./components/GlobalChatWidget";
import GlobalSearchDialog from "./components/GlobalSearchDialog";
import LogEditModal from "./components/LogEditModal";
import Splash from "./components/Splash";
import { auth } from "./firebase";
import { apiRequest, pingBackend } from "./services/api";
import { createChatSocket } from "./services/chat";
import { uploadToCloudinary } from "./services/upload";
import { formatDateOnly, isOverdue } from "./utils/format";

const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage"));
const ClientBookPage = lazy(() => import("./pages/ClientBookPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const MeetingsPage = lazy(() => import("./pages/MeetingsPage"));
const TaskBoardPage = lazy(() => import("./pages/TaskBoardPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

function PageLoader() {
  return (
    <div className="page-loader">
      Loading...
    </div>
  );
}

function emptyActionState() {
  return {
    createLog: false,
    updateLog: false,
    deleteLog: false,
    createTask: false,
    updateTask: false,
    deleteTask: false,
    updateClient: false,
    createClient: false,
    bulkImport: false,
    sendChat: false,
  };
}

// ─── Push notification helper ────────────────────────────────────────────────
// Safely fires a push notification. Silently skips on mobile browsers that
// don't support new Notification() (they require SW.showNotification instead).
function firePush(title, body) {
  try {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      window.Notification.permission !== "granted"
    ) return;
    new window.Notification(title, { body });
  } catch {
    // Mobile browsers throw — silently ignore
  }
}

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splashMessage, setSplashMessage] = useState("Loading...");
  const [authMessage, setAuthMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState({ query: "", staff: "" });
  const [editingLog, setEditingLog] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [actionBusy, setActionBusy] = useState(emptyActionState);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted";
    } catch {
      return false;
    }
  });

  const socketRef = useRef(null);
  const currentUserIdRef = useRef("");

  // ─── Dedup refs — track what we've already pushed so we don't re-fire ──────
  const pushedReminderIdsRef = useRef(new Set());
  const pushedTaskIdsRef = useRef(new Set());
  const pushedLogIdsRef = useRef(new Set());
  // Track task/log counts so we only push on genuinely new items
  const prevTaskCountRef = useRef(null);
  const prevLogCountRef = useRef(null);

  const notificationsUnreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  async function wakeUpBackend() {
    const MAX_MS = 55000;
    const POLL_MS = 3000;
    const start = Date.now();
    while (Date.now() - start < MAX_MS) {
      setSplashMessage("Connecting to server...");
      const alive = await pingBackend();
      if (alive) {
        setSplashMessage("Loading your workspace...");
        return;
      }
      const elapsed = Math.round((Date.now() - start) / 1000);
      setSplashMessage(`Server is starting up… (${elapsed}s)`);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    setSplashMessage("Loading your workspace...");
  }

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem("authToken");
      try {
        const firebaseUser = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
          });
        });

        let sessionToken = savedToken;
        if (firebaseUser) {
          try {
            sessionToken = await firebaseUser.getIdToken(true);
            localStorage.setItem("authToken", sessionToken);
          } catch (refreshError) {
            console.warn("Failed to refresh Firebase ID token", refreshError);
          }
        }

        if (sessionToken) {
          await wakeUpBackend();
          try {
            await loadWorkspace(sessionToken);
          } catch (error) {
            if (error?.code === "AUTH_EXPIRED") {
              await handleSessionExpired(error);
            }
            if (error?.code === "NETWORK_ERROR") {
              setAuthMessage("Could not reach the server. Please try signing in again.");
            }
          }
        }
      } catch (error) {
        if (error?.code === "AUTH_EXPIRED") {
          await handleSessionExpired(error);
        }
      } finally {
        setLoading(false);
        setSplashMessage("Loading...");
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // ─── Socket: new chat push notification ──────────────────────────────────
  useEffect(() => {
    if (!token) return undefined;
    const socket = createChatSocket(token);
    socketRef.current = socket;
    socket.on("chat:new", (message) => {
      setMessages((current) => [...current, message]);
      if (message?.senderId && message.senderId !== currentUserIdRef.current) {
        setChatUnreadCount((current) => current + 1);
        // Push notification for new chat message
        firePush("New Chat", `From ${message.senderName || "a teammate"}`);
      }
    });
    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    currentUserIdRef.current = user?._id || "";
  }, [user]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const logsByStaff = logs.reduce((acc, log) => {
      acc[log.staffName] = (acc[log.staffName] || 0) + 1;
      return acc;
    }, {});
    const openTasks = tasks.filter((task) => task.status === "open");
    const dueTasks = openTasks
      .map((task) => ({
        ...task,
        dueLabel: task.dueDate ? formatDateOnly(task.dueDate) : "No due date",
      }))
      .filter((task) => isOverdue(task.dueDate) || dueSoon(task.dueDate));

    return {
      totalLogs: logs.length,
      todayLogs: logs.filter((log) => new Date(log.createdAt).toDateString() === today).length,
      uniqueClients: clients.length,
      attachmentMessages: messages.filter((message) => message.attachmentUrl).length,
      teamCoverage: Object.keys(logsByStaff).length,
      logsByStaff,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((task) => isOverdue(task.dueDate)).length,
      dueTasks,
      messagesCount: messages.length,
    };
  }, [clients, logs, messages, tasks]);

  // ─── Push: due reminders ─────────────────────────────────────────────────
  useEffect(() => {
    if (!notificationsEnabled || !stats.dueTasks.length) return;
    stats.dueTasks.forEach((task) => {
      if (pushedReminderIdsRef.current.has(task._id)) return;
      pushedReminderIdsRef.current.add(task._id);
      firePush("Reminder", task.followUpSummary || task.title || `Follow up with ${task.clientName}`);
    });
  }, [notificationsEnabled, stats.dueTasks]);

  // ─── Push: new tasks assigned to current user ────────────────────────────
  useEffect(() => {
    if (!notificationsEnabled || !user) return;
    const myTasks = tasks.filter(
      (t) => t.assignedToUserId === user._id || t.requestedForUserId === user._id
    );
    // Skip the very first load to avoid blasting notifications on sign-in
    if (prevTaskCountRef.current === null) {
      prevTaskCountRef.current = myTasks.length;
      myTasks.forEach((t) => pushedTaskIdsRef.current.add(t._id));
      return;
    }
    myTasks.forEach((task) => {
      if (pushedTaskIdsRef.current.has(task._id)) return;
      pushedTaskIdsRef.current.add(task._id);
      const assigner = task.createdByName || task.requestedByName || "Someone";
      firePush("New Task", `${assigner} — ${task.clientName}`);
    });
    prevTaskCountRef.current = myTasks.length;
  }, [notificationsEnabled, tasks, user]);

  // ─── Push: new meeting logs ──────────────────────────────────────────────
  useEffect(() => {
    if (!notificationsEnabled || !logs.length) return;
    // Skip the very first load
    if (prevLogCountRef.current === null) {
      prevLogCountRef.current = logs.length;
      logs.forEach((l) => pushedLogIdsRef.current.add(l._id));
      return;
    }
    logs.forEach((log) => {
      if (pushedLogIdsRef.current.has(log._id)) return;
      // Only push meetings created by others
      if (log.staffId === currentUserIdRef.current) {
        pushedLogIdsRef.current.add(log._id);
        return;
      }
      pushedLogIdsRef.current.add(log._id);
      firePush("New Meeting", log.clientName);
    });
    prevLogCountRef.current = logs.length;
  }, [notificationsEnabled, logs]);

  async function loadWorkspace(sessionToken) {
    const [me, loadedMessages, loadedLogs, loadedClients, loadedTasks, loadedUsers, loadedNotifications] = await Promise.all([
      apiRequest("/auth/me", sessionToken),
      apiRequest("/chat/history?limit=50", sessionToken),
      apiRequest("/logs", sessionToken),
      apiRequest("/clients?limit=200", sessionToken),
      apiRequest("/tasks?limit=200&scope=all", sessionToken),
      apiRequest("/users/team", sessionToken),
      apiRequest("/notifications?limit=200", sessionToken),
    ]);

    setToken(sessionToken);
    setUser(me.user);
    setMessages(loadedMessages);
    setLogs(loadedLogs);
    setClients(loadedClients);
    setTasks(loadedTasks);
    setUsers(loadedUsers);
    setNotifications(loadedNotifications);
    setAuthMessage("");
    return true;
  }

  async function refreshWorkspace() {
    if (!token) return;
    await loadWorkspace(token);
  }

  async function handleSessionExpired(error) {
    console.error("Session expired or invalid", error);
    localStorage.removeItem("authToken");
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.warn("Firebase sign out failed", logoutError);
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setToken("");
    setUser(null);
    setLogs([]);
    setMessages([]);
    setClients([]);
    setTasks([]);
    setUsers([]);
    setNotifications([]);
    setChatUnreadCount(0);
    setAuthMessage("Your session expired. Please sign in again.");
    setLoading(false);
    pushNotice("warning", "Session expired", "Please sign in again to continue.");
  }

  async function markNotificationsRead() {
    if (!notifications.length) return;
    const unreadIds = notifications.filter((item) => !item.readAt).map((item) => item._id);
    if (!unreadIds.length) return;
    await apiRequest("/notifications/read", token, {
      method: "PATCH",
      body: JSON.stringify({ ids: unreadIds, markAll: true }),
    });
    setNotifications((current) =>
      current.map((item) => (unreadIds.includes(item._id) ? { ...item, readAt: new Date().toISOString() } : item))
    );
  }

  function pushNotice(tone, title, message) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNotices((current) => [{ id, tone, title, message }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setNotices((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }

  function setBusy(key, value) {
    setActionBusy((current) => ({ ...current, [key]: value }));
  }

  async function runAction(key, fn, successMessage) {
    setBusy(key, true);
    try {
      const value = await fn();
      if (successMessage) {
        pushNotice("success", successMessage.title, successMessage.message);
      }
      return value;
    } catch (error) {
      if (error?.code === "AUTH_EXPIRED") {
        await handleSessionExpired(error);
        return null;
      }
      pushNotice("error", "Action failed", error.message || "Something went wrong.");
      throw error;
    } finally {
      setBusy(key, false);
    }
  }

  async function handleCreateLog(payload) {
    await runAction("createLog", async () => {
      await apiRequest("/logs", token, { method: "POST", body: JSON.stringify(payload) });
      await refreshWorkspace();
    }, { title: "Log saved", message: "Meeting log created successfully." });
  }

  async function handleUpdateLog(log, values) {
    await runAction("updateLog", async () => {
      await apiRequest(`/logs/${log._id}`, token, { method: "PUT", body: JSON.stringify(values) });
      await refreshWorkspace();
    }, { title: "Log updated", message: "The meeting record has been saved." });
  }

  async function handleDeleteLog(id) {
    await runAction("deleteLog", async () => {
      await apiRequest(`/logs/${id}`, token, { method: "DELETE" });
      await refreshWorkspace();
    }, { title: "Log deleted", message: "The meeting record was removed." });
  }

  async function handleCreateTask(payload) {
    await runAction("createTask", async () => {
      await apiRequest("/tasks", token, { method: "POST", body: JSON.stringify(payload) });
      await refreshWorkspace();
    }, { title: "Task created", message: "Follow-up added to the queue." });
  }

  async function handleUpdateTask(id, values) {
    await runAction("updateTask", async () => {
      await apiRequest(`/tasks/${id}`, token, { method: "PATCH", body: JSON.stringify(values) });
      await refreshWorkspace();
    }, { title: "Task updated", message: "The follow-up has been saved." });
  }

  async function handleTaskWorkflowAction(id, endpoint, title, message) {
    await runAction("updateTask", async () => {
      await apiRequest(`/tasks/${id}/${endpoint}`, token, { method: "POST" });
      await refreshWorkspace();
    }, { title, message });
  }

  async function handleDeleteTask(id) {
    await runAction("deleteTask", async () => {
      await apiRequest(`/tasks/${id}`, token, { method: "DELETE" });
      await refreshWorkspace();
    }, { title: "Task removed", message: "The follow-up was deleted." });
  }

  async function handleUpdateClient(id, values) {
    await runAction("updateClient", async () => {
      await apiRequest(`/clients/${id}`, token, { method: "PATCH", body: JSON.stringify(values) });
      await refreshWorkspace();
    }, { title: "Client updated", message: "The relationship profile is current." });
  }

  async function handleCreateClient(values) {
    await runAction("createClient", async () => {
      await apiRequest("/clients", token, { method: "POST", body: JSON.stringify(values) });
      await refreshWorkspace();
    }, { title: "Client added", message: "A new client profile was created." });
  }

  async function handleBulkImportClients({ file, text }) {
    await runAction("bulkImport", async () => {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      if (text) {
        formData.append("text", text);
      }
      await apiRequest("/clients/bulk/import", token, { method: "POST", body: formData });
      await refreshWorkspace();
    }, { title: "Import complete", message: "The client book has been updated." });
  }

  async function handleSendChat({ text, file }) {
    await runAction("sendChat", async () => {
      const attachment = file ? await uploadToCloudinary(file, token) : null;
      const socket = socketRef.current;
      if (!socket) {
        throw new Error("Chat connection is not ready yet.");
      }
      await new Promise((resolve, reject) => {
        socket.emit("chat:send", { text, ...(attachment || {}) }, (ack) => {
          if (ack?.ok) {
            resolve();
            return;
          }
          reject(new Error(ack?.message || "Failed to send message."));
        });
      });
      setChatUnreadCount(0);
    });
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("authToken");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setToken("");
    setUser(null);
    setLogs([]);
    setMessages([]);
    setClients([]);
    setNotifications([]);
    setTasks([]);
    setUsers([]);
    setChatUnreadCount(0);
  }

  async function handleEnableNotifications() {
    if (!("Notification" in window)) {
      pushNotice("warning", "Notifications unavailable", "This browser does not support alerts.");
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      const enabled = permission === "granted";
      setNotificationsEnabled(enabled);
      pushNotice(
        enabled ? "success" : "warning",
        enabled ? "Notifications enabled" : "Notifications blocked",
        enabled ? "You will now see proactive due reminders." : "Alerts stay disabled until permission is granted."
      );
    } catch {
      pushNotice("warning", "Notifications unavailable", "This browser does not support desktop alerts.");
    }
  }

  function toggleTheme() {
    setTheme((value) => (value === "dark" ? "light" : "dark"));
  }

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const haystack = `${log.clientName} ${log.location} ${log.notes} ${log.staffName} ${log.outcome} ${log.followUpSummary}`.toLowerCase();
    return (!filters.query || haystack.includes(filters.query.toLowerCase()))
      && (!filters.staff || log.staffName === filters.staff);
  }), [filters, logs]);

  if (loading) return <Splash message={splashMessage} />;

  if (!user) {
    return (
      <AuthCard
        onLogin={async (sessionToken) => {
          setLoading(true);
          setSplashMessage("Connecting to server...");
          try {
            await wakeUpBackend();
            await loadWorkspace(sessionToken);
          } catch (error) {
            if (error?.code === "AUTH_EXPIRED") {
              await handleSessionExpired(error);
            } else {
              setAuthMessage(
                error?.code === "NETWORK_ERROR"
                  ? "Server is taking too long to respond. Please try again in a moment."
                  : error.message || "Something went wrong."
              );
            }
          } finally {
            setLoading(false);
            setSplashMessage("Loading...");
          }
        }}
        errorMessage={authMessage}
      />
    );
  }

  return (
    <BrowserRouter>
      <AppShell
        user={user}
        stats={stats}
        dueTasks={stats.dueTasks}
        notificationsEnabled={notificationsEnabled}
        notificationsUnreadCount={notificationsUnreadCount}
        onEnableNotifications={handleEnableNotifications}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        onOpenImport={() => setBulkImportOpen(true)}
        theme={theme}
      >
        <div className="notice-stack">
          {notices.map((notice) => (
            <div key={notice.id} className={`notice notice-${notice.tone}`}>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>
          ))}
        </div>

        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/app/command" />} />
            <Route path="/app/command" element={
              <CommandCenterPage clients={clients} logs={logs} stats={stats} tasks={tasks} user={user} />
            } />
            <Route path="/app/clients" element={
              <ClientBookPage
                clients={clients}
                tasks={tasks}
                onOpenImport={() => setBulkImportOpen(true)}
              />
            } />
            <Route path="/app/clients/:clientId" element={
              <ClientDetailPage
                clients={clients}
                logs={logs}
                tasks={tasks}
                onCreateTask={handleCreateTask}
                onDeleteTask={handleDeleteTask}
                onToggleTaskStatus={(task, status) => handleUpdateTask(task._id, { status })}
                onUpdateClient={handleUpdateClient}
                busy={actionBusy}
              />
            } />
            <Route path="/app/meetings" element={
              <MeetingsPage
                filters={filters}
                logs={filteredLogs}
                user={user}
                onCreateLog={handleCreateLog}
                onDeleteLog={handleDeleteLog}
                onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
                onUpdateLog={setEditingLog}
                busy={actionBusy}
              />
            } />
            <Route
              path="/app/tasks"
              element={
                <TaskBoardPage
                  clients={clients}
                  tasks={tasks}
                  users={users}
                  user={user}
                  onCreateTask={handleCreateTask}
                  onDeleteTask={handleDeleteTask}
                  onToggleTaskStatus={(task, status) => handleUpdateTask(task._id, { status })}
                  onAcceptTaskRequest={(taskId) => handleTaskWorkflowAction(taskId, "accept-request", "Task approved", "The task request was accepted.")}
                  onRejectTaskRequest={(taskId) => handleTaskWorkflowAction(taskId, "reject-request", "Task rejected", "The task request was rejected.")}
                  onRequestTaskRejection={(taskId) => handleTaskWorkflowAction(taskId, "request-rejection", "Rejection requested", "The rejection request was sent.")}
                  onAcceptTaskRejection={(taskId) => handleTaskWorkflowAction(taskId, "accept-rejection", "Task removed", "The task was rejected and removed.")}
                  onRejectTaskRejection={(taskId) => handleTaskWorkflowAction(taskId, "reject-rejection", "Task kept active", "The task stays active.")}
                />
              }
            />
            <Route path="/app/notifications" element={
              <NotificationsPage
                notifications={notifications}
                unreadCount={notificationsUnreadCount}
                onClearUnread={markNotificationsRead}
              />
            } />
          </Routes>
        </Suspense>
      </AppShell>

      <GlobalSearchDialog
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        clients={clients}
        logs={logs}
        tasks={tasks}
        messages={messages}
      />
      <BulkClientImportModal
        busy={actionBusy.bulkImport}
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImport={handleBulkImportClients}
      />
      <GlobalChatWidget
        messages={messages}
        onSend={handleSendChat}
        chatUnreadCount={chatUnreadCount}
        onMarkChatRead={() => {
          setChatUnreadCount(0);
        }}
      />
      <LogEditModal
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSave={async (log, values) => {
          await handleUpdateLog(log, values);
          setEditingLog(null);
        }}
      />
    </BrowserRouter>
  );
}

function dueSoon(dueDate) {
  if (!dueDate) return false;
  const now = new Date();
  const target = new Date(dueDate);
  if (Number.isNaN(target.getTime())) return false;
  const hours = (target.getTime() - now.getTime()) / 36e5;
  return hours <= 48;
}