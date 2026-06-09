import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";

const INIT = {
  clientId: "",
  title: "",
  taskType: "follow_up",
  dueDate: "",
  priority: "medium",
  assignedToUserId: "",
  details: "",
};

const TASK_TYPES = [
  { value: "follow_up", label: "Follow-up" },
  { value: "call", label: "Call" },
  { value: "visit", label: "Visit" },
  { value: "docs", label: "Docs" },
  { value: "review", label: "Review" },
  { value: "collection", label: "Collection" },
];

export default function TaskAssignmentForm({ clients = [], users = [], onCreate, user }) {
  const [form, setForm] = useState(INIT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClient = useMemo(() => clients.find((client) => client._id === form.clientId), [clients, form.clientId]);
  const visibleUsers = user?.role === "owner" ? users : users.filter((member) => member._id !== user?._id);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({
        clientId: form.clientId,
        title: form.title,
        taskType: form.taskType,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        assignedToUserId: form.assignedToUserId || undefined,
        details: form.details,
      });
      setForm(INIT);
    } catch (err) {
      setError(err.message || "Unable to create task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="workspace-card task-assignment-form" onSubmit={handleSubmit}>
      <div className="section-kicker">Assign</div>
      <h3>{user?.role === "owner" ? "Owner task desk" : "Task request desk"}</h3>

      <div className="task-assignment-grid">
        <label className="field">
          <span>Client</span>
          <select value={form.clientId} onChange={set("clientId")} required>
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.primaryHolderName}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Type</span>
          <select value={form.taskType} onChange={set("taskType")}>
            {TASK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Due</span>
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
        </label>

        <label className="field">
          <span>Priority</span>
          <select value={form.priority} onChange={set("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="field">
          <span>{user?.role === "owner" ? "Assign to" : "Request for"}</span>
          <select value={form.assignedToUserId} onChange={set("assignedToUserId")}>
            <option value="">Select person</option>
            {visibleUsers.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} · {member.role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={set("title")} placeholder="Example: SIP document follow-up" required />
      </label>

      <label className="field">
        <span>Details</span>
        <textarea
          value={form.details}
          onChange={set("details")}
          placeholder={selectedClient ? `For ${selectedClient.primaryHolderName}` : "Notes..."}
          rows={3}
        />
      </label>

      {error ? <div className="inline-error">{error}</div> : null}

      <div className="form-actions">
        <span className="form-note">{user?.role === "owner" ? "Direct assign" : "Request approval"}</span>
        <button className="btn btn-primary btn-sm" disabled={busy} type="submit" aria-label="Create task">
          <Plus size={14} />
        </button>
      </div>
    </form>
  );
}
