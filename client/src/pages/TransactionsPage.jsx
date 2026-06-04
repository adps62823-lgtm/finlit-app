import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CircleCheckBig, CirclePlus, RefreshCcw, ShieldCheck, WalletCards } from "lucide-react";
import { apiRequest } from "../services/api";
import { formatDate } from "../utils/format";

const ORDER_TYPES = [
  { value: "purchase", label: "Purchase" },
  { value: "redemption", label: "Redemption" },
  { value: "sip", label: "SIP" },
  { value: "switch", label: "Switch" },
  { value: "stp", label: "STP" },
  { value: "swp", label: "SWP" },
];

const INITIAL_DRAFT = {
  clientId: "",
  folioId: "",
  schemeCode: "",
  orderIntentType: "purchase",
  amount: "",
  units: "",
  remarks: "",
};

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
}

export default function TransactionsPage({ clients = [], user }) {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [orders, setOrders] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [bseStatus, setBseStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const selectedClient = useMemo(() => clients.find((client) => client._id === draft.clientId), [clients, draft.clientId]);
  const selectedFolio = useMemo(
    () => portfolio?.folios?.find((folio) => folio._id === draft.folioId),
    [draft.folioId, portfolio]
  );

  async function loadOrders() {
    const [orderRows, status] = await Promise.all([
      apiRequest(`/orders?limit=100${activeTab !== "all" ? `&status=${activeTab}` : ""}`),
      apiRequest("/integrations/bse-starmf/status"),
    ]);
    setOrders(orderRows);
    setBseStatus(status);
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        await loadOrders();
      } catch (err) {
        setError(err.message || "Unable to load transaction workspace.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [activeTab]);

  useEffect(() => {
    const loadPortfolio = async () => {
      if (!draft.clientId) {
        setPortfolio(null);
        return;
      }
      setError("");
      try {
        const data = await apiRequest(`/clients/${draft.clientId}/portfolio`);
        setPortfolio(data);
        setDraft((current) => ({
          ...current,
          folioId: data.folios?.some((folio) => folio._id === current.folioId) ? current.folioId : data.folios?.[0]?._id || "",
          schemeCode: data.holdings?.some((holding) => holding.schemeCode === current.schemeCode)
            ? current.schemeCode
            : data.holdings?.[0]?.schemeCode || "",
        }));
      } catch (err) {
        setPortfolio(null);
        setError(err.message || "Unable to load client portfolio.");
      }
    };
    loadPortfolio();
  }, [draft.clientId]);

  const stats = useMemo(() => ({
    draft: orders.filter((order) => order.status === "draft").length,
    queued: orders.filter((order) => order.status !== "draft").length,
    purchase: orders.filter((order) => order.orderIntentType === "purchase").length,
    sip: orders.filter((order) => order.orderIntentType === "sip").length,
  }), [orders]);

  function setField(key) {
    return (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  }

  async function handleCreateDraft(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...draft,
        amount: Number(draft.amount || 0),
        units: draft.units ? Number(draft.units) : undefined,
      };
      const created = await apiRequest("/orders/draft", null, { method: "POST", body: JSON.stringify(payload) });
      setOrders((current) => [created, ...current]);
      setDraftNote("Draft saved.");
      setDraft((current) => ({
        ...INITIAL_DRAFT,
        clientId: current.clientId,
        folioId: current.folioId,
      }));
      if (portfolio?.holdings?.[0]?.schemeCode) {
        setDraft((current) => ({ ...current, schemeCode: portfolio.holdings[0].schemeCode }));
      }
    } catch (err) {
      setError(err.message || "Unable to create draft.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOrder(orderId, patch) {
    setBusyId(orderId);
    setError("");
    try {
      const updated = await apiRequest(`/orders/${orderId}`, null, { method: "PATCH", body: JSON.stringify(patch) });
      setOrders((current) => current.map((order) => (order._id === orderId ? updated : order)));
    } catch (err) {
      setError(err.message || "Unable to update order.");
    } finally {
      setBusyId("");
    }
  }

  const visibleOrders = useMemo(() => orders.filter((order) => (activeTab === "all" ? true : order.status === activeTab)), [orders, activeTab]);

  return (
    <div className="page-stack">
      <section className="workspace-card page-hero surface-card-hero">
        <div>
          <div className="section-kicker">Transactions</div>
          <h3>Order desk</h3>
          <p>Draft client orders, queue them for the BSE bridge, and keep a clean audit trail.</p>
        </div>
        <div className="action-row">
          <span className="mono-chip"><CirclePlus size={12} /> {stats.draft}</span>
          <span className="mono-chip"><ShieldCheck size={12} /> {stats.queued}</span>
        </div>
      </section>

      <div className="two-column-grid-wide">
        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Rail</div>
              <h3>Draft order</h3>
            </div>
            <span className="mono-chip">BSE</span>
          </div>

          {error ? <div className="inline-error">{error}</div> : null}
          {draftNote ? <div className="inline-error" style={{ borderColor: "rgba(21,128,61,.2)", background: "var(--green-soft)", color: "var(--green)" }}>{draftNote}</div> : null}

          <form className="stack" onSubmit={handleCreateDraft}>
            <div className="task-assignment-grid">
              <label className="field">
                <span>Client</span>
                <select value={draft.clientId} onChange={setField("clientId")} required>
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>{client.primaryHolderName}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Folio</span>
                <select value={draft.folioId} onChange={setField("folioId")} required disabled={!portfolio?.folios?.length}>
                  <option value="">{portfolio?.folios?.length ? "Select folio" : "Load client first"}</option>
                  {portfolio?.folios?.map((folio) => (
                    <option key={folio._id} value={folio._id}>{folio.folioNumber} · {folio.amcName}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Type</span>
                <select value={draft.orderIntentType} onChange={setField("orderIntentType")}>
                  {ORDER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Scheme</span>
                <input value={draft.schemeCode} onChange={setField("schemeCode")} placeholder="Scheme code" required />
              </label>

              <label className="field">
                <span>Amount</span>
                <input type="number" min="0" step="0.01" value={draft.amount} onChange={setField("amount")} placeholder="0.00" />
              </label>

              <label className="field">
                <span>Units</span>
                <input type="number" min="0" step="0.0001" value={draft.units} onChange={setField("units")} placeholder="Optional" />
              </label>
            </div>

            <label className="field">
              <span>Remarks</span>
              <textarea rows={3} value={draft.remarks} onChange={setField("remarks")} placeholder="Bridge notes, investor instruction, or risk note" />
            </label>

            <div className="section-heading-row">
              <div className="action-row">
                <span className="mono-chip"><WalletCards size={12} /> {selectedClient ? selectedClient.primaryHolderName : "No client"}</span>
                <span className="mono-chip">{selectedFolio ? selectedFolio.folioNumber : "No folio"}</span>
              </div>
              <button className="btn btn-primary btn-sm" disabled={saving || !draft.clientId || !draft.folioId || !draft.schemeCode} type="submit" aria-label="Save draft order">
                {saving ? <RefreshCcw size={14} className="spin" /> : <CirclePlus size={14} />}
              </button>
            </div>
          </form>
        </section>

        <section className="workspace-card">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Bridge</div>
              <h3>BSE status</h3>
            </div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={loadOrders}>
              Refresh
            </button>
          </div>

          <div className="insight-stack">
            <div>
              <strong>{bseStatus?.configured ? "Configured" : "Not configured"}</strong>
              <p>{bseStatus?.enabled ? "Rail is enabled" : "Rail is in staging only"}</p>
            </div>
            <div>
              <strong>{bseStatus?.memberCode || "No member code"}</strong>
              <p>{bseStatus?.apiBaseUrl || "Waiting for bridge config"}</p>
            </div>
            <div>
              <strong>{bseStatus?.phase || "adapter_ready"}</strong>
              <p>{bseStatus?.nextStep || "Add credentials to activate"}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="workspace-card">
        <div className="section-heading-row">
          <div>
            <div className="section-kicker">Queue</div>
            <h3>Orders</h3>
          </div>
          <div className="filter-chip-row">
            {[
              ["all", "All"],
              ["draft", "Draft"],
              ["queued_for_bridge", "Queued"],
              ["submitted", "Submitted"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-chip${activeTab === value ? " active" : ""}`}
                onClick={() => setActiveTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="task-list">
          {loading ? (
            <div className="empty-state compact-empty-state"><h4>Loading</h4></div>
          ) : visibleOrders.length ? (
            visibleOrders.map((order) => (
              <article className="task-card" key={order._id}>
                <div className="task-card-top">
                  <div className="task-card-copy">
                    <div className="task-card-title-row">
                      <strong>{order.schemeCode}</strong>
                      <span className="pill muted">{order.orderIntentType}</span>
                    </div>
                    <p className="task-client-name">{order.remarks || order.rail}</p>
                    <p className="task-client-name">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={order.status === "draft" ? "status-neutral" : "status-overdue"}>{order.status}</span>
                </div>

                <div className="task-card-footer">
                  <span>{money(order.amount)} {order.units ? `· ${order.units} units` : ""}</span>
                  <div className="action-row">
                    {order.status === "draft" ? (
                      <button
                        className="icon-btn"
                        type="button"
                        title="Queue"
                        disabled={busyId === order._id}
                        onClick={() => updateOrder(order._id, { status: "queued_for_bridge" })}
                      >
                        <CircleCheckBig size={12} />
                      </button>
                    ) : null}
                    <button
                      className="icon-btn danger"
                      type="button"
                      title="Cancel"
                      disabled={busyId === order._id}
                      onClick={() => updateOrder(order._id, { status: "cancelled" })}
                    >
                      <Ban size={12} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty-state">
              <h4>No orders</h4>
              <p>Create a draft to start the bridge workflow.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
