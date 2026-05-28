import React, { useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { formatDateOnly, isOverdue } from "../utils/format";

/* ── TaskComposer ──────────────────────────────────────────── */
const INIT = { title: "", details: "", dueDate: "", priority: "medium" };

export function TaskComposer({ clientId, onCreate, compact = false }) {
  const [form, setForm] = useState(INIT);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({
        clientId,
        title:    form.title,
        details:  form.details,
        dueDate:  form.dueDate || undefined,
        priority: form.priority,
      });
      setForm(INIT);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`task-composer${compact ? " compact" : ""}`} onSubmit={handleSubmit}>
      <div className="task-composer-grid">
        <div className="field">
          <span>Follow-up title</span>
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="Call client about SIP step-up"
            required
          />
        </div>
        <div className="field">
          <span>Due date</span>
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <div className="field">
          <span>Priority</span>
          <select value={form.priority} onChange={set("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="field">
        <span>Details</span>
        <textarea
          value={form.details}
          onChange={set("details")}
          placeholder="Context, promised action, or reminder notes…"
          rows={2}
        />
      </div>
      <div className="task-composer-actions">
        <button disabled={busy} type="submit">
          {busy ? "Creating…" : "Add follow-up →"}
        </button>
      </div>
    </form>
  );
}

/* ── TaskList ──────────────────────────────────────────────── */
export function TaskList({
  tasks,
  onToggleStatus,
  onDelete,
  showClient = false,
  emptyText = "No follow-ups yet.",
}) {
  if (!tasks.length) {
    return (
      <div className="empty-state compact-empty-state">
        <h4>No tasks</h4>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const overdue = task.status === "open" && isOverdue(task.dueDate);
        const done    = task.status === "done";
        return (
          <article className={`task-card${done ? " done" : ""}`} key={task._id}>
            <div className="task-card-top">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="task-card-title-row">
                  <strong>{task.title}</strong>
                  <span className={`priority-${task.priority}`}
                    style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                    {task.priority}
                  </span>
                </div>
                {showClient && <p className="task-client-name">{task.clientName}</p>}
              </div>
              <span className={overdue ? "status-overdue" : done ? "status-neutral" : "status-neutral"}
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                {done ? "Done" : overdue ? "Overdue" : "Open"}
              </span>
            </div>

            {task.details && <p className="task-card-details">{task.details}</p>}

            <div className="task-card-footer">
              <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No due date"}</span>
              <div className="action-row">
                <button
                  className="icon-button"
                  onClick={() => onToggleStatus(task, done ? "open" : "done")}
                  title={done ? "Reopen" : "Mark done"}
                  aria-label={done ? "Reopen task" : "Mark task done"}
                >
                  {done ? <RotateCcw size={12} /> : <Check size={12} />}
                </button>
                <button
                  className="icon-button"
                  onClick={() => onDelete(task._id)}
                  title="Delete task"
                  aria-label="Delete task"
                  style={{ color: "var(--red)" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* Default export for backward-compat import as TaskComposer */
export default TaskComposer;