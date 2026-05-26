import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { normalizeLoginToEmail } from "../utils/auth";

export default function AuthCard({ onLogin }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const email = normalizeLoginToEmail(loginId);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const token = await credentials.user.getIdToken();
      localStorage.setItem("authToken", token);
      await onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout auth-layout-simple">
      <section className="auth-panel auth-panel-simple">
        <div className="auth-logo-mark">
          <ShieldCheck size={24} />
        </div>
        <div className="auth-heading">
          <div className="eyebrow">Finlit</div>
          <h2>Sign in</h2>
          <p className="muted">Use your team username or email.</p>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username or email</span>
            <input
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              type="text"
              placeholder="dsingh"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter password"
              required
            />
          </label>
          <button disabled={busy} type="submit">
            {busy ? "Signing in..." : "Continue"}
          </button>
        </form>
        <p className="error">{error}</p>
      </section>
    </main>
  );
}
