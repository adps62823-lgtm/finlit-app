import React from "react";

export default function TransactionsPage() {
  return (
    <div className="page-stack">
      <section className="surface-card surface-card-hero">
        <div className="panel-kicker">Orders</div>
        <h3>Transactions</h3>
      </section>

      <section className="two-column-grid">
        <article className="surface-card">
          <h4>Future control tower</h4>
          <div className="insight-stack">
            <div>
              <strong>Purchase and SIP desk</strong>
              <p>Draft, validate, submit, and track investor orders with maker-checker visibility.</p>
            </div>
            <div>
              <strong>Mandate lifecycle</strong>
              <p>Monitor OTM and eMandate states, approvals, bank failures, and retry queues.</p>
            </div>
            <div>
              <strong>Exception management</strong>
              <p>Keep rejected transactions, missing KYC, NACH errors, and stale forms in one queue.</p>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <h4>Current limitations</h4>
          <div className="roadmap-grid single-column-grid">
            <div>
              <strong>No live order execution</strong>
              <p>Real transactions require BSE StAR MF, MFU, or another approved rail plus credentials.</p>
            </div>
            <div>
              <strong>No holdings feed yet</strong>
              <p>Transaction history and post-trade truth need registrar, CAMS, KFintech, or RTA-backed data sync.</p>
            </div>
            <div>
              <strong>No workflow controls yet</strong>
              <p>Transaction approval rules, audit logs, and compliance checkpoints still need to be built.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
