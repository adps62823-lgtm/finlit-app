import React, { useState } from "react";
import { Home, LogOut, Menu, Radar, ShieldCheck, Users, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  {
    to: "/app/command",
    label: "Home",
    icon: Home,
  },
  {
    to: "/app/clients",
    label: "Clients",
    icon: Users,
  },
  {
    to: "/app/meetings",
    label: "Meetings",
    icon: Radar,
  },
  {
    to: "/app/transactions",
    label: "Orders",
    icon: ShieldCheck,
  },
  {
    to: "/app/research",
    label: "Tools",
    icon: Radar,
  },
];

const pageTitles = {
  "/app/command": "Overview",
  "/app/clients": "Clients",
  "/app/meetings": "Meetings",
  "/app/transactions": "Orders",
  "/app/research": "Tools",
};

export default function AppShell({ user, stats, onLogout, children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const title = location.pathname.startsWith("/app/clients/")
    ? "Client"
    : pageTitles[location.pathname] || "Finlit";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand-block">
          <div className="brand-emblem">F</div>
          <div>
            <div className="brand-title">Finlit</div>
            <div className="brand-caption">@{user.name.toLowerCase().replace(/\s+/g, "")}</div>
          </div>
        </div>

        <section className="sidebar-panel sidebar-user-panel">
          <div className="sidebar-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role === "owner" ? "Owner" : "Staff"}</div>
          </div>
        </section>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                to={item.to}
              >
                <div className="sidebar-link-icon">
                  <Icon size={18} />
                </div>
                <div className="sidebar-link-title">{item.label}</div>
              </NavLink>
            );
          })}
        </nav>

        <section className="sidebar-panel">
          <div className="sidebar-panel-heading">Quick stats</div>
          <div className="sidebar-mini-grid">
            <div>
              <strong>{stats.todayLogs}</strong>
              <span>Today</span>
            </div>
            <div>
              <strong>{stats.uniqueClients}</strong>
              <span>Clients</span>
            </div>
            <div>
              <strong>{stats.teamCoverage}</strong>
              <span>Staff</span>
            </div>
            <div>
              <strong>{stats.openTasks}</strong>
              <span>Open</span>
            </div>
            <div>
              <strong>{stats.overdueTasks}</strong>
              <span>Overdue</span>
            </div>
            <div>
              <strong>{stats.attachmentMessages}</strong>
              <span>Files</span>
            </div>
          </div>
        </section>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="ghost-button mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
          <div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-chip">{new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</div>
            <button className="ghost-button" onClick={onLogout} type="button">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="app-page">{children}</main>
      </div>

      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
              to={item.to}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button className="mobile-nav-link" onClick={() => setMobileMenuOpen(true)} type="button">
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} role="presentation">
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div>
                <div className="brand-title">Finlit</div>
                <div className="brand-caption">{user.name}</div>
              </div>
              <button className="ghost-button" onClick={() => setMobileMenuOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="mobile-drawer-links">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) => `mobile-drawer-link ${isActive ? "active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                    to={item.to}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <button className="mobile-drawer-logout" onClick={onLogout} type="button">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
