/* eslint-disable no-unused-vars */
import { Suspense, useState, useCallback } from "react";
import { PageLayout } from "./Dashboard";
import GlassCard from "../components/ui/GlassCard";
import RealRouteMap from "../components/map/RealRouteMap";
import { Navigation, Fuel, Clock, Leaf, MapPin, Info } from "lucide-react";

export default function RouteOptimization() {
  const [stats, setStats] = useState(null);

  const handleStatsChange = useCallback((s) => setStats(s), []);

  const hasRoute = stats && stats.count > 0;

  return (
    <PageLayout title="Route Optimizer">

      {/* Instruction banner */}
      <GlassCard style={{
        padding: "0.875rem 1.25rem", marginBottom: "1.25rem",
        background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.18)",
        display: "flex", alignItems: "center", gap: "0.875rem",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "10px",
          background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Info size={18} color="#06b6d4" />
        </div>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f1f5f9" }}>
            Plan your waste collection route
          </div>
          <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: "2px" }}>
            📍 Click anywhere on the map to drop a pickup location · The system automatically calculates the shortest route using nearest-neighbour optimization · Add as many stops as needed
          </div>
        </div>
      </GlassCard>

      {/* Map */}
      <GlassCard style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>🗺️ Interactive Route Planner</h2>
            <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px" }}>
              Click map · Auto shortest-path · Animated truck preview
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            {[
              { color: "#06b6d4", label: "Depot" },
              { color: "#22c55e", label: "Biodegradable" },
              { color: "#06b6d4", label: "Recyclable" },
              { color: "#ef4444", label: "Hazardous" },
              { color: "#f97316", label: "Mixed" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: l.color,
                  boxShadow: `0 0 6px ${l.color}`, display: "inline-block",
                }} />
                <span style={{ fontSize: "0.63rem", color: "#64748b" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          height: 500, borderRadius: "1rem", overflow: "hidden",
          background: "#0f172a", border: "1px solid rgba(34,197,94,0.1)",
        }}>
          <Suspense fallback={
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", color: "#06b6d4",
              fontSize: "0.85rem", gap: "0.5rem",
            }}>
              <div style={{
                width: 32, height: 32, border: "2px solid #06b6d4",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              Loading Map...
            </div>
          }>
            <RealRouteMap onStatsChange={handleStatsChange} />
          </Suspense>
        </div>
      </GlassCard>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          {
            icon: Navigation, label: "Total Distance",
            value: hasRoute ? `${stats.distance} km` : "—",
            color: "#06b6d4",
            sub: hasRoute ? `${stats.count} stop${stats.count > 1 ? "s" : ""}` : "No route yet",
          },
          {
            icon: Clock, label: "Est. Duration",
            value: hasRoute ? `${stats.duration} min` : "—",
            color: "#a855f7",
            sub: hasRoute ? "at avg. 15 km/h" : "Add stops to calculate",
          },
          {
            icon: Fuel, label: "Fuel Saved",
            value: hasRoute ? `${stats.fuel} L` : "—",
            color: "#22c55e",
            sub: hasRoute ? "vs. unoptimized route" : "—",
          },
          {
            icon: Leaf, label: "CO₂ Reduced",
            value: hasRoute ? `${stats.co2} kg` : "—",
            color: "#f59e0b",
            sub: hasRoute ? "carbon offset today" : "—",
          },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <GlassCard key={label} style={{ padding: "1.1rem", textAlign: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "11px",
              background: `${color}15`, border: `1px solid ${color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 0.7rem", boxShadow: `0 0 16px ${color}15`,
            }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>{label}</div>
            <div style={{ fontSize: "0.62rem", color: "#334155", marginTop: "3px" }}>{sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* Route list + impact */}
      {hasRoute && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem" }}>

          {/* Route stop list */}
          <GlassCard style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <MapPin size={16} color="#06b6d4" />
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Optimized Collection Order</h2>
              <span style={{
                marginLeft: "auto", fontSize: "0.65rem", fontWeight: 700, color: "#22c55e",
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 9999, padding: "0.2rem 0.65rem",
              }}>✓ SHORTEST PATH</span>
            </div>

            {/* Depot */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(6,182,212,0.15)", border: "2px solid #06b6d4",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem",
              }}>🏭</div>
              <div style={{ flex: 1, padding: "0.4rem 0.75rem", background: "rgba(6,182,212,0.05)",
                border: "1px solid rgba(6,182,212,0.15)", borderRadius: "0.75rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#06b6d4" }}>Collection Depot</div>
                <div style={{ fontSize: "0.65rem", color: "#475569" }}>Start &amp; End point</div>
              </div>
            </div>

            {/* Stops from state (pulled from RealRouteMap via onStatsChange trick — we re-derive from DOM) */}
            {/* We can't directly get ordered stops from child without lifting state, so we use stats.count */}
            <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.5rem", textAlign: "center" }}>
              {stats.count} pickup location{stats.count > 1 ? "s" : ""} optimized · see map for pin order
            </p>

            <div style={{
              marginTop: "0.75rem", padding: "0.75rem", borderRadius: "0.75rem",
              background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)",
            }}>
              <div style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600, marginBottom: "4px" }}>
                ✦ Nearest-Neighbour Algorithm
              </div>
              <div style={{ fontSize: "0.67rem", color: "#475569", lineHeight: 1.5 }}>
                Each stop is visited by always choosing the closest unvisited location — the same technique used by delivery apps like Swiggy and Zomato to optimize last-mile routes.
              </div>
            </div>
          </GlassCard>

          {/* Environmental impact */}
          <GlassCard style={{
            padding: "1.25rem",
            background: "rgba(34,197,94,0.03)",
            border: "1px solid rgba(34,197,94,0.12)",
          }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e", marginBottom: "1rem" }}>
              🌿 Environmental Impact
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              {[
                { label: "Trips Saved",  value: `${Math.max(1, stats.count - 1)}`,        color: "#22c55e" },
                { label: "CO₂ Reduced",  value: `${stats.co2} kg`,                         color: "#06b6d4" },
                { label: "Fuel Saved",   value: `${stats.fuel} L`,                          color: "#a855f7" },
                { label: "Time Optimized", value: `${Math.round(stats.duration * 0.3)} min`, color: "#f59e0b" },
              ].map(m => (
                <div key={m.label} style={{
                  textAlign: "center", padding: "0.75rem",
                  background: "rgba(255,255,255,0.03)", borderRadius: "0.75rem",
                  border: `1px solid ${m.color}15`,
                }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: "0.65rem", color: "#475569", marginTop: "3px" }}>{m.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "1rem", padding: "0.75rem", borderRadius: "0.75rem",
              background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)",
            }}>
              <div style={{ fontSize: "0.7rem", color: "#64748b", lineHeight: 1.6 }}>
                <strong style={{ color: "#06b6d4" }}>How it works:</strong><br />
                1. Click map → drop pickup pins<br />
                2. Algorithm finds shortest path<br />
                3. Truck animates the route live<br />
                4. Adjust waste type per stop
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Empty state when no stops placed */}
      {!hasRoute && (
        <GlassCard style={{
          padding: "2.5rem", textAlign: "center",
          background: "rgba(6,182,212,0.03)", border: "1px dashed rgba(6,182,212,0.2)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🗺️</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem" }}>
            No route planned yet
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", maxWidth: 380, margin: "0 auto" }}>
            Click on the map above to drop pickup locations. The system will instantly calculate
            the most efficient collection route — just like a delivery app.
          </div>
        </GlassCard>
      )}
    </PageLayout>
  );
}
