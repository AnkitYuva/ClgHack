/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Trash2, Scan, MapPin,
  BarChart3, Leaf, Zap
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       path: "/dashboard", icon: LayoutDashboard },
  { label: "Bin Monitoring",  path: "/bins",      icon: Trash2 },
  { label: "AI Classifier",   path: "/classify",  icon: Scan },
  { label: "Route Optimizer", path: "/routes",    icon: MapPin },
  { label: "Reports",         path: "/reports",   icon: BarChart3 },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      style={{
        width: "260px",
        minHeight: "100vh",
        background: "rgba(2, 6, 23, 0.9)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0.5rem 0.75rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: "linear-gradient(135deg, #16a34a, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(34,197,94,0.4)"
          }}>
            <Leaf size={18} color="#000" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f1f5f9" }}>EcoSmart</div>
            <div style={{ fontSize: "0.65rem", color: "#22c55e", letterSpacing: "0.08em", fontWeight: 600 }}>BIN SYSTEM</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ fontSize: "0.65rem", color: "#475569", letterSpacing: "0.12em", fontWeight: 700, padding: "0 0.75rem", marginBottom: "0.5rem" }}>
          NAVIGATION
        </div>
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="nav-link"
              style={active ? {
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                boxShadow: "inset 0 0 0 1px rgba(34,197,94,0.25)",
              } : {}}
            >
              <Icon size={18} />
              {label}
              {active && (
                <span style={{
                  marginLeft: "auto", width: 6, height: 6,
                  borderRadius: "50%", background: "#22c55e",
                  boxShadow: "0 0 8px #22c55e"
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        marginTop: "auto", padding: "1rem 0.75rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Zap size={12} color="#22c55e" />
          <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>SYSTEM ONLINE</span>
        </div>
        <div style={{ fontSize: "0.7rem", color: "#475569" }}>
          SUSTAIN-A-THON 2026<br />
          Dept. of MCA, CMRIT
        </div>
      </div>
    </aside>
  );
}
