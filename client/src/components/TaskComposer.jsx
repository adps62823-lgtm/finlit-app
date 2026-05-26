import React, { useState } from "react";

const initialState = {
  title: "",
  details: "",
  dueDate: "",
  priority: "medium",
};

export default function TaskComposer({ clientId, onCreate, compact = false }) {
  const [form, setForm] = useState(initialState);
  const [busy, setBusy] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onCreate({
        clientId,
        title: form.title,
        details: form.details,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
      });
      setForm(initialState);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`task-composer ${compact ? "compact" : ""}`} onSubmit={handleSubmit}>
      <div className="task-composer-grid">
        <label className="field">
          <span>Follow-up title</span>
          <input
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Call client about next SIP step"
            required
            value={form.title}
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input
            onChange={(event) => updateField("dueDate", event.target.value)}
            type="date"
            value={form.dueDate}
          />
        </label>
        <label className="field">
          <span>Priority</span>
          <select onChange={(event) => updateField("priority", event.target.value)} value={form.priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Details</span>
        <textarea
          onChange={(event) => updateField("details", event.target.value)}
          placeholder="Context, promised action, documents needed, or reminder notes."
          rows="3"
          value={form.details}
        />
      </label>
      <div className="task-composer-actions">
        <button disabled={busy} type="submit">
          {busy ? "Creating..." : "Create follow-up"}
        </button>
      </div>
    </form>
  );
}
