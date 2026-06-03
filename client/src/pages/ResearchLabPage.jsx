import React, { useState } from "react";

export default function ResearchLabPage() {
  const [sip, setSip] = useState({ monthly: 15000, rate: 12, years: 15 });
  const [loan, setLoan] = useState({ principal: 2500000, rate: 9.5, years: 12 });

  const monthlyRate = sip.rate / 12 / 100;
  const months = sip.years * 12;
  const sipCorpus =
    monthlyRate === 0
      ? sip.monthly * months
      : sip.monthly * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);

  const emiRate = loan.rate / 12 / 100;
  const emiMonths = loan.years * 12;
  const emi =
    emiRate === 0
      ? loan.principal / emiMonths
      : (loan.principal * emiRate * (1 + emiRate) ** emiMonths) / ((1 + emiRate) ** emiMonths - 1);

  return (
    <div className="page-stack">
      <section className="two-column-grid">
        <article className="surface-card">
          <div className="panel-kicker">SIP projection</div>
          <div className="tool-form-pro">
            <label className="field">
              <span>Monthly SIP</span>
              <input onChange={(e) => setSip((c) => ({ ...c, monthly: Number(e.target.value) }))} type="number" value={sip.monthly} />
              <input className="tool-slider" type="range" min="1000" max="100000" step="500" value={sip.monthly} onChange={(e) => setSip((c) => ({ ...c, monthly: Number(e.target.value) }))} />
            </label>
            <label className="field">
              <span>Return %</span>
              <input onChange={(e) => setSip((c) => ({ ...c, rate: Number(e.target.value) }))} type="number" value={sip.rate} />
              <input className="tool-slider" type="range" min="1" max="30" step="0.1" value={sip.rate} onChange={(e) => setSip((c) => ({ ...c, rate: Number(e.target.value) }))} />
            </label>
            <label className="field">
              <span>Years</span>
              <input onChange={(e) => setSip((c) => ({ ...c, years: Number(e.target.value) }))} type="number" value={sip.years} />
              <input className="tool-slider" type="range" min="1" max="40" step="1" value={sip.years} onChange={(e) => setSip((c) => ({ ...c, years: Number(e.target.value) }))} />
            </label>
          </div>
          <div className="result-card">Corpus: ₹{Math.round(sipCorpus).toLocaleString("en-IN")}</div>
        </article>

        <article className="surface-card">
          <div className="panel-kicker">EMI calculator</div>
          <div className="tool-form-pro">
            <label className="field">
              <span>Loan amount</span>
              <input onChange={(e) => setLoan((c) => ({ ...c, principal: Number(e.target.value) }))} type="number" value={loan.principal} />
              <input className="tool-slider" type="range" min="100000" max="20000000" step="50000" value={loan.principal} onChange={(e) => setLoan((c) => ({ ...c, principal: Number(e.target.value) }))} />
            </label>
            <label className="field">
              <span>Interest %</span>
              <input onChange={(e) => setLoan((c) => ({ ...c, rate: Number(e.target.value) }))} type="number" value={loan.rate} />
              <input className="tool-slider" type="range" min="1" max="20" step="0.1" value={loan.rate} onChange={(e) => setLoan((c) => ({ ...c, rate: Number(e.target.value) }))} />
            </label>
            <label className="field">
              <span>Years</span>
              <input onChange={(e) => setLoan((c) => ({ ...c, years: Number(e.target.value) }))} type="number" value={loan.years} />
              <input className="tool-slider" type="range" min="1" max="40" step="1" value={loan.years} onChange={(e) => setLoan((c) => ({ ...c, years: Number(e.target.value) }))} />
            </label>
          </div>
          <div className="result-card">EMI: ₹{Math.round(emi).toLocaleString("en-IN")} / month</div>
        </article>
      </section>
    </div>
  );
}
