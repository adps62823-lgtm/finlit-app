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

  if (!clientId) {
    return <Navigate replace to="/app/clients" />;
  }

  if (!client) {
    return (
      <div className="page-stack">
        <section className="workspace-card empty-state">
          <h4>Client record not found</h4>
          <p>This relationship record may not exist yet or may be outside your current access scope.</p>
          <Link className="inline-link" to="/app/clients">
            Back to client book
          </Link>
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
      setError(err.message || "Unable to save the client profile.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setDraft(makeDraft(client));
    setError("");
  }

  return (
    <div className="page-stack">
      <section className="workspace-card client-detail-hero">
        <div className="section-kicker">Relationship workspace</div>
        <div className="client-detail-top">
          <div>
            <h3>{client.primaryHolderName}</h3>
            <p className="panel-subtext">
              {client.city || "City not captured"} / {client.relationshipStatus || "Active relationship"}
            </p>
          </div>
          <Link className="ghost-link" to="/app/clients">
            Back to client book
          </Link>
        </div>

        <div className="client-summary-grid">
          <div className="summary-stat-card">
            <span>Meeting count</span>
            <strong>{client.meetingCount || 0}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Open follow-ups</span>
            <strong>{client.openTaskCount || 0}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Last meeting</span>
            <strong>{client.lastMeetingAt ? formatDateOnly(client.lastMeetingAt) : "Not set"}</strong>
          </div>
          <div className="summary-stat-card">
            <span>Next follow-up</span>
            <strong>{client.nextFollowUpDate ? formatDateOnly(client.nextFollowUpDate) : "Not set"}</strong>
          </div>
        </div>
      </section>

      <div className="two-column-grid two-column-grid-wide">
        <section className="workspace-card">
          <div className="section-kicker">Profile</div>
          <div className="section-heading-row">
            <h3>Relationship details</h3>
            <div className="action-row">
              <button className="btn btn-secondary btn-sm" onClick={handleReset} disabled={!dirty || busy}>
                Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty || busy}>
                {busy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>

          {error ? <div className="inline-error">{error}</div> : null}

          <div className="profile-grid">
            <EditableField label="Client name" value={draft.primaryHolderName} onChange={(value) => setDraft((current) => ({ ...current, primaryHolderName: value }))} />
            <EditableField label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
            <EditableField label="Mobile" value={draft.mobile} onChange={(value) => setDraft((current) => ({ ...current, mobile: value }))} />
            <EditableField label="City" value={draft.city} onChange={(value) => setDraft((current) => ({ ...current, city: value }))} />
            <EditableField label="Family name" value={draft.familyName} onChange={(value) => setDraft((current) => ({ ...current, familyName: value }))} />
            <label className="field">
              <span>Relationship status</span>
              <select value={draft.relationshipStatus} onChange={(event) => setDraft((current) => ({ ...current, relationshipStatus: event.target.value }))}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>

          <EditableTextArea
            label="Relationship notes"
            value={draft.notes}
            onChange={(value) => setDraft((current) => ({ ...current, notes: value }))}
            rows={4}
          />
          <EditableTextArea
            label="Next action"
            value={draft.nextAction}
            onChange={(value) => setDraft((current) => ({ ...current, nextAction: value }))}
            rows={3}
          />
        </section>

        <section className="workspace-card">
          <div className="section-kicker">Follow-up desk</div>
          <h3>Tasks and reminders</h3>
          <TaskComposer clientId={clientId} onCreate={onCreateTask} />
          <TaskList
            emptyText="Create the first follow-up so the relationship has a concrete next action."
            onDelete={onDeleteTask}
            onToggleStatus={onToggleTaskStatus}
            tasks={clientTasks}
          />
        </section>
      </div>

      <section className="workspace-card">
        <div className="section-kicker">Meeting timeline</div>
        <h3>Conversation history</h3>
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
                      Follow-up: {log.followUpSummary}
                      {log.followUpDate ? ` / ${formatDateOnly(log.followUpDate)}` : ""}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty-state">
            <h4>No meeting history yet</h4>
            <p>This client will grow into a proper relationship record once meetings are logged.</p>
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
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditableTextArea({ label, value, rows, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
    </label>
  );
}
