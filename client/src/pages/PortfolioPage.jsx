import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, Upload, Wallet, PieChart, Landmark, ShieldCheck, Users, Database } from "lucide-react";
import { apiRequest } from "../services/api";
import { formatDateOnly } from "../utils/format";

function money(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default function PortfolioPage({ clients = [] }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?._id || "");
  const [overview, setOverview] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [navStatus, setNavStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [navSyncing, setNavSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [casFile, setCasFile] = useState(null);
  const [casPassword, setCasPassword] = useState("");
  const [casImporting, setCasImporting] = useState(false);
  const [casResult, setCasResult] = useState(null);
  const [casError, setCasError] = useState("");
  const fileInputRef = useRef(null);

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
      const [aumData, portfolioData, navData] = await Promise.all([
        apiRequest(selectedClientId ? `/aum?clientId=${selectedClientId}` : "/aum"),
        selectedClientId ? apiRequest(`/clients/${selectedClientId}/portfolio`) : Promise.resolve(null),
        apiRequest("/nav/status"),
      ]);
      setOverview(aumData);
      setPortfolio(portfolioData);
      setNavStatus(navData);
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

  async function handleNavSync() {
    setNavSyncing(true);
    setError("");
    try {
      await apiRequest("/nav/sync", null, { method: "POST" });
      await loadData();
    } catch (err) {
      setError(err.message || "NAV sync failed.");
    } finally {
      setNavSyncing(false);
    }
  }

  async function handleAumSync(scope = "business") {
    setSyncing(true);
    setError("");
    try {
      await apiRequest(
        selectedClientId && scope === "client"
          ? `/aum/sync?clientId=${selectedClientId}`
          : "/aum/sync",
        null,
        { method: "POST" }
      );
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to sync portfolio data.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCasImport(event) {
    event.preventDefault();
    if (!casFile) return;
    setCasImporting(true);
    setCasError("");
    setCasResult(null);
    try {
      const formData = new FormData();
      formData.append("file", casFile);
      formData.append("password", casPassword.trim().toUpperCase());

      const { auth } = await import("../firebase");
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"}/cas/import`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Import failed.");
      }
      setCasResult(data);
      setCasFile(null);
      setCasPassword("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData();
    } catch (err) {
      setCasError(err.message || "CAS import failed.");
    } finally {
      setCasImporting(false);
    }
  }

  const business = overview?.business || {};
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
          <p>Import CAS statements, sync NAV, and view live holdings.</p>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary btn-sm" type="button" onClick={handleNavSync} disabled={navSyncing}>
            <Database size={13} /> {navSyncing ? "Syncing NAV..." : "Sync NAV"}
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleAumSync("client")} disabled={!selectedClientId || syncing}>
            <RefreshCcw size={13} /> Client AUM
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => handleAumSync("business")} disabled={syncing}>
            <RefreshCcw size={13} /> Business AUM
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
          <span>NAV data</span>
          <strong>{navStatus?.totalSchemes ? navStatus.totalSchemes.toLocaleString("en-IN") : "—"}</strong>
          <p>{navStatus?.lastNavDate ? formatDateOnly(navStatus.lastNavDate) : "Not synced yet"}</p>
        </div>
      </div>

      {/* CAS Import section */}
      <section className="workspace-card">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">Import</div>
            <h3>CAS statement</h3>
          </div>
          <span className="mono-chip"><Upload size={12} /> CAMS / KFintech</span>
        </div>

        <p style={{ marginBottom: 16 }}>
          Upload a Consolidated Account Statement PDF. The password is always the investor's PAN in uppercase (e.g. ABCDE1234F). Download CAS from CAMSOnline or KFintech distributor portal.
        </p>

        <form className="stack" onSubmit={handleCasImport}>
          <div className="form-split-grid">
            <div className="field">
              <span>CAS PDF file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setCasFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="field">
              <span>PAN password</span>
              <input
                type="text"
                value={casPassword}
                onChange={(e) => setCasPassword(e.target.value)}
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                required
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
              />
            </div>
          </div>

          {casError ? <div className="inline-error">{casError}</div> : null}

          {casResult ? (
            <div className="inline-error" style={{ borderColor: "rgba(21,128,61,.2)", background: "var(--green-soft)", color: "var(--green)" }}>
              {casResult.message}
            </div>
          ) : null}

          <div className="form-actions">
            <span className="form-note">
              {casFile ? casFile.name : "No file selected"}
            </span>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={casImporting || !casFile || !casPassword}
            >
              {casImporting ? <><RefreshCcw size={13} className="spin" /> Importing...</> : <><Upload size={13} /> Import CAS</>}
            </button>
          </div>
        </form>
      </section>

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
                  <strong>{money(portfolio?.summary?.totalAum)}</strong>
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

              <div className="section-heading-row" style={{ marginTop: 16 }}>
                <h3>{selectedClient.primaryHolderName}</h3>
                <span className="mono-chip">{selectedClient.city || "No city"}</span>
              </div>

              <div className="section-heading-row" style={{ marginTop: 16 }}>
                <h3>Holdings</h3>
                <span className="mono-chip"><Wallet size={12} /> {money(portfolio?.summary?.totalAum || 0)}</span>
              </div>

              <div className="task-list">
                {loading ? (
                  <div className="empty-state compact-empty-state"><h4>Loading</h4></div>
                ) : holdings.length ? holdings.map((holding) => (
                  <article className="task-card" key={`${holding.folioId}-${holding.schemeCode}`}>
                    <div className="task-card-top">
                      <div className="task-card-copy">
                        <div className="task-card-title-row">
                          <strong>{holding.schemeName}</strong>
                          <span className="pill muted">{holding.assetClass || "fund"}</span>
                          {holding.valuationSource === "amfi_nav" ? (
                            <span className="pill muted" style={{ background: "var(--green-soft)", color: "var(--green)" }}>Live NAV</span>
                          ) : null}
                        </div>
                        <p className="task-client-name">{holding.isin || holding.schemeCode}</p>
                      </div>
                      <span className="status-neutral">₹{money(holding.marketValue)}</span>
                    </div>
                    <div className="task-card-footer">
                      <span>{holding.units} units @ ₹{holding.nav}</span>
                      <span>Cost ₹{money(holding.costValue)} · Gain ₹{money(holding.unrealizedGain)}</span>
                    </div>
                  </article>
                )) : (
                  <div className="empty-state compact-empty-state">
                    <h4>No holdings</h4>
                    <p>Upload a CAS PDF above to import holdings.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h4>Select a client</h4>
              <p>Or upload a CAS PDF above — it will auto-link to the matching client by PAN.</p>
            </div>
          )}
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Snapshots</div>
              <h3>Recent imports</h3>
            </div>
            <span className="mono-chip"><PieChart size={12} /> {overview?.clients?.length || 0}</span>
          </div>

          <div className="insight-stack">
            <div>
              <strong><Landmark size={13} /> Business AUM</strong>
              <p>₹{money(business.totalAum)}</p>
            </div>
            <div>
              <strong><Users size={13} /> Clients tracked</strong>
              <p>{overview?.clients?.length || 0} with portfolio data</p>
            </div>
            <div>
              <strong><Database size={13} /> NAV database</strong>
              <p>{navStatus?.totalSchemes ? `${navStatus.totalSchemes.toLocaleString("en-IN")} schemes` : "Not synced yet"}</p>
            </div>
          </div>

          <div className="section-heading-row" style={{ marginTop: 16 }}>
            <h3>Per-client AUM</h3>
          </div>

          <div className="quiet-client-stack">
            {overview?.clients?.length ? overview.clients.slice(0, 8).map((snapshot) => (
              <div className="quiet-client-card" key={`${snapshot.scopeId}-${snapshot.asOfDate}`}>
                <strong>{snapshot.scopeLabel}</strong>
                <p>₹{money(snapshot.totalAum)} · {snapshot.folioCount} folios · {snapshot.schemeCount} schemes</p>
                <span>{formatDateOnly(snapshot.asOfDate)}</span>
              </div>
            )) : (
              <div className="empty-state compact-empty-state">
                <h4>No data yet</h4>
                <p>Import a CAS PDF to see per-client AUM.</p>
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
          <span className="mono-chip">{selectedClient?.primaryHolderName || "No client selected"}</span>
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
              )) : <p>No folios. Upload a CAS PDF to import.</p>}
            </div>
          </article>

          <article className="surface-card">
            <h4>SIPs</h4>
            <div className="insight-stack">
              {sips.length ? sips.map((sip) => (
                <div key={sip._id}>
                  <strong>{sip.schemeName}</strong>
                  <p>₹{money(sip.sipAmount)} · {sip.status}</p>
                </div>
              )) : <p>No SIPs imported yet.</p>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
