import React from "react";
import { X } from "lucide-react";

export default function CollectionModal({
  open,
  title,
  subtitle,
  tabs = [],
  activeTab = "",
  onTabChange,
  items = [],
  renderItem,
  emptyTitle = "Nothing here",
  emptyText = "No items found.",
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog-shell collection-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <div className="section-kicker">{subtitle}</div>
            <h3>{title}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {tabs.length ? (
          <div className="filter-chip-row">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip${activeTab === tab.id ? " active" : ""}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" ? <strong>{tab.count}</strong> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="collection-modal-body">
          {items.length ? (
            <div className="collection-modal-list">{items.map((item) => renderItem(item))}</div>
          ) : (
            <div className="empty-state">
              <h4>{emptyTitle}</h4>
              <p>{emptyText}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
