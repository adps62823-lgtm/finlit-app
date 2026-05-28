import React, { useEffect, useRef } from "react";

export default function Splash({ message = "Loading…" }) {
  const rootRef = useRef(null);

  // Safety valve: if something goes wrong, remove splash after 8s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rootRef.current) {
        rootRef.current.style.opacity = "0";
        rootRef.current.style.pointerEvents = "none";
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="splash-root" ref={rootRef} role="status" aria-live="polite" aria-label="Loading application">
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