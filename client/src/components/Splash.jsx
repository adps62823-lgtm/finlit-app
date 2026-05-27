import React from "react";

export default function Splash({ message = "Loading Finlit…" }) {
  return (
    <main className="splash-root" role="status" aria-live="polite">
      <div className="splash-card">
        <div className="splash-logo">Finlit Command</div>
        <div className="splash-message">{message}</div>
        <div className="splash-spinner" aria-hidden="true"></div>
      </div>
    </main>
  );
}
