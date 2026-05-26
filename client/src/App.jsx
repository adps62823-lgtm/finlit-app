import React, { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthCard from "./components/AuthCard";
import AppShell from "./components/AppShell";
import GlobalChatWidget from "./components/GlobalChatWidget";
import LogEditModal from "./components/LogEditModal";
import { auth } from "./firebase";
import { apiRequest } from "./services/api";
import { createChatSocket } from "./services/chat";
import { uploadToCloudinary } from "./services/upload";
import CommandCenterPage from "./pages/CommandCenterPage";
import ClientBookPage from "./pages/ClientBookPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import MeetingsPage from "./pages/MeetingsPage";
import ResearchLabPage from "./pages/ResearchLabPage";
import TransactionsPage from "./pages/TransactionsPage";
import { isOverdue } from "./utils/format";

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ query: "", staff: "" });
  const [editingLog, setEditingLog] = useState(null);
  const socketRef = useRef(null);

  // Restore auth token from localStorage on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      loadSessionData(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const socket = createChatSocket(token);
    socketRef.current = socket;
    socket.on("chat:new", (message) => {
      setMessages((current) => [...current, message]);
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token]);

  async function refreshPhaseOneData(sessionToken = token) {
    const [loadedLogs, loadedClients, loadedTasks] = await Promise.all([
      apiRequest("/logs", sessionToken),
      apiRequest("/clients?limit=200", sessionToken),
      apiRequest("/tasks?limit=200", sessionToken),
    ]);

    setLogs(loadedLogs);
    setClients(loadedClients);
    setTasks(loadedTasks);
  }

  async function loadSessionData(sessionToken) {
    const me = await apiRequest("/auth/me", sessionToken);
    const loadedMessages = await apiRequest("/chat/history?limit=50", sessionToken);
    const loadedLogs = await apiRequest("/logs", sessionToken);
    const [loadedClients, loadedTasks] = await Promise.all([
      apiRequest("/clients?limit=200", sessionToken),
      apiRequest("/tasks?limit=200", sessionToken),
    ]);

    setToken(sessionToken);
    setUser(me.user);
    setLogs(loadedLogs);
    setMessages(loadedMessages);
    setClients(loadedClients);
    setTasks(loadedTasks);
  }

  async function handleCreateLog(payload) {
    await apiRequest("/logs", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refreshPhaseOneData();
  }

  async function handleUpdateLog(log, values) {
    await apiRequest(`/logs/${log._id}`, token, {
      method: "PUT",
      body: JSON.stringify(values),
    });
    await refreshPhaseOneData();
  }

  async function handleDeleteLog(logId) {
    await apiRequest(`/logs/${logId}`, token, { method: "DELETE" });
    await refreshPhaseOneData();
  }

  async function handleCreateTask(payload) {
    await apiRequest("/tasks", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refreshPhaseOneData();
  }

  async function handleUpdateTask(taskId, values) {
    await apiRequest(`/tasks/${taskId}`, token, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    await refreshPhaseOneData();
  }

  async function handleDeleteTask(taskId) {
    await apiRequest(`/tasks/${taskId}`, token, { method: "DELETE" });
    await refreshPhaseOneData();
  }

  async function handleUpdateClient(clientId, values) {
    await apiRequest(`/clients/${clientId}`, token, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    await refreshPhaseOneData();
  }

  async function handleSendChat({ text, file }) {
    const attachment = file ? await uploadToCloudinary(file, token) : null;
    const socket = socketRef.current;

    if (!socket) {
      throw new Error("Chat connection is not ready yet");
    }

    await new Promise((resolve, reject) => {
      socket.emit(
        "chat:send",
        {
          text,
          ...(attachment || {}),
        },
        (ack) => {
          if (!ack?.ok) {
            reject(new Error(ack?.message || "Failed to send message"));
            return;
          }
          resolve();
        }
      );
    });
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("authToken");
    setToken("");
    setUser(null);
    setLogs([]);
    setMessages([]);
    setClients([]);
    setTasks([]);
  }

  const stats = useMemo(() => {
    if (!user) {
      return {
        totalLogs: 0,
        todayLogs: 0,
        uniqueClients: 0,
        attachmentMessages: 0,
        teamCoverage: 0,
        logsByStaff: {},
        openTasks: 0,
        overdueTasks: 0,
      };
    }

    const todayString = new Date().toDateString();
    const attachmentMessages = messages.filter((message) => message.attachmentUrl).length;
    const logsByStaff = logs.reduce((acc, log) => {
      acc[log.staffName] = (acc[log.staffName] || 0) + 1;
      return acc;
    }, {});
    const openTasks = tasks.filter((task) => task.status === "open");
    const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate)).length;

    return {
      totalLogs: logs.length,
      todayLogs: logs.filter((log) => new Date(log.createdAt).toDateString() === todayString).length,
      uniqueClients: clients.length,
      attachmentMessages,
      teamCoverage: Object.keys(logsByStaff).length,
      logsByStaff,
      openTasks: openTasks.length,
      overdueTasks,
    };
  }, [clients, logs, messages, tasks]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const haystack = `${log.clientName} ${log.location} ${log.notes} ${log.staffName}`.toLowerCase();
      const matchesQuery = !filters.query || haystack.includes(filters.query.toLowerCase());
      const matchesStaff = !filters.staff || log.staffName === filters.staff;
      return matchesQuery && matchesStaff;
    });
  }, [filters, logs]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (!user) {
    return <AuthCard onLogin={loadSessionData} />;
  }

  return (
    <BrowserRouter>
      <AppShell onLogout={handleLogout} stats={stats} user={user}>
        <Routes>
          <Route element={<Navigate replace to="/app/command" />} path="/" />
          <Route
            element={
              <CommandCenterPage
                clients={clients}
                logs={logs}
                messages={messages}
                stats={stats}
                tasks={tasks}
                user={user}
              />
            }
            path="/app/command"
          />
          <Route element={<ClientBookPage clients={clients} tasks={tasks} />} path="/app/clients" />
          <Route
            element={
              <ClientDetailPage
                clients={clients}
                logs={logs}
                onCreateTask={handleCreateTask}
                onDeleteTask={handleDeleteTask}
                onToggleTaskStatus={(task, status) => handleUpdateTask(task._id, { status })}
                onUpdateClient={handleUpdateClient}
                tasks={tasks}
              />
            }
            path="/app/clients/:clientId"
          />
          <Route
            element={
              <MeetingsPage
                filters={filters}
                logs={filteredLogs}
                onCreateLog={handleCreateLog}
                onDeleteLog={handleDeleteLog}
                onFilterChange={handleFilterChange}
                onUpdateLog={setEditingLog}
                user={user}
              />
            }
            path="/app/meetings"
          />
          <Route element={<TransactionsPage />} path="/app/transactions" />
          <Route element={<ResearchLabPage />} path="/app/research" />
        </Routes>
      </AppShell>

      <GlobalChatWidget messages={messages} onSend={handleSendChat} />
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
