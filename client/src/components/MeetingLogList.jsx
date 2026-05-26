import React from "react";
import { Link } from "react-router-dom";
import { formatDate, formatDateOnly } from "../utils/format";

export default function MeetingLogList({ logs, user, filters, onFilterChange, onUpdate, onDelete }) {
  const staffNames = [...new Set(logs.map((log) => log.staffName))].sort();

  return (
    <section className="surface-card">
      <div className="panel-kicker">Logs</div>
      <h3>All meetings</h3>

      <div className="filter-bar">
        <input
          value={filters.query}
          onChange={(event) => onFilterChange("query", event.target.value)}
          placeholder="Search client, place, discussion, or staff"
        />

        {user.role === "owner" ? (
          <select value={filters.staff} onChange={(event) => onFilterChange("staff", event.target.value)}>
            <option value="">All staff members</option>
            {staffNames.map((staffName) => (
              <option key={staffName} value={staffName}>
                {staffName}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <h4>No meeting logs match the current view</h4>
          <p>Once the team starts logging field visits, this register will become the shared command history.</p>
        </div>
      ) : (
        <div className="log-list">
          {logs.map((log) => (
            <article className="log-record" key={log._id}>
              <div className="log-record-header">
                <div>
                  <div className="log-record-client-row">
                    <div className="log-record-client">{log.clientName}</div>
                    {log.clientId ? (
                      <Link className="inline-link" to={`/app/clients/${log.clientId}`}>
                        Open client
                      </Link>
                    ) : null}
                  </div>
                  <div className="log-record-meta">
                    {log.staffName} / {log.location} / {formatDate(log.createdAt)}
                  </div>
                </div>
                <div className="action-row">
                  <span className={`priority-pill priority-${log.priority}`}>{log.priority}</span>
                  <button className="secondary" type="button" onClick={() => onUpdate(log)}>
                    Refine
                  </button>
                  <button className="danger" type="button" onClick={() => onDelete(log._id)}>
                    Remove
                  </button>
                </div>
              </div>
              <p className="log-record-notes">{log.notes}</p>
              <div className="log-record-footer">
                <span>{log.meetingType || "review"}</span>
                {log.outcome ? <span>Outcome: {log.outcome}</span> : null}
                {log.followUpSummary ? (
                  <span>
                    Follow-up: {log.followUpSummary}
                    {log.followUpDate ? ` / ${formatDateOnly(log.followUpDate)}` : ""}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
