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
    setFormOpen(false);
  }

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero meetings-page-header">
        <div>
          <div className="section-kicker">Meetings</div>
          <h3>Register</h3>
        </div>
        <button
          className="btn btn-primary meetings-fab-trigger"
          onClick={() => setFormOpen((value) => !value)}
          aria-label={formOpen ? "Close" : "New log"}
          type="button"
        >
          {formOpen ? (
            <>
              <X size={15} /> Close
            </>
          ) : (
            <>
              <Plus size={15} /> New meeting
            </>
          )}
        </button>
      </section>

      <div className="meetings-page-grid">
        <div className={`meetings-form-col${formOpen ? " meetings-form-col--open" : ""}`}>
          <MeetingLogForm onCreate={handleCreate} />
        </div>

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
