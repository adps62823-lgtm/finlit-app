import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { normalizeLoginToEmail } from "../utils/auth";

export default function AuthCard({ onLogin }) {
  const [loginId, setLoginId]   = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const email       = normalizeLoginToEmail(loginId);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const token       = await credentials.user.getIdToken();
      localStorage.setItem("authToken", token);
      await onLogin(token);
    } catch (err) {
      setError(err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
        ? "Incorrect username or password."
        : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout-simple">
      <section className="auth-panel-simple">

        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" className="auth-logo" aria-hidden="true" />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Finlit Financial Services</span>
        </div>

        <div className="auth-heading">
          <div className="eyebrow">Command centre</div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your team username or email address.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <span>Username or email</span>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              type="text"
              placeholder="e.g. dsingh or dsingh@finlit.local"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button disabled={busy} type="submit" style={{ marginTop: 4 }}>
            {busy ? "Signing in…" : "Continue →"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
          Contact your admin to create or reset your account.
        </p>
      </section>
    </main>
  );
}