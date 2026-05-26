import React from "react";
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
  return (
    <div className="page-stack">
      <section className="surface-card surface-card-hero">
        <div className="panel-kicker">Meetings</div>
        <h3>Meeting register</h3>
      </section>

      <div className="meetings-page-grid">
        <MeetingLogForm onCreate={onCreateLog} />
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
