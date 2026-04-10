import { PageLayout } from "./Dashboard";
import GlassCard from "../components/ui/GlassCard";
import { WasteCategoryChart, WeeklyBarChart } from "../components/charts/WasteCharts";
import { wasteCategories, weeklyData, bins } from "../data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyData = [
  { month: "Nov", overflow: 18, efficiency: 72 },
  { month: "Dec", overflow: 22, efficiency: 68 },
  { month: "Jan", overflow: 15, efficiency: 78 },
  { month: "Feb", overflow: 11, efficiency: 82 },
  { month: "Mar", overflow: 7,  efficiency: 87 },
  { month: "Apr", overflow: 4,  efficiency: 91 },
];

const impactMetrics = [
  { label: "Total Waste Collected",  value: "12.4T",  color: "#22c55e", unit: "this month" },
  { label: "Recyclable Diverted",    value: "5.2T",   color: "#06b6d4", unit: "from landfill" },
  { label: "CO₂ Equivalent Saved",   value: "890 kg", color: "#a855f7", unit: "via route opt." },
  { label: "Overflow Incidents",     value: "4",      color: "#ef4444", unit: "down 78% MoM" },
  { label: "Collection Efficiency",  value: "91%",    color: "#f59e0b", unit: "best ever" },
  { label: "Hazardous Handled",      value: "0.9T",   color: "#f97316", unit: "properly disposed" },
];

export default function Reports() {
  return (
    <PageLayout title="Reports & Analytics">
      {/* Impact metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {impactMetrics.map(m => (
          <GlassCard key={m.label} style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{m.label}</p>
            <p style={{ fontSize: "2rem", fontWeight: 900, color: m.color, marginTop: "0.35rem", letterSpacing: "-0.02em" }}>{m.value}</p>
            <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.2rem" }}>{m.unit}</p>
            <div style={{ marginTop: "0.75rem", height: 2, borderRadius: 9999,
              background: `linear-gradient(90deg, ${m.color}20, ${m.color}, ${m.color}20)`,
              boxShadow: `0 0 6px ${m.color}` }} />
          </GlassCard>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        <GlassCard>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Waste Category Distribution</h2>
          <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "0.5rem" }}>This month's classification breakdown</p>
          <WasteCategoryChart data={wasteCategories} />
        </GlassCard>

        <GlassCard>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Weekly Collection (kg)</h2>
          <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "0.5rem" }}>Biodegradable · Recyclable · Hazardous</p>
          <WeeklyBarChart data={weeklyData} />
        </GlassCard>
      </div>

      {/* Trend chart */}
      <GlassCard style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>6-Month Sustainability Trend</h2>
        <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "1rem" }}>Overflow incidents (red) vs Collection efficiency % (green)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ovfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#e2e8f0", fontSize: "0.78rem" }} />
            <Area type="monotone" dataKey="efficiency" stroke="#22c55e" fill="url(#effGrad)" strokeWidth={2} dot={{ fill: "#22c55e", r: 4 }} />
            <Area type="monotone" dataKey="overflow"   stroke="#ef4444" fill="url(#ovfGrad)" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Bin status table */}
      <GlassCard>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Bin Performance Summary</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Bin ID", "Name", "Fill Level", "Status", "Waste Type", "Last Updated"].map(h => (
                  <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: "0.72rem", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bins.map((bin) => {
                const levelColor = bin.level >= 95 ? "#ef4444" : bin.level >= 80 ? "#f97316" : bin.level >= 60 ? "#eab308" : "#22c55e";
                return (
                  <tr key={bin.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }}>
                    <td style={{ padding: "0.625rem 0.875rem", color: "#64748b", fontFamily: "monospace" }}>{bin.id}</td>
                    <td style={{ padding: "0.625rem 0.875rem", color: "#e2e8f0", fontWeight: 500 }}>{bin.name}</td>
                    <td style={{ padding: "0.625rem 0.875rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 60, height: 6, borderRadius: 9999, background: "#1e293b", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${bin.level}%`, background: levelColor, borderRadius: 9999 }} />
                        </div>
                        <span style={{ color: levelColor, fontWeight: 700 }}>{bin.level}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: levelColor,
                        background: `${levelColor}15`, border: `1px solid ${levelColor}25`,
                        borderRadius: 9999, padding: "0.2rem 0.6rem" }}>{bin.status}</span>
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", color: "#94a3b8" }}>{bin.type}</td>
                    <td style={{ padding: "0.625rem 0.875rem", color: "#64748b" }}>{bin.lastUpdated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </PageLayout>
  );
}
