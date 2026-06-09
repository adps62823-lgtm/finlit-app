import React, { useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
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
      setError(err.message || "Unable to create follow-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`task-composer${compact ? " compact" : ""}`} onSubmit={handleSubmit}>
      <div className="task-composer-grid">
        <div className="field">
          <span>Title</span>
          <input value={form.title} onChange={set("title")} placeholder="Follow-up" required />
        </div>
        <div className="field">
          <span>Due</span>
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
        <textarea value={form.details} onChange={set("details")} placeholder="Notes..." rows={2} />
      </div>
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="task-composer-actions">
        <button className="btn btn-primary btn-sm" disabled={busy} type="submit" aria-label="Add follow-up">
          <Plus size={14} />
        </button>
      </div>
    </form>
  );
}

export function TaskList({
  tasks,
  onToggleStatus,
  onDelete,
  onAcceptRequest,
  onRejectRequest,
  onRequestRejection,
  onAcceptRejection,
  onRejectRejection,
  currentUser,
  showClient = false,
  emptyText = "No follow-ups.",
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

  async function handleWorkflowAction(task, action) {
    setPendingId(task._id);
    try {
      await action(task._id);
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const isRequestPending = task.status === "request_pending";
        const isRejectionRequested = task.approvalStatus === "rejection_requested";
        const overdue = task.status === "open" && isOverdue(task.dueDate);
        const done = task.status === "done";
        const loading = pendingId === task._id;
        const isOwner = currentUser?.role === "owner";
        const isTarget = task.requestedForUserId === currentUser?._id;
        const workflowLabel = isRequestPending
          ? "Pending approval"
          : isRejectionRequested
            ? "Rejection pending"
            : done
              ? "Done"
              : overdue
                ? "Overdue"
                : "Open";
        const statusClass = overdue && !isRequestPending && !isRejectionRequested ? "status-overdue" : "status-neutral";
        const showRequestActions = isRequestPending && ((isOwner && onAcceptRequest && onRejectRequest) || (isTarget && onAcceptRequest && onRequestRejection));
        const showRejectionActions = isRejectionRequested && isOwner && onAcceptRejection && onRejectRejection;
        const showNormalActions = !isRequestPending && !isRejectionRequested;
        return (
          <article className={`task-card${done ? " done" : ""}`} key={task._id}>
            <div className="task-card-top">
              <div className="task-card-copy">
                <div className="task-card-title-row">
                  <strong>{task.title}</strong>
                  <span className={`priority-${task.priority}`}>{task.priority}</span>
                  {task.taskType ? <span className="pill muted">{task.taskType.replace(/_/g, " ")}</span> : null}
                  {isRequestPending ? <span className="pill muted">Request</span> : null}
                  {isRejectionRequested ? <span className="pill muted">Rejection</span> : null}
                </div>
                {task.assignedToName ? <p className="task-client-name">To {task.assignedToName}</p> : null}
                {isRequestPending && task.requestedByName ? <p className="task-client-name">Requested by {task.requestedByName}</p> : null}
                {isRequestPending && task.requestedForName ? <p className="task-client-name">Requested for {task.requestedForName}</p> : null}
                {isRejectionRequested && task.rejectionRequestedByName ? (
                  <p className="task-client-name">Rejection requested by {task.rejectionRequestedByName}</p>
                ) : null}
                {showClient ? <p className="task-client-name">{task.clientName}</p> : null}
              </div>
              <span className={statusClass}>{workflowLabel}</span>
            </div>

            {task.details ? <p className="task-card-details">{task.details}</p> : null}

            <div className="task-card-footer">
              <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No date"}</span>
              <div className="action-row">
                {showRequestActions ? (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                      onClick={() => handleWorkflowAction(task, onAcceptRequest)}
                      type="button"
                    >
                      Accept
                    </button>
                    {isOwner ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={loading}
                        onClick={() => handleWorkflowAction(task, onRejectRequest)}
                        type="button"
                      >
                        Reject
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={loading}
                        onClick={() => handleWorkflowAction(task, onRequestRejection)}
                        type="button"
                      >
                        Request rejection
                      </button>
                    )}
                  </>
                ) : null}
                {showRejectionActions ? (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                      onClick={() => handleWorkflowAction(task, onAcceptRejection)}
                      type="button"
                    >
                      Accept rejection
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={loading}
                      onClick={() => handleWorkflowAction(task, onRejectRejection)}
                      type="button"
                    >
                      Keep active
                    </button>
                  </>
                ) : null}
                {showNormalActions ? (
                  <>
                    <button className="icon-btn" onClick={() => handleToggle(task, done ? "open" : "done")} title={done ? "Reopen" : "Done"} disabled={loading} type="button">
                      {done ? <RotateCcw size={12} /> : <Check size={12} />}
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(task._id)} title="Delete" disabled={loading} type="button">
                      <Trash2 size={12} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default TaskComposer;
