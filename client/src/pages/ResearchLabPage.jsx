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
          <div className="panel-kicker">Planning tools</div>
          <h3>SIP projection</h3>
          <div className="tool-form-pro">
            <label className="field">
              <span>Monthly SIP</span>
              <input
                onChange={(event) => setSip((current) => ({ ...current, monthly: Number(event.target.value) }))}
                type="number"
                value={sip.monthly}
              />
              <input
                className="tool-slider"
                type="range"
                min="1000"
                max="100000"
                step="500"
                value={sip.monthly}
                onChange={(event) => setSip((current) => ({ ...current, monthly: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>Annual return percent</span>
              <input
                onChange={(event) => setSip((current) => ({ ...current, rate: Number(event.target.value) }))}
                type="number"
                value={sip.rate}
              />
              <input
                className="tool-slider"
                type="range"
                min="1"
                max="30"
                step="0.1"
                value={sip.rate}
                onChange={(event) => setSip((current) => ({ ...current, rate: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>Years</span>
              <input
                onChange={(event) => setSip((current) => ({ ...current, years: Number(event.target.value) }))}
                type="number"
                value={sip.years}
              />
              <input
                className="tool-slider"
                type="range"
                min="1"
                max="40"
                step="1"
                value={sip.years}
                onChange={(event) => setSip((current) => ({ ...current, years: Number(event.target.value) }))}
              />
            </label>
          </div>
          <div className="result-card">Projected corpus: Rs {Math.round(sipCorpus).toLocaleString("en-IN")}</div>
        </article>

        <article className="surface-card">
          <div className="panel-kicker">Advisory utility</div>
          <h3>EMI calculator</h3>
          <div className="tool-form-pro">
            <label className="field">
              <span>Loan amount</span>
              <input
                onChange={(event) => setLoan((current) => ({ ...current, principal: Number(event.target.value) }))}
                type="number"
                value={loan.principal}
              />
              <input
                className="tool-slider"
                type="range"
                min="100000"
                max="20000000"
                step="50000"
                value={loan.principal}
                onChange={(event) => setLoan((current) => ({ ...current, principal: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>Annual interest percent</span>
              <input
                onChange={(event) => setLoan((current) => ({ ...current, rate: Number(event.target.value) }))}
                type="number"
                value={loan.rate}
              />
              <input
                className="tool-slider"
                type="range"
                min="1"
                max="20"
                step="0.1"
                value={loan.rate}
                onChange={(event) => setLoan((current) => ({ ...current, rate: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>Years</span>
              <input
                onChange={(event) => setLoan((current) => ({ ...current, years: Number(event.target.value) }))}
                type="number"
                value={loan.years}
              />
              <input
                className="tool-slider"
                type="range"
                min="1"
                max="40"
                step="1"
                value={loan.years}
                onChange={(event) => setLoan((current) => ({ ...current, years: Number(event.target.value) }))}
              />
            </label>
          </div>
          <div className="result-card">Estimated EMI: Rs {Math.round(emi).toLocaleString("en-IN")} / month</div>
        </article>
      </section>
    </div>
  );
}
