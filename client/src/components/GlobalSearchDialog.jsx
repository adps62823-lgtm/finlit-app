import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, MessageSquareText, Search, SquareCheckBig, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDateOnly } from "../utils/format";

function scoreText(value, query) {
  if (!value) return 0;
  const text = value.toLowerCase();
  if (text === query) return 4;
  if (text.startsWith(query)) return 3;
  if (text.includes(query)) return 2;
  return 0;
}

function buildResults({ clients, logs, tasks, messages, query }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const results = [];

  clients.forEach((client) => {
    const candidate = [client.primaryHolderName, client.clientCode, client.city, client.email, client.mobile, client.familyName, client.notes, client.nextAction].filter(Boolean).join(" ");
    const score = scoreText(candidate, needle);
    if (!score) return;
    results.push({ id: `client-${client._id}`, type: "Client", icon: UserRound, title: client.primaryHolderName, meta: [client.city, client.clientCode].filter(Boolean).join(" · "), path: `/app/clients/${client._id}`, score });
  });

  logs.forEach((log) => {
    const candidate = [log.clientName, log.location, log.notes, log.staffName, log.outcome, log.followUpSummary].filter(Boolean).join(" ");
    const score = scoreText(candidate, needle);
    if (!score) return;
    results.push({ id: `log-${log._id}`, type: "Log", icon: BookOpen, title: log.clientName, meta: [log.location, formatDateOnly(log.createdAt)].filter(Boolean).join(" · "), path: "/app/meetings", score });
  });

  tasks.forEach((task) => {
    const candidate = [task.title, task.details, task.clientName, task.priority, task.status].filter(Boolean).join(" ");
    const score = scoreText(candidate, needle);
    if (!score) return;
    results.push({ id: `task-${task._id}`, type: "Task", icon: SquareCheckBig, title: task.title, meta: [task.clientName, task.dueDate ? formatDateOnly(task.dueDate) : "No due date"].filter(Boolean).join(" · "), path: `/app/clients/${task.clientId}`, score });
  });

  messages.forEach((message) => {
    const candidate = [message.senderName, message.text, message.attachmentName].filter(Boolean).join(" ");
    const score = scoreText(candidate, needle);
    if (!score) return;
    results.push({ id: `message-${message._id}`, type: "Chat", icon: MessageSquareText, title: message.senderName, meta: message.text || message.attachmentName || "Shared a file", path: "/app/command", score });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

export default function GlobalSearchDialog({ open, onClose, clients, logs, tasks, messages }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const results = useMemo(() => buildResults({ clients, logs, tasks, messages, query }), [clients, logs, messages, query, tasks]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <section className="dialog-shell search-dialog" role="dialog" aria-label="Global search" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <div className="section-kicker">Search</div>
            <h3>Global search</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="search-field">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Clients, logs, tasks, messages..."
          />
          <kbd>Esc</kbd>
        </label>

        <div className="search-results">
          {!query.trim() ? (
            <div className="empty-state">
              <h4>Start typing to search</h4>
            </div>
          ) : results.length ? (
            results.map((result) => {
              const Icon = result.icon;
              return (
                <button
                  className="search-result"
                  key={result.id}
                  onClick={() => { navigate(result.path); onClose(); }}
                >
                  <div className="search-result-icon"><Icon size={16} /></div>
                  <div className="search-result-copy">
                    <div className="search-result-title-row">
                      <strong>{result.title}</strong>
                      <span>{result.type}</span>
                    </div>
                    <p>{result.meta}</p>
                  </div>
                  <ArrowRight size={14} className="search-result-arrow" />
                </button>
              );
            })
          ) : (
            <div className="empty-state">
              <h4>No matches</h4>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
