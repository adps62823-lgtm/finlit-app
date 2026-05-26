import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateOnly } from "../utils/format";

export default function ClientBookPage({ clients, tasks }) {
  const [query, setQuery] = useState("");

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;

    return clients.filter((client) =>
      [
        client.primaryHolderName,
        client.clientCode,
        client.city,
        client.email,
        client.mobile,
        client.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [clients, query]);

  return (
    <div className="page-stack">
      <section className="surface-card surface-card-hero">
        <div className="panel-kicker">Clients</div>
        <h3>Client book</h3>
      </section>

      <section className="surface-card">
        <div className="filter-bar single-filter-bar">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client, code, family, city, email, or mobile"
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
                    <p>{client.city || "Location pending"}</p>
                  </div>
                  <span className="status-pill status-neutral">
                    {client.relationshipStatus || "active"}
                  </span>
                </div>

                <div className="client-card-meta">
                  <div>
                    <span>Meeting count</span>
                    <strong>{client.meetingCount || 0}</strong>
                  </div>
                  <div>
                    <span>Open follow-ups</span>
                    <strong>{clientOpenTasks}</strong>
                  </div>
                  <div>
                    <span>Last meeting</span>
                    <strong>{client.lastMeetingAt ? formatDateOnly(client.lastMeetingAt) : "Not set"}</strong>
                  </div>
                </div>

                <p>{client.nextAction || client.latestNotes || "Open the workspace to add relationship context and next actions."}</p>
              </Link>
            );
          })
        ) : (
          <section className="surface-card empty-card-pro">
            <h4>No client records yet</h4>
            <p>Meeting logs will start shaping this relationship book automatically.</p>
          </section>
        )}
      </section>
    </div>
  );
}
