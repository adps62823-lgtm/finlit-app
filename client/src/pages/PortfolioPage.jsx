import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Wallet, PieChart, Landmark, ShieldCheck, Users } from "lucide-react";
import { apiRequest } from "../services/api";
import { formatDateOnly } from "../utils/format";

function money(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default function PortfolioPage({ clients = [] }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?._id || "");
  const [overview, setOverview] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (!selectedClientId && clients[0]?._id) {
      setSelectedClientId(clients[0]._id);
    }
  }, [clients, selectedClientId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [aumData, portfolioData] = await Promise.all([
        apiRequest(selectedClientId ? `/aum?clientId=${selectedClientId}` : "/aum"),
        selectedClientId ? apiRequest(`/clients/${selectedClientId}/portfolio`) : Promise.resolve(null),
      ]);
      setOverview(aumData);
      setPortfolio(portfolioData);
    } catch (err) {
      setError(err.message || "Unable to load portfolio data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  async function handleSync(scope = "business") {
    setSyncing(true);
    setError("");
    try {
      const syncData = await apiRequest(selectedClientId && scope === "client" ? `/aum/sync?clientId=${selectedClientId}` : "/aum/sync", null, {
        method: "POST",
      });
      setOverview((current) => ({
        ...(current || {}),
        business: syncData.business,
      }));
      if (syncData.clients?.length && selectedClientId) {
        const syncedClient = syncData.clients[0];
        setPortfolio((current) => ({
          ...(current || {}),
          summary: current?.summary || {},
          client: current?.client || selectedClient,
          syncedSnapshot: syncedClient,
        }));
      }
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to sync portfolio data.");
    } finally {
      setSyncing(false);
    }
  }

  const business = overview?.business || {};
  const clientSnapshot = overview?.client || null;
  const holdings = portfolio?.holdings || [];
  const folios = portfolio?.folios || [];
  const sips = portfolio?.sips || [];
  const mandates = portfolio?.mandates || [];

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero">
        <div>
          <div className="section-kicker">Portfolio</div>
          <h3>AUM desk</h3>
          <p>See holdings, SIPs, and mandates next to the latest AUM snapshot.</p>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleSync("client")} disabled={!selectedClientId || syncing}>
            <RefreshCcw size={13} /> Client sync
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => handleSync("business")} disabled={syncing}>
            <RefreshCcw size={13} /> Business sync
          </button>
        </div>
      </section>

      {error ? <div className="inline-error">{error}</div> : null}

      <div className="hero-panel-metrics">
        <div className="metric-card tone-teal">
          <span>Business AUM</span>
          <strong>{money(business.totalAum)}</strong>
          <p>{business.clientCount || clients.length} clients</p>
        </div>
        <div className="metric-card tone-slate">
          <span>Active SIPs</span>
          <strong>{money(business.activeSipAmount)}</strong>
          <p>{business.schemeCount || 0} schemes</p>
        </div>
        <div className="metric-card tone-amber">
          <span>Folios</span>
          <strong>{business.folioCount || 0}</strong>
          <p>{business.scopeLabel || "Business"}</p>
        </div>
        <div className="metric-card tone-rose">
          <span>Snapshot</span>
          <strong>{business.asOfDate ? formatDateOnly(business.asOfDate) : "—"}</strong>
          <p>{syncing ? "Syncing" : "Ready"}</p>
        </div>
      </div>

      <div className="two-column-grid-wide">
        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Client</div>
              <h3>Portfolio view</h3>
            </div>
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.primaryHolderName}</option>
              ))}
            </select>
          </div>

          {selectedClient ? (
            <>
              <div className="client-summary-grid">
                <div className="summary-stat-card">
                  <span>AUM</span>
                  <strong>{money(portfolio?.summary?.totalAum || clientSnapshot?.totalAum)}</strong>
                </div>
                <div className="summary-stat-card">
                  <span>Holdings</span>
                  <strong>{portfolio?.summary?.schemeCount || 0}</strong>
                </div>
                <div className="summary-stat-card">
                  <span>Folios</span>
                  <strong>{portfolio?.summary?.folioCount || 0}</strong>
                </div>
                <div className="summary-stat-card">
                  <span>SIPs</span>
                  <strong>{portfolio?.summary?.activeSipCount || 0}</strong>
                </div>
              </div>

              <div className="section-heading-row">
                <h3>{selectedClient.primaryHolderName}</h3>
                <span className="mono-chip">{selectedClient.city || "No city"}</span>
              </div>

              <div className="insight-stack">
                <div>
                  <strong>Holdings</strong>
                  <p>{holdings.length ? `${holdings.length} live positions` : "No holdings synced yet."}</p>
                </div>
                <div>
                  <strong>SIPs</strong>
                  <p>{sips.length ? `${sips.length} registrations` : "No SIPs synced yet."}</p>
                </div>
                <div>
                  <strong>Mandates</strong>
                  <p>{mandates.length ? `${mandates.length} mandates` : "No mandates synced yet."}</p>
                </div>
              </div>

              <div className="section-heading-row" style={{ marginTop: 16 }}>
                <h3>Holdings</h3>
                <span className="mono-chip"><Wallet size={12} /> {money(portfolio?.summary?.totalAum || 0)}</span>
              </div>
              <div className="task-list">
                {loading ? (
                  <div className="empty-state compact-empty-state"><h4>Loading</h4></div>
                ) : holdings.length ? holdings.slice(0, 6).map((holding) => (
                  <article className="task-card" key={`${holding.folioId}-${holding.schemeCode}`}>
                    <div className="task-card-top">
                      <div className="task-card-copy">
                        <div className="task-card-title-row">
                          <strong>{holding.schemeName}</strong>
                          <span className="pill muted">{holding.assetClass || "fund"}</span>
                        </div>
                        <p className="task-client-name">{holding.folioId}</p>
                      </div>
                      <span className="status-neutral">{money(holding.marketValue)}</span>
                    </div>
                    <div className="task-card-footer">
                      <span>{holding.units} units</span>
                      <span>XIRR {holding.xirr || 0}%</span>
                    </div>
                  </article>
                )) : (
                  <div className="empty-state compact-empty-state">
                    <h4>No holdings</h4>
                    <p>Run a sync to bring portfolio truth in.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h4>Select a client</h4>
              <p>See holdings, SIPs, mandates, and AUM in one place.</p>
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Sync</div>
              <h3>Snapshots</h3>
            </div>
            <span className="mono-chip"><PieChart size={12} /> {overview?.clients?.length || 0}</span>
          </div>

          <div className="insight-stack">
            <div>
              <strong><Landmark size={13} /> Business</strong>
              <p>{money(business.totalAum)} AUM</p>
            </div>
            <div>
              <strong><Users size={13} /> Clients</strong>
              <p>{overview?.clients?.length || clients.length} snapshots</p>
            </div>
            <div>
              <strong><ShieldCheck size={13} /> Mandates</strong>
              <p>{mandates.length} linked</p>
            </div>
          </div>

          <div className="section-heading-row" style={{ marginTop: 16 }}>
            <h3>Recent client snapshots</h3>
          </div>

          <div className="quiet-client-stack">
            {overview?.clients?.length ? overview.clients.slice(0, 6).map((snapshot) => (
              <div className="quiet-client-card" key={`${snapshot.scopeId}-${snapshot.asOfDate}`}>
                <strong>{snapshot.scopeLabel}</strong>
                <p>{money(snapshot.totalAum)} AUM · {snapshot.folioCount} folios</p>
                <span>{formatDateOnly(snapshot.asOfDate)}</span>
              </div>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No snapshots</h4>
                <p>Sync business data to create them.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="workspace-card">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">Client</div>
            <h3>Folios, SIPs, mandates</h3>
          </div>
          <span className="mono-chip">{selectedClient?.primaryHolderName || "No client"}</span>
        </div>

        <div className="two-column-grid">
          <article className="surface-card">
            <h4>Folios</h4>
            <div className="insight-stack">
              {folios.length ? folios.map((folio) => (
                <div key={folio._id}>
                  <strong>{folio.folioNumber}</strong>
                  <p>{folio.amcName} · {folio.rta}</p>
                </div>
              )) : <p>No folios synced.</p>}
            </div>
          </article>

          <article className="surface-card">
            <h4>SIPs</h4>
            <div className="insight-stack">
              {sips.length ? sips.map((sip) => (
                <div key={sip._id}>
                  <strong>{sip.schemeName}</strong>
                  <p>{money(sip.sipAmount)} · {sip.status}</p>
                </div>
              )) : <p>No SIPs synced.</p>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
