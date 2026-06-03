import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { formatDate, formatDateOnly } from "../utils/format";

export default function MeetingLogList({ logs, user, filters, onFilterChange, onUpdate, onDelete }) {
  const [activeDeleteId, setActiveDeleteId] = useState("");
  const staffNames = useMemo(() => [...new Set(logs.map((log) => log.staffName))].sort(), [logs]);

  async function handleDelete(logId) {
    setActiveDeleteId(logId);
    try {
      await onDelete(logId);
    } finally {
      setActiveDeleteId("");
    }
  }

  return (
    <section className="workspace-card">
      <div className="section-heading-row">
        <div>
          <div className="section-kicker">History</div>
          <h3>All meetings</h3>
        </div>
        <span className="mono-chip">{logs.length} records</span>
      </div>

      <div className="filter-bar">
        <input
          value={filters.query}
          onChange={(event) => onFilterChange("query", event.target.value)}
          placeholder="Search client, location, notes, or staff..."
        />
        {user.role === "owner" ? (
          <select value={filters.staff} onChange={(event) => onFilterChange("staff", event.target.value)}>
            <option value="">All staff</option>
            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <h4>No records found</h4>
          <p>Logs will appear here once meetings are recorded, or try a different search.</p>
        </div>
      ) : (
        <div className="log-list">
          {logs.map((log) => {
            const deleting = activeDeleteId === log._id;
            return (
              <article className="log-record" key={log._id}>
                <div className="log-record-header">
                  <div className="log-record-copy">
                    <div className="log-record-client-row">
                      <span className="log-record-client">{log.clientName}</span>
                      <span className={`priority-${log.priority}`}>{log.priority}</span>
                      {log.clientId ? (
                        <Link className="inline-link" to={`/app/clients/${log.clientId}`}>
                          Profile <ArrowUpRight size={11} />
                        </Link>
                      ) : null}
                    </div>
                    <div className="log-record-meta">
                      {log.staffName} . {log.location} . {formatDate(log.createdAt)}
                    </div>
                  </div>

                  <div className="action-row">
                    <button
                      className="icon-btn"
                      onClick={() => onUpdate(log)}
                      title="Edit log"
                      aria-label="Edit log"
                      disabled={deleting}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(log._id)}
                      title="Delete log"
                      aria-label="Delete log"
                      disabled={deleting}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="log-record-notes">{log.notes}</p>

                <div className="log-record-footer">
                  <span className="pill muted">{log.meetingType || "review"}</span>
                  {log.outcome ? <span>Outcome: {log.outcome}</span> : null}
                  {log.followUpSummary ? (
                    <span>
                      Follow-up: {log.followUpSummary}
                      {log.followUpDate ? ` . ${formatDateOnly(log.followUpDate)}` : ""}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
