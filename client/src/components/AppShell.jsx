import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, BookOpen, ShieldCheck, FlaskConical,
  LogOut, Menu, X, Moon, Sun, SlidersHorizontal, ChevronRight,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/app/command",      label: "Overview",     Icon: LayoutDashboard },
  { to: "/app/clients",      label: "Clients",      Icon: Users },
  { to: "/app/meetings",     label: "Meetings",     Icon: BookOpen },
  { to: "/app/transactions", label: "Orders",       Icon: ShieldCheck },
  { to: "/app/research",     label: "Tools",        Icon: FlaskConical },
];

const PAGE_TITLE = {
  "/app/command":      "Overview",
  "/app/clients":      "Clients",
  "/app/meetings":     "Meetings",
  "/app/transactions": "Orders",
  "/app/research":     "Tools",
};

export default function AppShell({ user, stats, onLogout, onToggleTheme, theme, children }) {
  const location = useLocation();
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [personalOpen,    setPersonalOpen]    = useState(false);
  const [displayName,     setDisplayName]     = useState("");
  const [avatarColor,     setAvatarColor]     = useState("#4f6ef7");

  /* Persist personalisation */
  useEffect(() => {
    const n = localStorage.getItem("finlit_displayName");
    const c = localStorage.getItem("finlit_avatarColor");
    if (n) setDisplayName(n);
    if (c) setAvatarColor(c);
  }, []);

  useEffect(() => { if (displayName) localStorage.setItem("finlit_displayName", displayName); }, [displayName]);
  useEffect(() => { if (avatarColor)  localStorage.setItem("finlit_avatarColor",  avatarColor);  }, [avatarColor]);

  const visibleName = displayName || user.name;
  const initials    = visibleName.slice(0, 1).toUpperCase();

  const title = location.pathname.startsWith("/app/clients/")
    ? "Client workspace"
    : PAGE_TITLE[location.pathname] || "Finlit";

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        {/* Brand */}
        <div className="app-brand-block">
          <img src="/logo.png" alt="Finlit Logo" className="brand-emblem"/>
                <span style={{ fontWeight: 700 }}>Finlit Financial Services</span>
        </div>

        {/* User */}
        <div className="sidebar-user-panel">
          <div
            className="sidebar-user-avatar"
            style={{ background: `${avatarColor}22`, borderColor: avatarColor, color: avatarColor }}
          >
            {initials}
          </div>
          <div>
            <div className="sidebar-user-name">{visibleName}</div>
            <div className="sidebar-user-role">{user.role === "owner" ? "Owner" : "Staff"}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">Navigation</div>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <span className="sidebar-link-icon"><Icon size={15} /></span>
              <span className="sidebar-link-title">{label}</span>
            </NavLink>
          ))}

          <div className="sidebar-nav-section" style={{ marginTop: 8 }}>Preferences</div>

          <button
            className="sidebar-link"
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="sidebar-link-icon">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </span>
            <span className="sidebar-link-title">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <button
            className="sidebar-link"
            onClick={() => setPersonalOpen((s) => !s)}
            title="Personalize"
          >
            <span className="sidebar-link-icon"><SlidersHorizontal size={15} /></span>
            <span className="sidebar-link-title">Personalize</span>
          </button>

          <button
            className="sidebar-link"
            style={{ color: "var(--red)", marginTop: "auto" }}
            onClick={onLogout}
            title="Sign out"
          >
            <span className="sidebar-link-icon"><LogOut size={15} /></span>
            <span className="sidebar-link-title">Sign out</span>
          </button>
        </nav>

        {/* Quick stats */}
        <div className="sidebar-panel">
          <div className="sidebar-panel-heading">Quick stats</div>
          <div className="sidebar-mini-grid">
            {[
              { label: "Today",   value: stats.todayLogs },
              { label: "Clients", value: stats.uniqueClients },
              { label: "Staff",   value: stats.teamCoverage },
              { label: "Open",    value: stats.openTasks },
              { label: "Due",     value: stats.overdueTasks },
              { label: "Files",   value: stats.attachmentMessages },
            ].map(({ label, value }) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ display: "none" }}  /* shown via CSS on mobile */
          >
            <Menu size={16} />
          </button>

          <h1>{title}</h1>

          <div className="topbar-actions">
            <div className="topbar-chip">
              {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </div>

            <button
              className="icon-button"
              onClick={() => setPersonalOpen((s) => !s)}
              title="Personalize"
              aria-label="Personalize"
            >
              <SlidersHorizontal size={14} />
            </button>

            <button
              className="icon-button"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              className="icon-button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              style={{ color: "var(--red)" }}
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Personalisation popover */}
          {personalOpen && (
            <div className="personalize-popover" role="dialog" aria-label="Personalize">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Personalize</span>
                <button className="icon-button" onClick={() => setPersonalOpen(false)} aria-label="Close">
                  <X size={13} />
                </button>
              </div>
              <div className="field">
                <label>Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.name}
                />
              </div>
              <div className="field">
                <label>Avatar color</label>
                <input
                  type="color"
                  value={avatarColor}
                  onChange={(e) => setAvatarColor(e.target.value)}
                  style={{ height: 36, padding: 4, cursor: "pointer" }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Page */}
        <main className="app-page">{children}</main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {NAV.slice(0, 4).map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className="mobile-nav-link"
          onClick={() => setDrawerOpen(true)}
          aria-label="More options"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/logo.png" alt="Finlit Logo" className="brand-emblem"/>
                <span style={{ fontWeight: 700 }}>Finlit Financial Services</span>
              </div>
              <button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X size={15} />
              </button>
            </div>

            <div className="mobile-drawer-links">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `mobile-drawer-link${isActive ? " active" : ""}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </NavLink>
              ))}
              <button
                className="mobile-drawer-link"
                onClick={() => { setPersonalOpen(true); setDrawerOpen(false); }}
              >
                <SlidersHorizontal size={15} />
                <span>Personalize</span>
              </button>
              <button
                className="mobile-drawer-link"
                onClick={() => { onToggleTheme(); setDrawerOpen(false); }}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
            </div>

            <button className="mobile-drawer-logout" onClick={onLogout}>
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}