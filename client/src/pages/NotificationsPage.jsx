import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BellRing, Filter, RefreshCcw, X } from "lucide-react";
import { formatDateOnly } from "../utils/format";

const TABS = [
  { id: "all", label: "All" },
  { id: "task", label: "Tasks" },
  { id: "order", label: "Orders" },
  { id: "system", label: "System" },
];

function kindGroup(kind = "") {
  if (kind.startsWith("task")) return "task";
  if (kind.startsWith("order")) return "order";
  return "system";
}

export default function NotificationsPage({ notifications = [], unreadCount = 0, onClearUnread }) {
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    onClearUnread?.();
  }, [onClearUnread]);

  const visible = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((item) => kindGroup(item.kind) === activeTab);
  }, [activeTab, notifications]);

  const unread = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero">
        <div>
          <div className="section-kicker">Notifications</div>
          <h3>Updates feed</h3>
          <p>{unreadCount ?? unread} unread</p>
        </div>
        <div className="action-row">
          <span className="mono-chip">
            <BellRing size={12} /> {visible.length}
          </span>
        </div>
      </section>

      <section className="workspace-card">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">Filter</div>
            <h3>Feed</h3>
          </div>
          <div className="filter-chip-row">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Filter size={12} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="timeline-list">
          {visible.length ? (
            visible.map((item) => (
              <article className="timeline-row" key={item._id}>
                <span className={`timeline-tag ${!item.readAt ? "status-overdue" : ""}`}>{kindGroup(item.kind)}</span>
                <div className="timeline-copy">
                  <strong>{item.title}</strong>
                  <p>{item.detail || item.meta?.note || "Open for more"}</p>
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                  <time>{formatDateOnly(item.createdAt)}</time>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSelected(item)}>
                    Open <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty-state">
              <h4>No notifications</h4>
              <p>You’re all caught up.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="dialog-note">Chat stays on the chat badge only. This page is for everything else.</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.location.reload()}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </section>

      {selected ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="dialog-shell" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <div className="section-kicker">{kindGroup(selected.kind)}</div>
                <h3>{selected.title}</h3>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)} type="button" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="workspace-card" style={{ padding: 16 }}>
              <p>{selected.detail || "No extra details."}</p>
              <div className="action-row" style={{ marginTop: 14 }}>
                {selected.actionPath ? (
                  <a className="btn btn-secondary btn-sm" href={selected.actionPath} onClick={(e) => e.preventDefault()}>
                    Open <ArrowUpRight size={14} />
                  </a>
                ) : null}
                <span className="mono-chip">{formatDateOnly(selected.createdAt)}</span>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
