import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Calendar, Layers, RefreshCcw } from "lucide-react";
import CollectionModal from "../components/CollectionModal";
import { formatDateOnly } from "../utils/format";

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function safeId(value) {
  if (!value) return "";
  return String(value);
}

const TABS = [
  { id: "all", label: "All" },
  { id: "meeting", label: "Meetings" },
  { id: "transaction", label: "Orders" },
  // chat intentionally excluded from notifications list per requirement.
];

export default function NotificationsPage({
  logs = [],
  orders = [],
  onClearUnread,
  unreadCount,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [activeKind, setActiveKind] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const notifications = useMemo(() => {
    const items = [];

    // Meetings + follow-ups
    for (const log of logs) {
      items.push({
        id: `meeting-${safeId(log._id)}`,
        kind: "meeting",
        title: log.clientName,
        detail: `${log.staffName} · ${log.location}`,
        createdAt: log.createdAt,
        to: `/app/meetings`,
        ctaLabel: "View meetings",
      });

      if (log.followUpSummary || log.followUpDate) {
        items.push({
          id: `followup-${safeId(log._id)}`,
          kind: "meeting",
          title: log.followUpSummary || `Follow up ${log.clientName}`,
          detail: [
            log.clientName,
            log.followUpDate ? `Due ${formatDateOnly(log.followUpDate)}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          createdAt: log.followUpDate || log.createdAt,
          to: `/app/meetings`,
          ctaLabel: "View meetings",
        });
      }
    }

    // Transactions/orders (generic)
    for (const order of orders) {
      items.push({
        id: `order-${safeId(order._id)}`,
        kind: "transaction",
        title: `${order.schemeCode} · ${order.orderIntentType}`,
        detail: `Client: ${order.clientName || order.clientId || "—"} · Status: ${order.status}`,
        createdAt: order.createdAt || order.transactionDate || order.submittedAt || order.updatedAt,
        to: `/app/transactions`,
        ctaLabel: "Open orders",
      });
    }

    return sortNewest(items);
  }, [logs, orders]);

  const visible = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "meeting") return notifications.filter((n) => n.kind === "meeting");
    if (activeTab === "transaction") return notifications.filter((n) => n.kind === "transaction");
    return notifications;
  }, [activeTab, notifications]);

  useEffect(() => {
    // Mark all notifications as read when the page opens.
    onClearUnread?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modalConfig = useMemo(() => {
    if (!activeKind) return null;
    return {
      title: "Notification",
      subtitle: activeKind.kind === "meeting" ? "Meetings" : "Orders",
      tabs: [
        { id: "details", label: "Details", count: 1 },
      ],
      items: activeKind ? [activeKind] : [],
      renderItem: (item) => (
        <div className="collection-modal-body">
          <div className="workspace-card" style={{ padding: 16, borderRadius: 18 }}>
            <div className="section-heading-row">
              <div>
                <div className="section-kicker">{item.kind}</div>
                <h3 style={{ marginTop: 2 }}>{item.title}</h3>
              </div>
              <div className="mono-chip">
                <Calendar size={14} /> {formatDateOnly(item.createdAt)}
              </div>
            </div>
            <p style={{ marginTop: 10 }}>{item.detail}</p>
            <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <a className="btn btn-secondary btn-sm" href={item.to} onClick={(e) => e.preventDefault()}>
                <ArrowUpRight size={14} /> {item.ctaLabel}
              </a>
              <span className="dialog-note">Use sidebar navigation to jump.</span>
            </div>
          </div>
        </div>
      ),
      emptyTitle: "Nothing",
      emptyText: "No notification selected.",
    };
  }, [activeKind]);

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero">
        <div>
          <div className="section-kicker">Notifications</div>
          <h3>All updates</h3>
          <p>
            Unread: <strong style={{ color: "var(--text)" }}>{unreadCount || 0}</strong>
          </p>
        </div>
        <div className="action-row">
          <span className="mono-chip">
            <Layers size={12} /> {visible.length} items
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
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`filter-chip${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="timeline-list">
          {visible.length ? (
            visible.map((n) => (
              <article className="timeline-row" key={n.id}>
                <span className="timeline-tag">{n.kind === "meeting" ? "meeting" : "order"}</span>
                <div className="timeline-copy">
                  <strong>{n.title}</strong>
                  <p>{n.detail}</p>
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 10 }}>
                  <time>{formatDateOnly(n.createdAt)}</time>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveKind(n)}
                  >
                    Details <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty-state">
              <h4>No notifications</h4>
              <p>You're all caught up.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span className="dialog-note">Internal chat messages are shown only as a badge on the chat button.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </section>

      <CollectionModal
        open={modalOpen}
        title={modalConfig?.title || ""}
        subtitle={modalConfig?.subtitle || ""}
        tabs={modalConfig?.tabs || []}
        activeTab={"details"}
        onTabChange={() => {}}
        items={modalConfig?.items || []}
        renderItem={modalConfig?.renderItem}
        emptyTitle={modalConfig?.emptyTitle || "Nothing"}
        emptyText={modalConfig?.emptyText || ""}
        onClose={() => {
          setModalOpen(false);
          setActiveKind(null);
        }}
      />
    </div>
  );
}

