/* eslint-disable no-unused-vars */
import { Link } from "react-router-dom";
import { Suspense } from "react";
import { ArrowRight, Cpu, Radio, Map, BarChart3, Leaf, Zap, Shield } from "lucide-react";
import InteractiveBin from "../components/three/InteractiveBin";
import ParticleField from "../components/three/ParticleField";

const features = [
  { icon: Cpu,      label: "AI Classifier",    desc: "MobileNetV2-based waste image classification", color: "#22c55e" },
  { icon: Radio,    label: "IoT Monitoring",   desc: "Real-time smart bin fill-level tracking",       color: "#06b6d4" },
  { icon: Map,      label: "Route Optimizer",  desc: "Nearest-neighbor route planning for trucks",    color: "#a855f7" },
  { icon: BarChart3,label: "Analytics",         desc: "Waste trends, efficiency & sustainability KPIs",color: "#f59e0b" },
];

const techBadges = ["React", "Three.js", "Python Flask", "TensorFlow", "MongoDB", "IoT", "Recharts", "Leaflet"];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Particle background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.5, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          <ParticleField count={300} />
        </Suspense>
      </div>

      {/* Gradient overlays */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(34,197,94,0.06) 0%, transparent 70%)",
      }} />

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(2,6,23,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 3rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "10px",
            background: "linear-gradient(135deg,#16a34a,#06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(34,197,94,0.4)"
          }}><Leaf size={16} color="#000" /></div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>EcoSmart Bin</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/login">
            <button className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}>Log in</button>
          </Link>
          <Link to="/signup">
            <button className="btn-primary" style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}>Sign up</button>
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section style={{
        minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr",
        alignItems: "center", padding: "6rem 4rem 3rem", position: "relative", zIndex: 2
      }}>
        {/* Left content */}
        <div style={{ maxWidth: 600 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "9999px", padding: "0.4rem 1rem", marginBottom: "1.5rem"
          }}>
            <Zap size={12} color="#22c55e" />
            <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700, letterSpacing: "0.1em" }}>
              SUSTAIN-A-THON 2026 · DEPT. MCA, CMRIT
            </span>
          </div>

          <h1 style={{
            fontSize: "3.8rem", fontWeight: 900, lineHeight: 1.05,
            letterSpacing: "-0.03em", marginBottom: "1rem"
          }}>
            <span className="gradient-text">EcoSmart</span>
            <br />
            <span style={{ color: "#f1f5f9" }}>Bin</span>
          </h1>

          <p style={{ fontSize: "1.15rem", color: "#94a3b8", lineHeight: 1.7, marginBottom: "0.75rem" }}>
            AI + IoT powered smart waste management system. Real-time bin monitoring,
            intelligent waste classification, and optimized collection routes for cleaner, smarter cities.
          </p>

          <p style={{
            fontSize: "0.85rem", color: "#22c55e", fontWeight: 600,
            fontStyle: "italic", marginBottom: "2rem"
          }}>
            "Reducing waste overflow by 30% · 25% less fuel · Cleaner campuses"
          </p>

          <div style={{ display: "flex", gap: "0.875rem", marginBottom: "2.5rem" }}>
            <Link to="/signup">
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Get Started <ArrowRight size={16} />
              </button>
            </Link>
            <Link to="/login">
              <button className="btn-ghost">Admin Login</button>
            </Link>
          </div>

          {/* Tech badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {techBadges.map((b) => (
              <span key={b} style={{
                fontSize: "0.7rem", fontWeight: 600, color: "#64748b",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "9999px", padding: "0.25rem 0.75rem"
              }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Right: 3D Bin */}
        <div style={{ height: "600px", position: "relative" }}>
          {/* Glow behind bin */}
          <div style={{
            position: "absolute", inset: "20%", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#22c55e" }}>
              Loading 3D Model...
            </div>
          }>
            <InteractiveBin level={0.82} />
          </Suspense>

          {/* Floating info chips */}
          {[
            { label: "Fill Level", value: "82%",          pos: { top: "18%", left: "-5%" },  color: "#22c55e" },
            { label: "Status",     value: "Full",          pos: { top: "50%", right: "-5%" }, color: "#f97316" },
            { label: "Waste Type", value: "Recyclable",    pos: { bottom: "22%", left: "-4%"},color: "#06b6d4" },
          ].map((chip) => (
            <div key={chip.label} style={{
              position: "absolute", ...chip.pos,
              background: "rgba(2,6,23,0.85)", backdropFilter: "blur(12px)",
              border: `1px solid ${chip.color}30`, borderRadius: "12px",
              padding: "0.5rem 0.875rem", zIndex: 10
            }}>
              <div style={{ fontSize: "0.62rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.08em" }}>{chip.label}</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: chip.color }}>{chip.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features section */}
      <section style={{ padding: "2rem 4rem 5rem", position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
            <span className="gradient-text">Core Modules</span>
          </h2>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Four pillars of smart waste intelligence</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {features.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="glass" style={{
              padding: "1.5rem", textAlign: "center",
              transition: "transform 0.25s, box-shadow 0.25s",
              cursor: "default"
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "14px",
                background: `${color}15`,border: `1px solid ${color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1rem", boxShadow: `0 0 20px ${color}20`
              }}>
                <Icon size={24} color={color} />
              </div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem" }}>{label}</h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <Link to="/signup">
            <button className="btn-primary" style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}>
              Join EcoSmart Bin →
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
