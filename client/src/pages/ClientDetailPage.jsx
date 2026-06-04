import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import TaskComposer from "../components/TaskComposer";
import TaskList from "../components/TaskList";
import { formatDate, formatDateOnly } from "../utils/format";

const makeDraft = (client) => ({
  primaryHolderName: client?.primaryHolderName || "",
  email: client?.email || "",
  mobile: client?.mobile || "",
  city: client?.city || "",
  familyName: client?.familyName || "",
  relationshipStatus: client?.relationshipStatus || "active",
  notes: client?.notes || "",
  nextAction: client?.nextAction || "",
});

export default function ClientDetailPage({
  clients,
  logs,
  tasks,
  onCreateTask,
  onDeleteTask,
  onToggleTaskStatus,
  onUpdateClient,
}) {
  const { clientId } = useParams();
  const client = clients.find((item) => item._id === clientId);
  const [draft, setDraft] = useState(makeDraft(client));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(makeDraft(client));
    setError("");
  }, [client]);

  const dirty = useMemo(() => {
    if (!client) return false;
    return Object.keys(draft).some((key) => (draft[key] || "") !== (makeDraft(client)[key] || ""));
  }, [client, draft]);

  if (!clientId) return <Navigate replace to="/app/clients" />;

  if (!client) {
    return (
      <div className="page-stack">
        <section className="workspace-card empty-state">
          <h4>Client not found</h4>
          <Link className="inline-link" to="/app/clients">Back</Link>
        </section>
      </div>
    );
  }

  const clientLogs = logs.filter((log) => log.clientId === clientId);
  const clientTasks = tasks.filter((task) => task.clientId === clientId);

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      await onUpdateClient(clientId, draft);
    } catch (err) {
      setError(err.message || "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="workspace-card client-detail-hero">
        <div className="section-kicker">Client</div>
        <div className="client-detail-top">
          <div>
            <h3>{client.primaryHolderName}</h3>
            <p className="panel-subtext">
              {client.city || "City not set"} · {client.relationshipStatus || "active"}
            </p>
          </div>
          <Link className="ghost-link" to="/app/clients">Back</Link>
        </div>

        <div className="client-summary-grid">
          <div className="summary-stat-card">
            <span>Meetings</span>
            <strong>{client.meetingCount || 0}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Open tasks</span>
            <strong>{client.openTaskCount || 0}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Last met</span>
            <strong>{client.lastMeetingAt ? formatDateOnly(client.lastMeetingAt) : "—"}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Next follow-up</span>
            <strong>{client.nextFollowUpDate ? formatDateOnly(client.nextFollowUpDate) : "—"}</strong>
          </div>
        </div>
      </section>

      <div className="two-column-grid two-column-grid-wide">
        <section className="workspace-card">
          <div className="section-kicker">Profile</div>
          <div className="section-heading-row">
            <h3>Details</h3>
            <div className="action-row">
              <button className="btn btn-secondary btn-sm" onClick={() => { setDraft(makeDraft(client)); setError(""); }} disabled={!dirty || busy} type="button">
                Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty || busy} type="button">
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {error ? <div className="inline-error">{error}</div> : null}

          <div className="profile-grid">
            <EditableField label="Name" value={draft.primaryHolderName} onChange={(v) => setDraft((c) => ({ ...c, primaryHolderName: v }))} />
            <EditableField label="Email" value={draft.email} onChange={(v) => setDraft((c) => ({ ...c, email: v }))} />
            <EditableField label="Mobile" value={draft.mobile} onChange={(v) => setDraft((c) => ({ ...c, mobile: v }))} />
            <EditableField label="City" value={draft.city} onChange={(v) => setDraft((c) => ({ ...c, city: v }))} />
            <EditableField label="Family" value={draft.familyName} onChange={(v) => setDraft((c) => ({ ...c, familyName: v }))} />
            <label className="field">
              <span>Status</span>
              <select value={draft.relationshipStatus} onChange={(e) => setDraft((c) => ({ ...c, relationshipStatus: e.target.value }))}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>

          <EditableTextArea label="Notes" value={draft.notes} onChange={(v) => setDraft((c) => ({ ...c, notes: v }))} rows={4} />
          <EditableTextArea label="Next action" value={draft.nextAction} onChange={(v) => setDraft((c) => ({ ...c, nextAction: v }))} rows={3} />
        </section>

        <section className="workspace-card">
          <div className="section-kicker">Follow-ups</div>
          <h3>Tasks</h3>
          <TaskComposer clientId={clientId} onCreate={onCreateTask} />
          <TaskList
            emptyText="No tasks yet."
            onDelete={onDeleteTask}
            onToggleStatus={onToggleTaskStatus}
            tasks={clientTasks}
          />
        </section>
      </div>

      <section className="workspace-card">
        <div className="section-kicker">History</div>
        <h3>Meetings</h3>
        {clientLogs.length ? (
          <div className="timeline-list">
            {clientLogs.map((log) => (
              <article className="timeline-row timeline-row-stacked" key={log._id}>
                <div className="timeline-copy">
                  <strong>{log.meetingType || "review"}</strong>
                  <p>{log.notes}</p>
                  <div className="timeline-meta-line">
                    <span>{log.staffName}</span>
                    <span>{log.location}</span>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                  {log.followUpSummary ? (
                    <div className="follow-up-inline">
                      {log.followUpSummary}
                      {log.followUpDate ? ` / ${formatDateOnly(log.followUpDate)}` : ""}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty-state">
            <h4>No meetings</h4>
          </div>
        )}
      </section>
    </div>
  );
}

function EditableField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function EditableTextArea({ label, value, rows, onChange }) {
  return (
    <label className="field" style={{ marginTop: 14 }}>
      <span>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </label>
  );
}
