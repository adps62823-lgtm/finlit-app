import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Filter, MoreHorizontal } from "lucide-react";
import CollectionModal from "../components/CollectionModal";
import MetricCard from "../components/MetricCard";
import { formatDateOnly, isOverdue } from "../utils/format";

const TIMELINE_TABS = [
  { id: "all", label: "All" },
  { id: "meeting", label: "Meetings" },
  { id: "followup", label: "Follow-ups" },
  { id: "chat", label: "Chat" },
  { id: "task", label: "Tasks" },
];

const COVERAGE_TABS = [
  { id: "all", label: "All" },
  { id: "quiet", label: "Quiet" },
  { id: "recent", label: "Recent" },
  { id: "idle", label: "Idle" },
];

const ACTIVITY_TABS = [
  { id: "all", label: "All" },
  { id: "top", label: "Top" },
  { id: "rest", label: "Rest" },
];

const TASK_TABS = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "team", label: "Team" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function daysSince(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / 86400000;
}

export default function CommandCenterPage({ clients, logs, messages, stats, tasks, user }) {
  const [activePanel, setActivePanel] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const timelineItems = useMemo(() => {
    const items = [];

    logs.forEach((log) => {
      items.push({
        id: `meeting-${log._id}`,
        kind: "meeting",
        title: log.clientName,
        detail: `${log.staffName} · ${log.location}`,
        createdAt: log.createdAt,
      });

      if (log.followUpSummary || log.followUpDate) {
        items.push({
          id: `followup-${log._id}`,
          kind: "followup",
          title: log.followUpSummary || `Follow up ${log.clientName}`,
          detail: [log.clientName, log.followUpDate ? `Due ${formatDateOnly(log.followUpDate)}` : ""].filter(Boolean).join(" · "),
          createdAt: log.followUpDate || log.createdAt,
        });
      }
    });

    messages.forEach((message) => {
      items.push({
        id: `chat-${message._id}`,
        kind: "chat",
        title: message.senderName,
        detail: message.text || message.attachmentName || "Shared a file",
        createdAt: message.createdAt,
      });
    });

    tasks.forEach((task) => {
      items.push({
        id: `task-${task._id}`,
        kind: "task",
        title: task.title,
        detail: [task.clientName, task.assignedToName || "Self"].filter(Boolean).join(" · "),
        createdAt: task.createdAt,
      });
    });

    return sortNewest(items);
  }, [logs, messages, tasks]);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === "open").sort((a, b) => {
      if (isOverdue(a.dueDate) && !isOverdue(b.dueDate)) return -1;
      if (!isOverdue(a.dueDate) && isOverdue(b.dueDate)) return 1;
      return new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt);
    }),
    [tasks]
  );

  const myTasks = useMemo(
    () => openTasks.filter((task) => task.assignedToUserId === user?._id),
    [openTasks, user]
  );
  const teamTasks = useMemo(
    () => openTasks.filter((task) => task.assignedToUserId && task.assignedToUserId !== user?._id),
    [openTasks, user]
  );

  const coverageClients = useMemo(
    () =>
      [...clients].sort((a, b) => {
        const ageA = daysSince(a.lastMeetingAt);
        const ageB = daysSince(b.lastMeetingAt);
        if (!Number.isFinite(ageA) && !Number.isFinite(ageB)) return (a.primaryHolderName || "").localeCompare(b.primaryHolderName || "");
        if (!Number.isFinite(ageA)) return 1;
        if (!Number.isFinite(ageB)) return -1;
        if (ageA === ageB) return (a.primaryHolderName || "").localeCompare(b.primaryHolderName || "");
        return ageB - ageA;
      }),
    [clients]
  );

  const staffBoard = useMemo(() => Object.entries(stats.logsByStaff || {}).sort((a, b) => b[1] - a[1]), [stats.logsByStaff]);

  const modalConfig = useMemo(() => {
    if (activePanel === "timeline") {
      const filtered = timelineItems.filter((item) => activeFilter === "all" || item.kind === activeFilter);
      return {
        title: "Timeline",
        subtitle: "Events",
        tabs: TIMELINE_TABS.map((tab) => ({ ...tab, count: timelineItems.filter((item) => tab.id === "all" || item.kind === tab.id).length })),
        items: filtered,
        emptyTitle: "No events",
        emptyText: "Nothing to show yet.",
        renderItem: (item) => (
          <article className="timeline-row" key={item.id}>
            <span className="timeline-tag">{item.kind}</span>
            <div className="timeline-copy">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <time>{formatDateOnly(item.createdAt)}</time>
          </article>
        ),
      };
    }

    if (activePanel === "coverage") {
      const filtered = coverageClients.filter((client) => {
        const age = daysSince(client.lastMeetingAt);
        if (activeFilter === "quiet") return age >= 30;
        if (activeFilter === "recent") return age < 30;
        if (activeFilter === "idle") return !client.lastMeetingAt;
        return true;
      });
      return {
        title: "Coverage",
        subtitle: "Clients",
        tabs: COVERAGE_TABS.map((tab) => ({
          ...tab,
          count:
            tab.id === "all"
              ? coverageClients.length
              : coverageClients.filter((client) => {
                  const age = daysSince(client.lastMeetingAt);
                  if (tab.id === "quiet") return age >= 30;
                  if (tab.id === "recent") return age < 30;
                  if (tab.id === "idle") return !client.lastMeetingAt;
                  return true;
                }).length,
        })),
        items: filtered,
        emptyTitle: "No clients",
        emptyText: "No coverage data.",
        renderItem: (client) => (
          <article className="search-result" key={client._id}>
            <div className="search-result-copy">
              <div className="search-result-title-row">
                <strong>{client.primaryHolderName}</strong>
                <span>{client.relationshipStatus || "active"}</span>
              </div>
              <p>{client.city || "—"}</p>
            </div>
            <Link className="inline-link" to={`/app/clients/${client._id}`}>
              <ArrowUpRight size={12} />
            </Link>
          </article>
        ),
      };
    }

    if (activePanel === "activity") {
      const filtered = staffBoard.filter(([, count], index) => {
        if (activeFilter === "top") return index < 3;
        if (activeFilter === "rest") return index >= 3;
        return true;
      });
      return {
        title: "Activity",
        subtitle: "Team",
        tabs: ACTIVITY_TABS.map((tab) => ({ ...tab, count: tab.id === "all" ? staffBoard.length : filtered.length })),
        items: filtered,
        emptyTitle: "No activity",
        emptyText: "Team metrics are empty.",
        renderItem: ([name, count]) => (
          <article className="staff-board-item" key={name}>
            <div>
              <strong>{name}</strong>
              <p>Logs</p>
            </div>
            <span>{count}</span>
          </article>
        ),
      };
    }

    if (activePanel === "tasks") {
      const pool = user?.role === "owner" ? tasks : myTasks;
      const filtered = pool.filter((task) => {
        if (activeFilter === "mine") return task.assignedToUserId === user?._id;
        if (activeFilter === "team") return task.assignedToUserId && task.assignedToUserId !== user?._id;
        if (activeFilter === "open") return task.status === "open";
        if (activeFilter === "done") return task.status === "done";
        return true;
      });
      return {
        title: "Tasks",
        subtitle: "Follow-ups",
        tabs: TASK_TABS.map((tab) => ({ ...tab, count: pool.filter((task) => {
          if (tab.id === "mine") return task.assignedToUserId === user?._id;
          if (tab.id === "team") return task.assignedToUserId && task.assignedToUserId !== user?._id;
          if (tab.id === "open") return task.status === "open";
          if (tab.id === "done") return task.status === "done";
          return true;
        }).length })),
        items: filtered,
        emptyTitle: "No tasks",
        emptyText: "No follow-ups in this view.",
        renderItem: (task) => (
          <Link className="task-card task-card-link" key={task._id} to={`/app/clients/${task.clientId}`}>
            <div className="task-card-top">
              <div className="task-card-copy">
                <div className="task-card-title-row">
                  <strong>{task.title}</strong>
                  <span className={`priority-${task.priority}`}>{task.priority}</span>
                  {task.taskType ? <span className="pill muted">{task.taskType.replace(/_/g, " ")}</span> : null}
                </div>
                <p className="task-client-name">{task.clientName}</p>
                {task.assignedToName ? <p className="task-client-name">To {task.assignedToName}</p> : null}
              </div>
              <span className={isOverdue(task.dueDate) ? "status-overdue" : "status-neutral"}>{task.status}</span>
            </div>
          </Link>
        ),
      };
    }

    return null;
  }, [activeFilter, activePanel, coverageClients, myTasks, staffBoard, tasks, timelineItems, user]);

  const taskCardItems = myTasks.slice(0, 3);
  const teamCardItems = teamTasks.slice(0, 3);
  const timelinePreview = timelineItems.slice(0, 3);
  const quietPreview = coverageClients.slice(0, 3);
  const activityPreview = staffBoard.slice(0, 3);

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
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Queue</div>
              <h3>Tasks</h3>
            </div>
            <div className="action-row">
              <span className="mono-chip"><Filter size={12} /> {taskCardItems.length}</span>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setActivePanel("tasks"); setActiveFilter("mine"); }}>
                View more
              </button>
            </div>
          </div>
          <div className="mini-task-stack">
            {taskCardItems.length ? taskCardItems.map((task) => (
              <Link className="mini-task-card" key={task._id} to={`/app/clients/${task.clientId}`}>
                <div className="mini-task-top">
                  <strong>{task.title}</strong>
                  <span className={isOverdue(task.dueDate) ? "status-overdue" : `priority-${task.priority}`}>
                    {isOverdue(task.dueDate) ? "Overdue" : task.priority}
                  </span>
                </div>
                <p>{task.clientName}</p>
                <span>{task.dueDate ? `Due ${formatDateOnly(task.dueDate)}` : "No date"}</span>
              </Link>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No open tasks</h4>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Timeline</div>
              <h3>Recent</h3>
            </div>
            <div className="action-row">
              <span className="mono-chip"><MoreHorizontal size={12} /> {timelinePreview.length}</span>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setActivePanel("timeline"); setActiveFilter("all"); }}>
                View more
              </button>
            </div>
          </div>
          <div className="timeline-list">
            {timelinePreview.length ? timelinePreview.map((item) => (
              <div className="timeline-row" key={item.id}>
                <span className="timeline-tag">{item.kind}</span>
                <div className="timeline-copy">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{formatDateOnly(item.createdAt)}</time>
              </div>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No activity</h4>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="two-column-grid">
        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Coverage</div>
              <h3>Quiet</h3>
            </div>
            <div className="action-row">
              <span className="mono-chip"><MoreHorizontal size={12} /> {quietPreview.length}</span>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setActivePanel("coverage"); setActiveFilter("all"); }}>
                View more
              </button>
            </div>
          </div>
          <div className="quiet-client-stack">
            {quietPreview.length ? quietPreview.map((client) => (
              <Link className="quiet-client-card" key={client._id} to={`/app/clients/${client._id}`}>
                <strong>{client.primaryHolderName}</strong>
                <p>{client.city || "—"}</p>
                <span>Last met {formatDateOnly(client.lastMeetingAt)}</span>
              </Link>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>All active</h4>
              </div>
            )}
          </div>
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Activity</div>
              <h3>Team</h3>
            </div>
            <div className="action-row">
              <span className="mono-chip"><MoreHorizontal size={12} /> {activityPreview.length}</span>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setActivePanel("activity"); setActiveFilter("all"); }}>
                View more
              </button>
            </div>
          </div>
          <div className="staff-board">
            {activityPreview.length ? activityPreview.map(([name, count]) => (
              <div className="staff-board-item" key={name}>
                <div>
                  <strong>{name}</strong>
                  <p>Logs</p>
                </div>
                <span>{count}</span>
              </div>
            )) : (
              <p className="empty-inline">No activity.</p>
            )}
          </div>
        </section>
      </div>

      <section className="workspace-card">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">Team</div>
            <h3>Other follow-ups</h3>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setActivePanel("tasks"); setActiveFilter("team"); }}>
            View more
          </button>
        </div>
        <div className="mini-task-stack">
          {teamCardItems.length ? teamCardItems.map((task) => (
            <Link className="mini-task-card" key={task._id} to={`/app/clients/${task.clientId}`}>
              <div className="mini-task-top">
                <strong>{task.title}</strong>
                <span className={isOverdue(task.dueDate) ? "status-overdue" : `priority-${task.priority}`}>
                  {isOverdue(task.dueDate) ? "Overdue" : task.priority}
                </span>
              </div>
              <p>{task.clientName}</p>
              <span>{task.assignedToName || "Team"}</span>
            </Link>
          )) : (
            <div className="empty-state compact-empty-state">
              <h4>No team follow-ups</h4>
            </div>
          )}
        </div>
      </section>

      <CollectionModal
        open={Boolean(activePanel && modalConfig)}
        title={modalConfig?.title || ""}
        subtitle={modalConfig?.subtitle || ""}
        tabs={modalConfig?.tabs || []}
        activeTab={activeFilter}
        onTabChange={setActiveFilter}
        items={modalConfig?.items || []}
        renderItem={modalConfig?.renderItem || (() => null)}
        emptyTitle={modalConfig?.emptyTitle || "Nothing"}
        emptyText={modalConfig?.emptyText || ""}
        onClose={() => setActivePanel("")}
      />
    </div>
  );
}
