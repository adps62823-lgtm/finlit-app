import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { formatDateOnly } from "../utils/format";

export default function ClientBookPage({ clients, tasks, onOpenImport }) {
  const [query, setQuery] = useState("");

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [client.primaryHolderName, client.clientCode, client.city, client.email, client.mobile, client.familyName, client.notes, client.nextAction]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [clients, query]);

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero">
        <div>
          <div className="section-kicker">Clients</div>
          <h3>Book</h3>
        </div>
        <button className="btn btn-primary" onClick={onOpenImport} type="button" aria-label="Import clients">
          <Plus size={14} /> Import Clients 
        </button>
      </section>

      <section className="workspace-card">
        <div className="filter-bar single-filter-bar">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clients..."
            value={query}
          />
        </div>
      </section>

      <section className="client-grid-pro">
        {filteredClients.length ? (
          filteredClients.map((client) => {
            const clientOpenTasks = tasks.filter(
              (task) => task.clientId === client._id && task.status === "open"
            ).length;

            return (
              <Link className="client-card-pro clickable-card" key={client._id} to={`/app/clients/${client._id}`}>
                <div className="client-card-topline">
                  <div>
                    <h4>{client.primaryHolderName}</h4>
                    <p>{client.city || "—"}</p>
                  </div>
                  <span className="status-pill status-neutral">
                    {client.relationshipStatus || "active"}
                  </span>
                </div>

                <div className="client-card-meta">
                  <div>
                    <span>Meetings</span>
                    <strong>{client.meetingCount || 0}</strong>
                  </div>
                  <div>
                    <span>Tasks</span>
                    <strong>{clientOpenTasks}</strong>
                  </div>
                  <div>
                    <span>Last met</span>
                    <strong>{client.lastMeetingAt ? formatDateOnly(client.lastMeetingAt) : "—"}</strong>
                  </div>
                </div>

                {(client.nextAction || client.latestNotes) ? <p>{client.nextAction || client.latestNotes}</p> : null}
              </Link>
            );
          })
        ) : (
          <section className="workspace-card empty-card-pro">
            <h4>No clients</h4>
          </section>
        )}
      </section>
    </div>
  );
}
