import React, { useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { formatDateOnly, isOverdue } from "../utils/format";

const INIT = { title: "", details: "", dueDate: "", priority: "medium" };

export function TaskComposer({ clientId, onCreate, compact = false }) {
  const [form, setForm] = useState(INIT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({
        clientId,
        title: form.title,
        details: form.details,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
      });
      setForm(INIT);
    } catch (err) {
      setError(err.message || "Unable to create the follow-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`task-composer${compact ? " compact" : ""}`} onSubmit={handleSubmit}>
      <div className="task-composer-grid">
        <div className="field">
          <span>Follow-up title</span>
          <input value={form.title} onChange={set("title")} placeholder="Call client about SIP step-up" required />
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
          placeholder="Context, promised action, or reminder notes..."
          rows={2}
        />
      </div>
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="task-composer-actions">
        <button disabled={busy} type="submit">
          {busy ? "Creating..." : "Add follow-up ->"}
        </button>
      </div>
    </form>
  );
}

export function TaskList({
  tasks,
  onToggleStatus,
  onDelete,
  showClient = false,
  emptyText = "No follow-ups yet.",
}) {
  const [pendingId, setPendingId] = useState("");

  if (!tasks.length) {
    return (
      <div className="empty-state compact-empty-state">
        <h4>No tasks</h4>
        <p>{emptyText}</p>
      </div>
    );
  }

  async function handleDelete(taskId) {
    setPendingId(taskId);
    try {
      await onDelete(taskId);
    } finally {
      setPendingId("");
    }
  }

  async function handleToggle(task, nextStatus) {
    setPendingId(task._id);
    try {
      await onToggleStatus(task, nextStatus);
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const overdue = task.status === "open" && isOverdue(task.dueDate);
        const done = task.status === "done";
        const loading = pendingId === task._id;
        return (
          <article className={`task-card${done ? " done" : ""}`} key={task._id}>
            <div className="task-card-top">
              <div className="task-card-copy">
                <div className="task-card-title-row">
                  <strong>{task.title}</strong>
                  <span className={`priority-${task.priority}`}>{task.priority}</span>
                </div>
                {showClient ? <p className="task-client-name">{task.clientName}</p> : null}
              </div>
              <span className={overdue ? "status-overdue" : "status-neutral"}>
                {done ? "Done" : overdue ? "Overdue" : "Open"}
              </span>
            </div>

            {task.details ? <p className="task-card-details">{task.details}</p> : null}

            <div className="task-card-footer">
              <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No due date"}</span>
              <div className="action-row">
                <button
                  className="icon-btn"
                  onClick={() => handleToggle(task, done ? "open" : "done")}
                  title={done ? "Reopen" : "Mark done"}
                  aria-label={done ? "Reopen task" : "Mark task done"}
                  disabled={loading}
                >
                  {done ? <RotateCcw size={12} /> : <Check size={12} />}
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleDelete(task._id)}
                  title="Delete task"
                  aria-label="Delete task"
                  disabled={loading}
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

export default TaskComposer;
