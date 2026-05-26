import React from "react";
import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import { formatDateOnly, isOverdue } from "../utils/format";

export default function CommandCenterPage({ clients, logs, messages, stats, tasks, user }) {
  const recentItems = [...logs, ...messages]
    .map((item) =>
      item.clientName
        ? {
            id: item._id,
            type: "Meeting",
            title: item.clientName,
            detail: `${item.staffName} / ${item.location}`,
            createdAt: item.createdAt,
          }
        : {
            id: item._id,
            type: "Channel",
            title: item.senderName,
            detail: item.text || item.attachmentName || "Shared a file",
            createdAt: item.createdAt,
          }
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const priorityTasks = [...tasks]
    .filter((task) => task.status === "open")
    .sort((a, b) => {
      if (isOverdue(a.dueDate) && !isOverdue(b.dueDate)) return -1;
      if (!isOverdue(a.dueDate) && isOverdue(b.dueDate)) return 1;
      return new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt);
    })
    .slice(0, 6);

  const quietClients = [...clients]
    .filter((client) => client.lastMeetingAt)
    .sort((a, b) => new Date(a.lastMeetingAt) - new Date(b.lastMeetingAt))
    .slice(0, 4);

  const staffBoard = Object.entries(stats.logsByStaff || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel-metrics">
          <MetricCard accent="teal" label="Meetings" note="All logs" value={stats.totalLogs} />
          <MetricCard accent="slate" label="Clients" note="Tracked" value={stats.uniqueClients} />
          <MetricCard accent="amber" label="Open tasks" note="Pending" value={stats.openTasks} />
          <MetricCard accent="rose" label="Overdue" note="Needs action" value={stats.overdueTasks} />
        </div>
      </section>

      <div className="two-column-grid two-column-grid-wide">
        <section className="surface-card">
          <div className="panel-kicker">Action queue</div>
          <h3>Priority follow-ups</h3>
          <div className="mini-task-stack">
            {priorityTasks.length ? (
              priorityTasks.map((task) => (
                <Link className="mini-task-card" key={task._id} to={`/app/clients/${task.clientId}`}>
                  <div className="mini-task-top">
                    <strong>{task.title}</strong>
                    <span className={`status-pill ${isOverdue(task.dueDate) ? "status-overdue" : "status-neutral"}`}>
                      {isOverdue(task.dueDate) ? "Overdue" : task.priority}
                    </span>
                  </div>
                  <p>{task.clientName}</p>
                  <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No due date"}</span>
                </Link>
              ))
            ) : (
              <div className="empty-state compact-empty-state">
                <h4>No open follow-ups</h4>
                <p>New meeting logs and client workspaces will create the action queue here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="panel-kicker">Cross-team timeline</div>
          <h3>Recent activity</h3>
          <div className="timeline-list">
            {recentItems.length ? (
              recentItems.map((item) => (
                <div className="timeline-row" key={item.id}>
                  <div className="timeline-tag">{item.type}</div>
                  <div className="timeline-copy">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <time>{formatDateOnly(item.createdAt)}</time>
                </div>
              ))
            ) : (
              <div className="empty-state compact-empty-state">
                <h4>No activity yet</h4>
                <p>Meeting logs and internal messages will start shaping this timeline automatically.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="two-column-grid">
        <section className="surface-card">
          <div className="panel-kicker">Coverage health</div>
          <h3>Clients going quiet</h3>
          <div className="quiet-client-stack">
            {quietClients.length ? (
              quietClients.map((client) => (
                <Link className="quiet-client-card" key={client._id} to={`/app/clients/${client._id}`}>
                  <strong>{client.primaryHolderName}</strong>
                  <p>{client.city || "Location not recorded"}</p>
                  <span>Last meeting: {formatDateOnly(client.lastMeetingAt)}</span>
                </Link>
              ))
            ) : (
              <div className="empty-state compact-empty-state">
                <h4>No stale relationships yet</h4>
                <p>As meeting history builds up, this panel will help surface neglected coverage.</p>
              </div>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="panel-kicker">Team cadence</div>
          <h3>Staff activity board</h3>
          <div className="staff-board">
            {staffBoard.length ? (
              staffBoard.map(([staffName, count]) => (
                <div className="staff-board-item" key={staffName}>
                  <div>
                    <strong>{staffName}</strong>
                    <p>Meeting logs recorded in the current dataset</p>
                  </div>
                  <span>{count}</span>
                </div>
              ))
            ) : (
              <div className="empty-inline">No staff activity yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
