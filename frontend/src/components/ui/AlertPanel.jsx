import { AlertTriangle, Info, AlertOctagon, CheckCircle } from "lucide-react";

const priorityConfig = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", icon: AlertOctagon, label: "CRITICAL" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", icon: AlertTriangle, label: "HIGH" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.25)",  icon: AlertTriangle, label: "MEDIUM" },
  info:     { color: "#06b6d4", bg: "rgba(6,182,212,0.08)",  border: "rgba(6,182,212,0.25)",  icon: Info,          label: "INFO" },
};

export default function AlertPanel({ alerts = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {alerts.map((alert) => {
        const cfg = priorityConfig[alert.priority] || priorityConfig.info;
        const Icon = cfg.icon;
        return (
          <div key={alert.id} style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: "0.875rem", padding: "0.9rem 1rem",
            transition: "transform 0.2s",
          }}>
            <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 500 }}>{alert.message}</p>
              {alert.bin && (
                <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>{alert.bin}</p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                color: cfg.color, background: `${cfg.color}18`,
                border: `1px solid ${cfg.color}30`, padding: "2px 8px", borderRadius: "9999px"
              }}>{cfg.label}</span>
              <span style={{ fontSize: "0.68rem", color: "#475569" }}>{alert.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
