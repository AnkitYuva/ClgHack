import GlassCard from "./GlassCard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ title, value, subtitle, color = "#22c55e", icon: Icon, trend, trendValue }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#94a3b8";

  return (
    <GlassCard style={{ padding: "1.5rem", cursor: "default", transition: "transform 0.25s, box-shadow 0.25s" }}
      className="hover:scale-[1.02]">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {title}
          </p>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 900, color, marginTop: "0.4rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value}
          </h2>
          {subtitle && (
            <p style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.35rem" }}>{subtitle}</p>
          )}
          {trendValue && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.5rem" }}>
              <TrendIcon size={12} color={trendColor} />
              <span style={{ fontSize: "0.72rem", color: trendColor, fontWeight: 600 }}>{trendValue}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: "14px",
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 20px ${color}15`,
            flexShrink: 0,
          }}>
            <Icon size={22} color={color} />
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div style={{
        marginTop: "1.2rem",
        height: 3, borderRadius: "9999px",
        background: `linear-gradient(90deg, ${color}40, ${color}, ${color}40)`,
        boxShadow: `0 0 8px ${color}`
      }} />
    </GlassCard>
  );
}
