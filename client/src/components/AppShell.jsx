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
  Wallet,
  Users,
  X,
  MoonStar,
  ListTodo,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/app/command", label: "Command", Icon: LayoutDashboard },
  { to: "/app/clients", label: "Clients", Icon: Users },
  { to: "/app/portfolio", label: "Portfolio", Icon: Wallet },
  { to: "/app/meetings", label: "Meetings", Icon: BookOpen },
  { to: "/app/transactions", label: "Transactions", Icon: ShieldCheck },
  { to: "/app/notifications", label: "Notifications", Icon: BellRing },
  { to: "/app/tasks", label: "Tasks", Icon: ListTodo },
  { to: "/app/research", label: "Research", Icon: BriefcaseBusiness },
];

const TITLES = {
  "/app/command": { label: "Overview" },
  "/app/clients": { label: "Clients" },
  "/app/portfolio": { label: "Portfolio" },
  "/app/meetings": { label: "Meetings" },
  "/app/transactions": { label: "Orders" },
  "/app/notifications": { label: "Notifications" },
  "/app/tasks": { label: "Tasks" },
  "/app/research": { label: "Tools" },
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
  notificationsUnreadCount = 0,
}) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(true);

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
    <div className={`workspace-shell${drawerOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`workspace-sidebar${drawerOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-copy">
            <img src="/logo.png" alt="Finlit logo" className="auth-logo" />
            <div>
              <strong>Finlit Consultants</strong>
            </div>
          </div>
          <button className="icon-btn sidebar-drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-copy">
            <strong>{user?.name || "Advisor"}</strong>
            <span>{user?.role === "owner" ? "Owner" : "Staff"}</span>
          </div>
        </div>

        <nav className="workspace-nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              {to === "/app/notifications" ? (
                <div className="nav-icon-wrap">
                  <Icon size={16} />
                  {notificationsUnreadCount > 0 ? (
                    <span className="badge badge-nav" aria-label={`${notificationsUnreadCount} unread notifications`}>
                      {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Icon size={16} />
              )}
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-rail-card">
          <div className="rail-card-title">Stats</div>
          <div className="rail-stats">
            <StatChip label="Logs" value={stats.totalLogs} />
            <StatChip label="Clients" value={stats.uniqueClients} />
            <StatChip label="Open" value={stats.openTasks} />
            <StatChip label="Due" value={stats.overdueTasks} />
          </div>
        </div>

        <div className="sidebar-rail-card">
          <div className="rail-card-title">Due</div>
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
            <p className="rail-empty">No due reminders.</p>
          )}

          {onEnableNotifications && !notificationsEnabled ? (
            <button className="btn btn-secondary btn-sm rail-action" onClick={onEnableNotifications} aria-label="Enable alerts">Enable alerts
              <BellRing size={14} />
            </button>
          ) : null}
        </div>
        <button className="btn btn-ghost btn-sm logout-button" onClick={onLogout} aria-label="Sign out">Log out
          <LogOut size={14} />
        </button>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-left">
            <button className="topbar-menu" onClick={() => setDrawerOpen((value) => !value)} type="button" aria-label="Toggle drawer">
              <Menu size={18} />
            </button>
            <h1>{activeTitle.label}</h1>
          </div>

          <div className="topbar-right">
            <button className="icon-btn" onClick={onOpenSearch} title="Search" aria-label="Search" type="button">
              <Search size={15} />
            </button>

            <button className="icon-btn" onClick={onOpenImport} title="Import" aria-label="Import" type="button">
              <CirclePlus size={15} />
            </button>

            <button
              className="icon-btn"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Light" : "Dark"}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "dark" ? <SunMedium size={15} /> : <MoonStar size={15} />}
            </button>

            <button className="icon-btn" onClick={onEnableNotifications} title="Alerts" aria-label="Alerts" type="button">
              <BellRing size={15} />
            </button>
          </div>
        </header>

        <main className="workspace-page">
          <div className="workspace-badge">
            <Sparkles size={14} />
            Ops mode
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
            onClick={() => setDrawerOpen(true)}
          >
            <Icon size={18} />
            <span>{label.split(" ")[0]}</span>
          </NavLink>
        ))}
        <button className="mobile-nav-link mobile-nav-link-more" onClick={onOpenSearch} type="button" aria-label="Search">
          <Search size={18} />
          <span>Search</span>
        </button>
      </nav>
    </div>
  );
}
