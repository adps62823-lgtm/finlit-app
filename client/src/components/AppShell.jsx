import React, { useState, useEffect } from "react";
import { Home, LogOut, Menu, Radar, ShieldCheck, Users, X, Moon, Sun } from "lucide-react";
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

export default function AppShell({ user, stats, onLogout, onToggleTheme, theme, children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#2fc4b2");
  const title = location.pathname.startsWith("/app/clients/")
    ? "Client"
    : pageTitles[location.pathname] || "Finlit";

  useEffect(() => {
    const saved = localStorage.getItem("finlit_displayName");
    const color = localStorage.getItem("finlit_avatarColor");
    if (saved) setDisplayName(saved);
    if (color) setAvatarColor(color);
  }, []);

  useEffect(() => {
    if (displayName) localStorage.setItem("finlit_displayName", displayName);
  }, [displayName]);

  useEffect(() => {
    if (avatarColor) localStorage.setItem("finlit_avatarColor", avatarColor);
  }, [avatarColor]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand-block">
          <div className="brand-emblem" style={{background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}66)`}}>
            { (displayName || user.name).slice(0,1).toUpperCase() }
          </div>
          <div>
            <div className="brand-title">Finlit</div>
            <div className="brand-caption">@{(displayName || user.name).toLowerCase().replace(/\s+/g, "")}</div>
          </div>
        </div>

        <section className="sidebar-panel sidebar-user-panel">
          <div className="sidebar-user-avatar" style={{background: `${avatarColor}22`}}>{(displayName || user.name).slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{displayName || user.name}</div>
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
          <button className="sidebar-link" onClick={onToggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} type="button">
            <div className="sidebar-link-icon">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</div>
            <div className="sidebar-link-title">{theme === "dark" ? "Light" : "Dark"}</div>
          </button>
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
              <button
                className="icon-button"
                onClick={() => setPersonalOpen((s) => !s)}
                title="Personalize"
                type="button"
              >
                <Users size={18} />
              </button>
              <button
                className="icon-button"
                onClick={onToggleTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                type="button"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="ghost-button" onClick={onLogout} type="button">
                <LogOut size={16} />
                <span>Logout</span>
              </button>

              {personalOpen ? (
                <div className="card" style={{position:'absolute', right:20, top:64, width:260, zIndex: 999}}>
                  <label style={{display:'block', marginBottom:8, fontWeight:700}}>Display name</label>
                  <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder={user.name} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid var(--border)'}} />
                  <label style={{display:'block', marginTop:12, marginBottom:8, fontWeight:700}}>Avatar color</label>
                  <input type="color" value={avatarColor} onChange={(e)=>setAvatarColor(e.target.value)} style={{width:'100%', height:36, padding:4, borderRadius:8, border:'1px solid var(--border)'}} />
                  <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                    <button className="ghost-button" onClick={()=>setPersonalOpen(false)} type="button">Close</button>
                  </div>
                </div>
              ) : null}
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
