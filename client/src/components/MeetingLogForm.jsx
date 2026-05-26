import React, { useState } from "react";

const initialState = {
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
        ...form,
        followUpDate: form.followUpDate || undefined,
      });
      setForm(initialState);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-card accent-card sticky-panel">
      <div className="panel-kicker">New meeting</div>
      <h3>Add log</h3>

      <form className="meeting-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Client name</span>
          <input
            value={form.clientName}
            onChange={(event) => updateField("clientName", event.target.value)}
            placeholder="Rakesh Sharma"
            required
          />
        </label>

        <label className="field">
          <span>Meeting location</span>
          <input
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Mahmoorganj office"
            required
          />
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

        <label className="field field-wide">
          <span>Advisory notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Capture goals, objections, portfolio questions, promised actions, servicing issues, and next steps."
            rows="7"
            required
          />
        </label>

        <label className="field">
          <span>Outcome</span>
          <input
            value={form.outcome}
            onChange={(event) => updateField("outcome", event.target.value)}
            placeholder="Interested in SIP top-up after family discussion"
          />
        </label>

        <label className="field">
          <span>Follow-up summary</span>
          <input
            value={form.followUpSummary}
            onChange={(event) => updateField("followUpSummary", event.target.value)}
            placeholder="Call back with comparison and documents list"
          />
        </label>

        <label className="field">
          <span>Follow-up date</span>
          <input
            value={form.followUpDate}
            onChange={(event) => updateField("followUpDate", event.target.value)}
            type="date"
          />
        </label>

        <div className="form-actions">
          <div className="form-note">Keep it short and useful.</div>
          <button disabled={busy} type="submit">
            {busy ? "Saving entry..." : "Create meeting log"}
          </button>
        </div>
      </form>
    </section>
  );
}
