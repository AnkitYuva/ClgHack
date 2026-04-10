import { useEffect, useState } from "react";
import { PageLayout } from "./Dashboard";
import GlassCard from "../components/ui/GlassCard";
import { WasteCategoryChart, WeeklyBarChart } from "../components/charts/WasteCharts";
import { weeklyData } from "../data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../services/api";

const monthlyData = [
  { month: "Nov", overflow: 18, efficiency: 72 },
  { month: "Dec", overflow: 22, efficiency: 68 },
  { month: "Jan", overflow: 15, efficiency: 78 },
  { month: "Feb", overflow: 11, efficiency: 82 },
  { month: "Mar", overflow: 7,  efficiency: 87 },
  { month: "Apr", overflow: 4,  efficiency: 91 },
];

export default function Reports() {
  const [bins, setBins] = useState([]);
  const [classificationLogs, setClassificationLogs] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live data from backend for the reports
    const fetchData = () => {
      Promise.all([
        api.get("/bins").catch(() => ({ data: [] })),
        api.get("/waste-logs").catch(() => ({ data: [] })),
        api.get("/stats").catch(() => ({ data: null }))
      ]).then(([binsRes, logsRes, statsRes]) => {
        setBins(binsRes.data || []);
        setClassificationLogs(logsRes.data || []);
        setLiveStats(statsRes.data || null);
        setLoading(false);
      });
    };

    fetchData(); // initial fetch
    const intervalId = setInterval(fetchData, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId); // Cleanup
  }, []);

  // Compute live bin statistics
  const totalBins = bins.length;
  const overflowBins = bins.filter(b => b.fill_level >= 95).length;
  const fullBins = bins.filter(b => b.fill_level >= 80 && b.fill_level < 95).length;

  // Compute live waste category distribution from recent classifications
  let wasteCategories = [
    { name: "Recyclable",    value: 0, color: "#06b6d4" },
    { name: "Biodegradable", value: 0, color: "#22c55e" },
    { name: "Hazardous",     value: 0, color: "#ef4444" },
  ];

  if (classificationLogs.length > 0) {
    const counts = { recyclable: 0, biodegradable: 0, hazardous: 0 };
    classificationLogs.forEach(log => {
      if (counts[log.predicted_class] !== undefined) {
        counts[log.predicted_class]++;
      }
    });
    wasteCategories = [
      { name: "Recyclable",    value: counts.recyclable, color: "#06b6d4" },
      { name: "Biodegradable", value: counts.biodegradable, color: "#22c55e" },
      { name: "Hazardous",     value: counts.hazardous, color: "#ef4444" },
    ];
  } else {
    // Baseline fallback if no logs
    wasteCategories = [
      { name: "Recyclable",    value: 42, color: "#06b6d4" },
      { name: "Biodegradable", value: 35, color: "#22c55e" },
      { name: "Hazardous",     value: 23, color: "#ef4444" },
    ];
  }

  // Live dynamic impact metrics from SQLite database
  const collectedKg = liveStats?.collected_kg || 0;
  const co2Saved = liveStats?.co2_saved_kg || 0;
  const efficiency = liveStats?.efficiency || 0;

  const impactMetrics = [
    { label: "Total Monitored Bins", value: `${totalBins}`, color: "#06b6d4", unit: "live devices" },
    { label: "Critical Overflow",    value: `${overflowBins}`, color: "#ef4444", unit: "needs immediate pickup" },
    { label: "Full Capacity Bins",   value: `${fullBins}`, color: "#f97316", unit: "≥ 80% filled" },
    { label: "Total Waste Collected",value: `${collectedKg} kg`, color: "#22c55e", unit: "historical total" },
    { label: "CO₂ Equivalent Saved", value: `${co2Saved} kg`, color: "#a855f7", unit: "via route optimization" },
    { label: "Collection Efficiency",value: `${efficiency}%`, color: "#f59e0b", unit: "successful pickups" },
  ];

  return (
    <PageLayout title="Reports & Analytics">
      {/* Live Impact metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        {impactMetrics.map(m => (
          <GlassCard key={m.label} style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{m.label}</p>
            <p style={{ fontSize: "2rem", fontWeight: 900, color: m.color, marginTop: "0.35rem", letterSpacing: "-0.02em" }}>
              {loading ? "..." : m.value}
            </p>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Live Classification Distribution</h2>
              <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "0.5rem" }}>Based on real-time AI scans</p>
            </div>
            {classificationLogs.length > 0 && (
              <span className="live-indicator">LIVE</span>
            )}
          </div>
          <WasteCategoryChart data={wasteCategories} />
        </GlassCard>

        <GlassCard>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Weekly Collection (kg)</h2>
          <p style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "0.5rem" }}>Historical projection</p>
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

      {/* Live Bin status table */}
      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Live Bin Telemetry</h2>
          <span className="live-indicator">AUTO-UPDATE</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Bin ID", "Location", "Fill Level", "Status", "Waste Type", "Last Sync"].map(h => (
                  <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading telemetry data...</td>
                </tr>
              ) : bins.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No bins found</td>
                </tr>
              ) : (
                bins.map((bin) => {
                  const levelColor = bin.fill_level >= 95 ? "#ef4444" : bin.fill_level >= 80 ? "#f97316" : bin.fill_level >= 60 ? "#eab308" : "#22c55e";
                  return (
                    <tr key={bin.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }}>
                      <td style={{ padding: "0.75rem 0.875rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.75rem" }}>{bin.id}</td>
                      <td style={{ padding: "0.75rem 0.875rem", color: "#e2e8f0", fontWeight: 500 }}>{bin.name}</td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: 60, height: 6, borderRadius: 9999, background: "#1e293b", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${bin.fill_level}%`, background: levelColor, borderRadius: 9999 }} />
                          </div>
                          <span style={{ color: levelColor, fontWeight: 700 }}>{bin.fill_level}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: levelColor,
                          background: `${levelColor}15`, border: `1px solid ${levelColor}25`,
                          borderRadius: 9999, padding: "0.2rem 0.6rem" }}>{bin.status || "Ok"}</span>
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem", color: "#94a3b8" }}>{bin.type || "Mixed"}</td>
                      <td style={{ padding: "0.75rem 0.875rem", color: "#64748b", fontSize: "0.75rem" }}>{bin.last_updated}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <style>{`
        .live-indicator {
          font-size: 0.6rem;
          font-weight: 800;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          animation: pulse 2s infinite;
          letter-spacing: 0.05em;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </PageLayout>
  );
}
