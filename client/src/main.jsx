import React, { Component, StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Finlit app failed to render", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="auth-layout">
          <section className="auth-panel">
            <div className="eyebrow">Render error</div>
            <h2>Finlit could not load</h2>
            <p className="muted">
              The frontend hit a runtime error before it could show the login screen.
            </p>
            <p className="error">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);

// Remove the static initial splash (if present) after React has mounted
function removeInitialSplash() {
  const el = document.getElementById("initial-splash");
  if (!el) return;
  el.classList.add("fade-out");
  setTimeout(() => el.remove(), 400);
}

// Allow the first paint to occur then remove splash
requestAnimationFrame(() => requestAnimationFrame(removeInitialSplash));
