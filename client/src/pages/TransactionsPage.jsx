import React from "react";

export default function TransactionsPage() {
  return (
    <div className="page-stack">
      <section className="workspace-card page-hero">
        <div>
          <div className="section-kicker">Transactions</div>
          <h3>Transaction rail</h3>
        </div>
      </section>

      <section className="two-column-grid">
        <article className="surface-card">
          <h4>Planned features</h4>
          <div className="insight-stack">
            <div>
              <strong>Purchase & SIP desk</strong>
              <p>Draft, validate, and track investor orders with maker-checker visibility.</p>
            </div>
            <div>
              <strong>Mandate lifecycle</strong>
              <p>OTM and eMandate states, approvals, and retry queues.</p>
            </div>
            <div>
              <strong>Exception management</strong>
              <p>Rejected transactions, KYC gaps, and NACH errors in one queue.</p>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <h4>Current limitations</h4>
          <div className="roadmap-grid single-column-grid">
            <div>
              <strong>No live order execution</strong>
              <p>Requires BSE StAR MF, MFU, or an approved rail + credentials.</p>
            </div>
            <div>
              <strong>No holdings feed</strong>
              <p>Needs CAMS, KFintech, or RTA data sync.</p>
            </div>
            <div>
              <strong>No workflow controls</strong>
              <p>Approval rules and audit logs still to be built.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
