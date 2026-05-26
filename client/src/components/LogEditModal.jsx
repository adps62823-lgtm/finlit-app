import React, { useEffect, useState } from "react";

export default function LogEditModal({ log, onClose, onSave }) {
  const [form, setForm] = useState({
    clientName: "",
    location: "",
    notes: "",
    meetingType: "review",
    priority: "medium",
    outcome: "",
    followUpSummary: "",
    followUpDate: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!log) return;
    setForm({
      clientName: log.clientName,
      location: log.location,
      notes: log.notes,
      meetingType: log.meetingType || "review",
      priority: log.priority || "medium",
      outcome: log.outcome || "",
      followUpSummary: log.followUpSummary || "",
      followUpDate: log.followUpDate ? log.followUpDate.slice(0, 10) : "",
    });
  }, [log]);

  if (!log) return null;

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave(log, {
        ...form,
        followUpDate: form.followUpDate || undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-shell" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="panel-kicker">Refine log</div>
            <h3>Update meeting record</h3>
          </div>
          <button className="secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Client name</span>
            <input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} required />
          </label>

          <label className="field">
            <span>Meeting location</span>
            <input value={form.location} onChange={(event) => updateField("location", event.target.value)} required />
          </label>

          <div className="form-split-grid">
            <label className="field">
              <span>Meeting type</span>
              <select onChange={(event) => updateField("meetingType", event.target.value)} value={form.meetingType}>
                <option value="review">Review</option>
                <option value="prospect">Prospect</option>
                <option value="service">Service</option>
                <option value="collection">Collection</option>
              </select>
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
            <span>Advisory notes</span>
            <textarea rows="8" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} required />
          </label>

          <label className="field">
            <span>Outcome</span>
            <input value={form.outcome} onChange={(event) => updateField("outcome", event.target.value)} />
          </label>

          <label className="field">
            <span>Follow-up summary</span>
            <input
              value={form.followUpSummary}
              onChange={(event) => updateField("followUpSummary", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Follow-up date</span>
            <input
              onChange={(event) => updateField("followUpDate", event.target.value)}
              type="date"
              value={form.followUpDate}
            />
          </label>

          <div className="modal-actions">
            <button className="secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button disabled={busy} type="submit">
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
