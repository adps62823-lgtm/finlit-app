import React from "react";
import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import { formatDateOnly, isOverdue } from "../utils/format";

export default function CommandCenterPage({ clients, logs, messages, stats, tasks }) {
  const recentItems = [...logs, ...messages]
    .map((item) =>
      item.clientName
        ? { id: item._id, type: "Meeting", title: item.clientName, detail: `${item.staffName} · ${item.location}`, createdAt: item.createdAt }
        : { id: item._id, type: "Chat", title: item.senderName, detail: item.text || item.attachmentName || "Shared a file", createdAt: item.createdAt }
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
      <div className="hero-panel-metrics">
        <MetricCard accent="teal" label="Meetings" note="Total" value={stats.totalLogs} />
        <MetricCard accent="slate" label="Clients" note="Active" value={stats.uniqueClients} />
        <MetricCard accent="amber" label="Open tasks" note="Pending" value={stats.openTasks} />
        <MetricCard accent="rose" label="Overdue" note="Action needed" value={stats.overdueTasks} />
      </div>

      <div className="two-column-grid-wide">
        <section className="workspace-card">
          <div className="section-kicker">Action queue</div>
          <h3>Priority tasks</h3>
          <div className="mini-task-stack">
            {priorityTasks.length ? priorityTasks.map((task) => (
              <Link className="mini-task-card" key={task._id} to={`/app/clients/${task.clientId}`}>
                <div className="mini-task-top">
                  <strong>{task.title}</strong>
                  <span className={isOverdue(task.dueDate) ? "status-overdue" : `priority-${task.priority}`}>
                    {isOverdue(task.dueDate) ? "Overdue" : task.priority}
                  </span>
                </div>
                <p>{task.clientName}</p>
                <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No due date"}</span>
              </Link>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No open tasks</h4>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-card">
          <div className="section-kicker">Timeline</div>
          <h3>Recent activity</h3>
          <div className="timeline-list">
            {recentItems.length ? recentItems.map((item) => (
              <div className="timeline-row" key={item.id}>
                <span className="timeline-tag">{item.type}</span>
                <div className="timeline-copy">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{formatDateOnly(item.createdAt)}</time>
              </div>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No activity yet</h4>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="two-column-grid">
        <section className="workspace-card">
          <div className="section-kicker">Coverage</div>
          <h3>Going quiet</h3>
          <div className="quiet-client-stack">
            {quietClients.length ? quietClients.map((client) => (
              <Link className="quiet-client-card" key={client._id} to={`/app/clients/${client._id}`}>
                <strong>{client.primaryHolderName}</strong>
                <p>{client.city || "—"}</p>
                <span>Last met {formatDateOnly(client.lastMeetingAt)}</span>
              </Link>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>All clients active</h4>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-card">
          <div className="section-kicker">Team</div>
          <h3>Staff activity</h3>
          <div className="staff-board">
            {staffBoard.length ? staffBoard.map(([name, count]) => (
              <div className="staff-board-item" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>Logs</p>
                </div>
                <span>{count}</span>
              </div>
            )) : (
              <p className="empty-inline">No activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
