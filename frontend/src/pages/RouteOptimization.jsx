/* eslint-disable no-unused-vars */
import { Suspense, useState } from "react";
import { PageLayout } from "./Dashboard";
import GlassCard from "../components/ui/GlassCard";
import RealRouteMap from "../components/map/RealRouteMap";
import { routeBins } from "../data/mockData";
import { Navigation, Fuel, Clock, CheckCircle, ArrowDown } from "lucide-react";

const priorityConfig = {
  start:    { color: "#06b6d4", label: "START" },
  critical: { color: "#ef4444", label: "CRITICAL" },
  high:     { color: "#f97316", label: "HIGH" },
  medium:   { color: "#eab308", label: "MEDIUM" },
  end:      { color: "#22c55e", label: "END" },
};

export default function RouteOptimization() {
  const [optimized, setOptimized] = useState(true);

  const filteredBins = routeBins.filter(b => b.level >= 75 || b.priority === "start" || b.priority === "end");

  return (
    <PageLayout title="Route Optimizer">
      {/* Full-width City Map */}
      <GlassCard style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>🗺️ Live City Map — Collection Route</h2>
            <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px" }}>
              CMRIT Campus · Live GPS Tracking · Animated Truck
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Legend */}
            {[
              { color: "#06b6d4", label: "Depot/End" },
              { color: "#ef4444", label: "Critical"  },
              { color: "#f97316", label: "High"      },
              { color: "#eab308", label: "Medium"    },
              { color: "#22c55e", label: "Truck"     },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color,
                  boxShadow: `0 0 6px ${l.color}`, display: "inline-block" }} />
                <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{l.label}</span>
              </div>
            ))}
            <button
              className="btn-primary"
              style={{ fontSize: "0.78rem", padding: "0.4rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              onClick={() => setOptimized(p => !p)}
            >
              <Navigation size={14} /> Re-Optimize
            </button>
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div style={{
          height: 500, borderRadius: "1rem", overflow: "hidden",
          background: "#0f172a",
          border: "1px solid rgba(34,197,94,0.1)",
        }}>
          <Suspense fallback={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", color: "#06b6d4", fontSize: "0.85rem", gap: "0.5rem" }}>
              <div style={{ width: 32, height: 32, border: "2px solid #06b6d4", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Loading Map...
            </div>
          }>
            <RealRouteMap />
          </Suspense>
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem" }}>
        {/* Left: metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Efficiency metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
            {[
              { icon: Navigation, label: "Total Distance", value: "4.2 km",  color: "#06b6d4" },
              { icon: Fuel,       label: "Fuel Saved",    value: "~2.1L",    color: "#22c55e" },
              { icon: Clock,      label: "Est. Duration", value: "38 min",   color: "#a855f7" },
            ].map(({ icon: Icon, label, value, color }) => (
              <GlassCard key={label} style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px",
                  background: `${color}15`, border: `1px solid ${color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 0.6rem", boxShadow: `0 0 14px ${color}15` }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>{label}</div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Right: Route list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <GlassCard style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Optimized Collection Route</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem",
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 9999, padding: "0.25rem 0.75rem" }}>
                <CheckCircle size={12} color="#22c55e" />
                <span style={{ fontSize: "0.68rem", color: "#22c55e", fontWeight: 700 }}>OPTIMIZED</span>
              </div>
            </div>

            <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1rem" }}>
              Bins with fill level ≥ 75% · Sorted by priority · Nearest-neighbor algorithm
            </p>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredBins.map((bin, idx) => {
                const pcfg = priorityConfig[bin.priority];
                const isLast = idx === filteredBins.length - 1;
                return (
                  <div key={bin.id} style={{ display: "flex", gap: "0.875rem", position: "relative" }}>
                    {/* Timeline connector */}
                    {!isLast && (
                      <div style={{
                        position: "absolute", left: "15px", top: "36px",
                        width: 2, height: "calc(100% - 8px)",
                        background: `linear-gradient(180deg, ${pcfg.color}60, rgba(255,255,255,0.06))`,
                        zIndex: 0
                      }} />
                    )}

                    {/* Node dot */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: `${pcfg.color}20`, border: `2px solid ${pcfg.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 1, boxShadow: `0 0 10px ${pcfg.color}40`,
                      marginTop: "0.5rem"
                    }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: pcfg.color }}>
                        {idx + 1}
                      </span>
                    </div>

                    {/* Bin card */}
                    <div style={{
                      flex: 1, background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "0.875rem", padding: "0.75rem",
                      marginBottom: "0.6rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>{bin.name}</div>
                          <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: "2px" }}>
                            {bin.lat.toFixed(4)}, {bin.lng.toFixed(4)}
                          </div>
                        </div>
                        <span style={{
                          fontSize: "0.62rem", fontWeight: 700, color: pcfg.color,
                          background: `${pcfg.color}15`, border: `1px solid ${pcfg.color}30`,
                          borderRadius: 9999, padding: "0.2rem 0.6rem"
                        }}>{pcfg.label}</span>
                      </div>

                      {bin.level > 0 && (
                        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div className="fill-bar" style={{ flex: 1 }}>
                            <div className="fill-bar-inner" style={{
                              width: `${bin.level}%`,
                              background: `linear-gradient(90deg, ${pcfg.color}60, ${pcfg.color})`
                            }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: pcfg.color }}>{bin.level}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Environmental impact */}
          <GlassCard style={{ padding: "1.25rem", background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.1)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e", marginBottom: "0.75rem" }}>
              🌿 Environmental Impact
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                { label: "Trips Reduced", value: "30%",   color: "#22c55e" },
                { label: "CO₂ Reduced",  value: "48 kg", color: "#06b6d4" },
                { label: "Fuel Saved",   value: "2.1 L",  color: "#a855f7" },
                { label: "Time Saved",   value: "22 min", color: "#f59e0b" },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center", padding: "0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.625rem" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: "0.65rem", color: "#475569", marginTop: "2px" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </PageLayout>
  );
}
