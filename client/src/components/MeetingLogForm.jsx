import React, { useState } from "react";

const INIT = {
  clientName: "",
  location: "",
  meetingType: "review",
  priority: "medium",
  notes: "",
  outcome: "",
  followUpSummary: "",
  followUpDate: "",
};

export default function MeetingLogForm({ onCreate }) {
  const [form, setForm] = useState(INIT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({ ...form, followUpDate: form.followUpDate || undefined });
      setForm(INIT);
    } catch (err) {
      setError(err.message || "Unable to create log.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-card accent-card sticky-panel">
      <div className="section-kicker">New entry</div>
      <h3>Log a meeting</h3>

      <form className="meeting-form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Client</span>
          <input value={form.clientName} onChange={set("clientName")} placeholder="Rakesh Sharma" required />
        </div>

        <div className="field">
          <span>Location</span>
          <input value={form.location} onChange={set("location")} placeholder="Mahmoorganj office" required />
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

        <div className="field field-wide">
          <span>Notes</span>
          <textarea
            value={form.notes}
            onChange={set("notes")}
            placeholder="Goals, objections, next steps..."
            rows={4}
            required
          />
        </div>

        <div className="field">
          <span>Outcome</span>
          <input value={form.outcome} onChange={set("outcome")} placeholder="Interested in SIP top-up" />
        </div>

        <div className="field">
          <span>Follow-up note</span>
          <input value={form.followUpSummary} onChange={set("followUpSummary")} placeholder="Call back with documents" />
        </div>

        <div className="field">
          <span>Follow-up date</span>
          <input type="date" value={form.followUpDate} onChange={set("followUpDate")} />
        </div>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="form-actions">
          <span className="form-note">Ctrl+Enter</span>
          <button disabled={busy} type="submit">
            {busy ? "Saving..." : "Create log →"}
          </button>
        </div>
      </form>
    </section>
  );
}
