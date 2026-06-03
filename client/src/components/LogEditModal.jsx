import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const EMPTY = {
  clientName: "",
  location: "",
  notes: "",
  meetingType: "review",
  priority: "medium",
  outcome: "",
  followUpSummary: "",
  followUpDate: "",
};

export default function LogEditModal({ log, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    setError("");
  }, [log]);

  if (!log) return null;

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(log, { ...form, followUpDate: form.followUpDate || undefined });
    } catch (err) {
      setError(err.message || "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div className="dialog-shell" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal aria-label="Edit meeting log">
        <div className="dialog-header">
          <div>
            <div className="section-kicker">Edit log</div>
            <h3>Update meeting</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-split-grid">
            <div className="field">
              <span>Client</span>
              <input value={form.clientName} onChange={set("clientName")} required />
            </div>
            <div className="field">
              <span>Location</span>
              <input value={form.location} onChange={set("location")} required />
            </div>
          </div>

          <div className="form-split-grid">
            <div className="field">
              <span>Type</span>
              <select value={form.meetingType} onChange={set("meetingType")}>
                <option value="review">Review</option>
                <option value="prospect">Prospect</option>
                <option value="service">Service</option>
                <option value="collection">Collection</option>
              </select>
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
            <span>Notes</span>
            <textarea value={form.notes} onChange={set("notes")} rows={5} required />
          </div>

          <div className="form-split-grid">
            <div className="field">
              <span>Outcome</span>
              <input value={form.outcome} onChange={set("outcome")} />
            </div>
            <div className="field">
              <span>Follow-up date</span>
              <input type="date" value={form.followUpDate} onChange={set("followUpDate")} />
            </div>
          </div>

          <div className="field">
            <span>Follow-up note</span>
            <input value={form.followUpSummary} onChange={set("followUpSummary")} />
          </div>

          {error ? <div className="inline-error">{error}</div> : null}

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
