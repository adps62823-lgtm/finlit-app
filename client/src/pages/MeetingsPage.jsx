import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import MeetingLogForm from "../components/MeetingLogForm";
import MeetingLogList from "../components/MeetingLogList";

export default function MeetingsPage({
  logs,
  filters,
  user,
  onCreateLog,
  onFilterChange,
  onDeleteLog,
  onUpdateLog,
}) {
  const [formOpen, setFormOpen] = useState(false);

  async function handleCreate(payload) {
    await onCreateLog(payload);
    setFormOpen(false); // auto-close the form after successful save on mobile
  }

  return (
    <div className="page-stack">
      {/* ── Page header ── */}
      <section className="surface-card surface-card-hero meetings-page-header">
        <div>
          <div className="panel-kicker">Meetings</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>
            Meeting register
          </h3>
        </div>
        {/* "New log" button — only visible on mobile/tablet (hidden on desktop via CSS) */}
        <button
          className="meetings-fab-trigger"
          onClick={() => setFormOpen((s) => !s)}
          aria-label={formOpen ? "Close form" : "Log a new meeting"}
        >
          {formOpen ? <X size={15} /> : <Plus size={15} />}
          {formOpen ? "Close" : "New log"}
        </button>
      </section>

      {/* ── Desktop layout: side-by-side ── */}
      <div className="meetings-page-grid">
        {/* Form column — always visible on desktop; toggled on mobile */}
        <div className={`meetings-form-col${formOpen ? " meetings-form-col--open" : ""}`}>
          <MeetingLogForm onCreate={handleCreate} />
        </div>

        {/* Log list — always visible */}
        <MeetingLogList
          filters={filters}
          logs={logs}
          onDelete={onDeleteLog}
          onFilterChange={onFilterChange}
          onUpdate={onUpdateLog}
          user={user}
        />
      </div>
    </div>
  );
}