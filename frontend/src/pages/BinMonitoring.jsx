import { Suspense, useState, useEffect } from "react";
import { PageLayout } from "./Dashboard";
import GlassCard from "../components/ui/GlassCard";
import InteractiveBin from "../components/three/InteractiveBin";
import api from "../services/api";

const statusConfig = {
  Low:      { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)"  },
  Medium:   { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.2)"  },
  High:     { color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.2)"  },
  Full:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)" },
  Overflow: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)"  },
};

const typeColors = {
  Recyclable:    "#06b6d4",
  Biodegradable: "#22c55e",
  Hazardous:     "#ef4444",
};

export default function BinMonitoring() {
  const [liveBins, setLiveBins] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const res = await api.get("/bins");
        setLiveBins(res.data);
        if (res.data.length > 0 && !selected) setSelected(res.data[0]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchBins();
    const interval = setInterval(fetchBins, 3000);
    return () => clearInterval(interval);
  }, [selected]);

  return (
    <PageLayout title="Bin Monitoring">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "1.25rem" }}>
        {/* 3D Bin visualization */}
        <GlassCard style={{ padding: "1.25rem" }}>
          {selected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Live Bin Preview</h2>
                  <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>{selected.name}</p>
                </div>
                <div style={{
                  background: statusConfig[selected.status]?.bg,
                  border: `1px solid ${statusConfig[selected.status]?.border}`,
                  color: statusConfig[selected.status]?.color,
                  borderRadius: 9999, padding: "0.25rem 0.75rem",
                  fontSize: "0.72rem", fontWeight: 700,
                }}>{selected.status}</div>
              </div>

              {/* 3D Bin */}
              <div style={{ height: 320, borderRadius: "1rem", overflow: "hidden",
                background: "radial-gradient(circle at center, rgba(34,197,94,0.05) 0%, transparent 70%)" }}>
                <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#22c55e", fontSize: "0.8rem" }}>Loading 3D...</div>}>
                  <InteractiveBin level={selected.fill_level / 100} />
                </Suspense>
              </div>

              {/* Bin stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "1rem" }}>
                {[
                  { label: "Fill Level", value: `${selected.fill_level}%`, color: statusConfig[selected.status]?.color },
                  { label: "Waste Type", value: selected.type, color: typeColors[selected.type] || "#06b6d4" },
                  { label: "Last Update", value: new Date(selected.last_updated).toLocaleTimeString(), color: "#06b6d4" },
                ].map(item => (
                  <div key={item.label} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center"
                  }}>
                    <div style={{ fontSize: "0.62rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: "0.25rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No active pickup requests right now. Wait for citizens to report bins!</div>
          )}
        </GlassCard>

        {/* Bin list */}
        <GlassCard style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>All Smart Bins</h2>
            <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>{liveBins.length} bins monitored</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: 520, overflowY: "auto" }}>
            {liveBins.map(bin => {
              const cfg = statusConfig[bin.status] || statusConfig.Low;
              const isSelected = selected && bin.id === selected.id;
              return (
                <div
                  key={bin.id}
                  onClick={() => setSelected(bin)}
                  style={{
                    background: isSelected ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
                    border: isSelected ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "0.875rem", padding: "0.875rem 1rem",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>{bin.name}</div>
                      <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: "2px" }}>{bin.id} · {new Date(bin.last_updated).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700, color: cfg.color,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 9999, padding: "0.2rem 0.6rem"
                      }}>{bin.status}</span>
                      <span style={{ fontSize: "0.68rem", color: typeColors[bin.type] || "#06b6d4", fontWeight: 600 }}>{bin.type}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="fill-bar" style={{ flex: 1 }}>
                      <div className="fill-bar-inner" style={{
                        width: `${bin.fill_level}%`,
                        background: `linear-gradient(90deg, ${cfg.color}60, ${cfg.color})`
                      }} />
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: cfg.color, minWidth: "36px", textAlign: "right" }}>
                      {bin.fill_level}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </PageLayout>
  );
}
