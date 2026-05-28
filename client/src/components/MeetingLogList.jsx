import React from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { formatDate, formatDateOnly } from "../utils/format";

export default function MeetingLogList({ logs, user, filters, onFilterChange, onUpdate, onDelete }) {
  const staffNames = [...new Set(logs.map((l) => l.staffName))].sort();

  return (
    <section className="surface-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s3)" }}>
        <div>
          <div className="panel-kicker">History</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>All meetings</h3>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
          {logs.length} records
        </span>
      </div>

      <div className="filter-bar" style={{ marginBottom: "var(--s4)" }}>
        <input
          value={filters.query}
          onChange={(e) => onFilterChange("query", e.target.value)}
          placeholder="Search client, location, notes, or staff…"
        />
        {user.role === "owner" && (
          <select
            value={filters.staff}
            onChange={(e) => onFilterChange("staff", e.target.value)}
          >
            <option value="">All staff</option>
            {staffNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <h4>No records found</h4>
          <p>Logs will appear here once meetings are recorded, or try a different search.</p>
        </div>
      ) : (
        <div className="log-list">
          {logs.map((log) => (
            <article className="log-record" key={log._id}>
              <div className="log-record-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="log-record-client-row">
                    <span className="log-record-client">{log.clientName}</span>
                    <span className={`priority-${log.priority}`} style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {log.priority}
                    </span>
                    {log.clientId && (
                      <Link className="inline-link" to={`/app/clients/${log.clientId}`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        Profile <ArrowUpRight size={11} />
                      </Link>
                    )}
                  </div>
                  <div className="log-record-meta">
                    {log.staffName} · {log.location} · {formatDate(log.createdAt)}
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="icon-button"
                    onClick={() => onUpdate(log)}
                    title="Edit log"
                    aria-label="Edit log"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onDelete(log._id)}
                    title="Delete log"
                    aria-label="Delete log"
                    style={{ color: "var(--red)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <p className="log-record-notes">{log.notes}</p>

              <div className="log-record-footer">
                <span
                  style={{
                    background: "var(--surface-3)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-2)",
                  }}
                >
                  {log.meetingType || "review"}
                </span>
                {log.outcome && <span>Outcome: {log.outcome}</span>}
                {log.followUpSummary && (
                  <span>
                    Follow-up: {log.followUpSummary}
                    {log.followUpDate ? ` · ${formatDateOnly(log.followUpDate)}` : ""}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}