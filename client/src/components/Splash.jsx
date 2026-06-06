import React from "react";

export default function Splash({ message = "Loading..." }) {
  return (
    <div
      className="splash-root"
      role="status"
      aria-live="polite"
      aria-label="Loading application"
    >
      <div className="splash-card">
        <div className="splash-wordmark">
          Fin<span>lit</span>
        </div>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{message}</p>
      </div>
    </div>
  );
}
