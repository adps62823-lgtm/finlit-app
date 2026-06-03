import React, { useState } from "react";
import {
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CirclePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Users,
  X,
  MoonStar,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/app/command", label: "Command Center", Icon: LayoutDashboard },
  { to: "/app/clients", label: "Client Book", Icon: Users },
  { to: "/app/meetings", label: "Meeting Desk", Icon: BookOpen },
  { to: "/app/transactions", label: "Transactions", Icon: ShieldCheck },
  { to: "/app/research", label: "Research Lab", Icon: BriefcaseBusiness },
];

const TITLES = {
  "/app/command": {
    label: "Command Center",
    subtitle: "Daily pulse, staff coverage, and urgent follow-ups.",
  },
  "/app/clients": {
    label: "Client Book",
    subtitle: "Portfolio-aware client profiles and bulk client import.",
  },
  "/app/meetings": {
    label: "Meeting Desk",
    subtitle: "Field logs, handoffs, and follow-up capture.",
  },
  "/app/transactions": {
    label: "Transactions",
    subtitle: "AdvisorX-style workflow rail for future integrations.",
  },
  "/app/research": {
    label: "Research Lab",
    subtitle: "Planning tools, calculators, and market surfaces.",
  },
};

function StatChip({ label, value }) {
  return (
    <div className="stat-chip">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function AppShell({
  user,
  stats,
  dueTasks = [],
  notificationsEnabled,
  onEnableNotifications,
  onLogout,
  onToggleTheme,
  onOpenSearch,
  onOpenImport,
  theme,
  children,
}) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTitle = Object.entries(TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  )?.[1] || TITLES["/app/command"];

  const initials = (user?.name || user?.email || "F")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="workspace-shell">
      <aside className={`workspace-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>Finlit Command</strong>
            <span>Advisor operations desk</span>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-copy">
            <strong>{user?.name || "Principal Advisor"}</strong>
            <span>{user?.role === "owner" ? "Owner console" : "Staff workspace"}</span>
          </div>
        </div>

        <nav className="workspace-nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-rail-card">
          <div className="rail-card-title">Today at a glance</div>
          <div className="rail-stats">
            <StatChip label="Logs" value={stats.totalLogs} />
            <StatChip label="Clients" value={stats.uniqueClients} />
            <StatChip label="Open" value={stats.openTasks} />
            <StatChip label="Due" value={stats.overdueTasks} />
          </div>
        </div>

        <div className="sidebar-rail-card">
          <div className="rail-card-title">Reminders</div>
          {dueTasks.length ? (
            <div className="reminder-list">
              {dueTasks.slice(0, 3).map((task) => (
                <div className="reminder-item" key={task._id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.clientName}</span>
                  </div>
                  <time>{task.dueLabel}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="rail-empty">No due reminders right now.</p>
          )}

          {onEnableNotifications && !notificationsEnabled ? (
            <button className="btn btn-secondary btn-sm rail-action" onClick={onEnableNotifications}>
              <BellRing size={14} />
              Enable alerts
            </button>
          ) : null}
        </div>

        <div className="sidebar-actions">
          <button className="btn btn-secondary btn-sm" onClick={onOpenSearch}>
            <Search size={14} />
            Search
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenImport}>
            <CirclePlus size={14} />
            Import clients
          </button>
        </div>

        <button className="btn btn-ghost btn-sm logout-button" onClick={onLogout}>
          <LogOut size={14} />
          Sign out
        </button>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-left">
            <button className="topbar-menu" onClick={() => setMobileOpen((value) => !value)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div className="topbar-kicker">Finlit internal platform</div>
              <h1>{activeTitle.label}</h1>
              <p>{activeTitle.subtitle}</p>
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-search" onClick={onOpenSearch}>
              <Search size={15} />
              <span>Search everything</span>
              <kbd>Ctrl K</kbd>
            </button>

            <button className="icon-btn" onClick={onOpenImport} title="Import clients">
              <CirclePlus size={15} />
            </button>

            <button
              className="icon-btn"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <SunMedium size={15} /> : <MoonStar size={15} />}
            </button>

            <button className="icon-btn" onClick={onEnableNotifications} title="Enable browser alerts">
              <BellRing size={15} />
            </button>
          </div>
        </header>

        <main className="workspace-page">
          <div className="workspace-badge">
            <Sparkles size={14} />
            Built for advisory operations, field follow-up, and owner visibility.
          </div>
          {children}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {NAV.slice(0, 4).map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} />
            <span>{label.split(" ")[0]}</span>
          </NavLink>
        ))}
        <button className="mobile-nav-link" onClick={onOpenSearch}>
          <Search size={18} />
          <span>Search</span>
        </button>
      </nav>
    </div>
  );
}
