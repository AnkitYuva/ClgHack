import { Suspense } from "react";
import Sidebar from "../components/ui/Sidebar";
import Navbar from "../components/ui/Navbar";
import StatCard from "../components/ui/StatCard";
import AlertPanel from "../components/ui/AlertPanel";
import GlassCard from "../components/ui/GlassCard";
import { WasteCategoryChart, WeeklyBarChart } from "../components/charts/WasteCharts";
import { stats as mockStats, alerts as mockAlerts, wasteCategories, weeklyData, bins as mockBins } from "../data/mockData";
import api from "../services/api";
import { Trash2, AlertOctagon, Activity, Recycle, Zap, TrendingDown } from "lucide-react";

function PageLayout({ children, title }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar title={title} />
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export { PageLayout };

export default function Dashboard() {
  const [liveStats, setLiveStats] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState(null);
  const [liveTopBins, setLiveTopBins] = useState(null);

  useEffect(() => {
    const fetchDashboardData = () => {
      Promise.all([
        api.get("/stats").catch(() => ({ data: null })),
        api.get("/alerts").catch(() => ({ data: null })),
        api.get("/bins").catch(() => ({ data: null }))
      ]).then(([statsRes, alertsRes, binsRes]) => {
        if (statsRes.data) setLiveStats(statsRes.data);
        if (alertsRes.data) setLiveAlerts(alertsRes.data);
        if (binsRes.data) {
          // Sort by fill level descending and take top 4
          const sorted = [...binsRes.data].sort((a, b) => b.fill_level - a.fill_level).slice(0, 4);
          setLiveTopBins(sorted);
        }
      });
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Use live data if available, otherwise fallback to mock data
  const currentStats = liveStats ? {
    totalBins: liveStats.total_bins,
    fullBins: liveStats.full_bins,
    overflowBins: liveStats.overflow_bins,
    activeAlerts: liveStats.active_alerts,
    recycledToday: mockStats.recycledToday,
    efficiencyScore: mockStats.efficiencyScore
  } : mockStats;

  const currentAlerts = liveAlerts || mockAlerts;
  
  // Transform backend bin structure to match frontend component needs
  const currentTopBins = liveTopBins 
    ? liveTopBins.map(b => ({ id: b.id, name: b.name, level: b.fill_level }))
    : mockBins.filter(b => b.level >= 78).slice(0, 4);

  return (
    <PageLayout title="Dashboard">
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard title="Total Bins"    value={currentStats.totalBins}  color="#06b6d4" icon={Trash2}       subtitle="Active monitoring"    trend="up"   trendValue="Live" />
        <StatCard title="Full Bins"     value={currentStats.fullBins}   color="#f97316" icon={AlertOctagon} subtitle="Needs collection"     trend="up"   trendValue="Live" />
        <StatCard title="Overflow Bins" value={currentStats.overflowBins} color="#ef4444" icon={Activity}  subtitle="Immediate action"     trend="down" trendValue="Live" />
        <StatCard title="Active Alerts" value={currentStats.activeAlerts} color="#22c55e" icon={Zap}        subtitle="System alerts"        trend="up"   trendValue="Live" />
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard title="Recycled Today" value={currentStats.recycledToday} color="#a855f7" icon={Recycle} subtitle="Tonnes diverted" trend="up" trendValue="+0.3T vs yesterday" />
        <StatCard title="Efficiency Score" value={`${currentStats.efficiencyScore}%`} color="#22c55e" icon={TrendingDown} subtitle="Collection efficiency" trend="up" trendValue="+4% this week" />
        <GlassCard style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Carbon Saved Today
          </p>
          <p style={{ fontSize: "2.2rem", fontWeight: 900, color: "#22c55e", letterSpacing: "-0.02em" }}>48 kg</p>
          <p style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.3rem" }}>CO₂ equivalent via route opt.</p>
          <div style={{ marginTop: "0.75rem", height: 3, borderRadius: 9999, background: "linear-gradient(90deg, #22c55e40, #22c55e, #22c55e40)", boxShadow: "0 0 8px #22c55e" }} />
        </GlassCard>
      </div>

      {/* Row 3: alerts + charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Alerts */}
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Live Alerts</h2>
            <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 9999, padding: "0.2rem 0.6rem" }}>{currentAlerts.length} active</span>
          </div>
          <AlertPanel alerts={currentAlerts} />
        </GlassCard>

        {/* Waste category donut */}
        <GlassCard>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Waste Distribution</h2>
          <WasteCategoryChart data={wasteCategories} />
        </GlassCard>

        {/* Quick bin overview */}
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Top Priority Bins</h2>
            <span style={{ fontSize: "0.6rem", color: "#06b6d4", fontWeight: 800, padding: "2px 6px", border: "1px solid rgba(6,182,212,0.4)", borderRadius: "4px", background: "rgba(6,182,212,0.1)" }}>LIVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {currentTopBins.map(bin => {
              const color = bin.level >= 95 ? "#ef4444" : bin.level >= 80 ? "#f97316" : "#eab308";
              return (
                <div key={bin.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 500 }}>{bin.name.split(" – ")[0]}</span>
                    <span style={{ fontSize: "0.78rem", color, fontWeight: 700 }}>{bin.level}%</span>
                  </div>
                  <div className="fill-bar">
                    <div className="fill-bar-inner" style={{ width: `${bin.level}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Weekly chart */}
      <GlassCard>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Weekly Waste Collection</h2>
        <p style={{ fontSize: "0.75rem", color: "#475569", marginBottom: "1rem" }}>
          Biodegradable · Recyclable · Hazardous (kg)
        </p>
        <WeeklyBarChart data={weeklyData} />
      </GlassCard>
    </PageLayout>
  );
}
