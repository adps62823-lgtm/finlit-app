import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import TaskComposer from "../components/TaskComposer";
import TaskList from "../components/TaskList";
import { formatDate, formatDateOnly } from "../utils/format";

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

  if (!clientId) {
    return <Navigate replace to="/app/clients" />;
  }

  if (!client) {
    return (
      <div className="page-stack">
        <section className="surface-card empty-state">
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

  async function handleFieldSave(field, value) {
    await onUpdateClient(clientId, { [field]: value });
  }

  return (
    <div className="page-stack">
      <section className="surface-card client-detail-hero">
        <div className="panel-kicker">Relationship workspace</div>
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
        <section className="surface-card">
          <div className="panel-kicker">Profile</div>
          <h3>Relationship details</h3>
          <div className="profile-grid">
            <EditableField label="Client name" onSave={(value) => handleFieldSave("primaryHolderName", value)} value={client.primaryHolderName || ""} />
            <EditableField label="Email" onSave={(value) => handleFieldSave("email", value)} value={client.email || ""} />
            <EditableField label="Mobile" onSave={(value) => handleFieldSave("mobile", value)} value={client.mobile || ""} />
            <EditableField label="City" onSave={(value) => handleFieldSave("city", value)} value={client.city || ""} />
            <EditableField label="Family name" onSave={(value) => handleFieldSave("familyName", value)} value={client.familyName || ""} />
            <EditableField
              label="Relationship status"
              onSave={(value) => handleFieldSave("relationshipStatus", value)}
              value={client.relationshipStatus || "active"}
            />
          </div>
          <EditableTextArea
            label="Relationship notes"
            onSave={(value) => handleFieldSave("notes", value)}
            rows={4}
            value={client.notes || ""}
          />
          <EditableTextArea
            label="Next action"
            onSave={(value) => handleFieldSave("nextAction", value)}
            rows={3}
            value={client.nextAction || ""}
          />
        </section>

        <section className="surface-card">
          <div className="panel-kicker">Follow-up desk</div>
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

      <section className="surface-card">
        <div className="panel-kicker">Meeting timeline</div>
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

function EditableField({ label, value, onSave }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input defaultValue={value} onBlur={(event) => onSave(event.target.value)} />
    </label>
  );
}

function EditableTextArea({ label, value, rows, onSave }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea defaultValue={value} onBlur={(event) => onSave(event.target.value)} rows={rows} />
    </label>
  );
}
