import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/login", { email, password });
      if (res.data.success) {
        localStorage.setItem("ecosmart_token", res.data.token);
        localStorage.setItem("ecosmart_user", JSON.stringify(res.data.user));
        // Auto-route based on role — universal panel
        if (res.data.user.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/user-dashboard");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.9rem 1rem",
    background: "#F8FAFC", border: "1.5px solid #E2E8F0",
    borderRadius: "12px", color: "#0F172A", outline: "none",
    fontSize: "0.9rem", fontFamily: "inherit",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F4F7F6",
      backgroundImage: [
        "radial-gradient(circle at 25% 15%, rgba(16,185,129,0.1) 0%, transparent 55%)",
        "radial-gradient(circle at 75% 85%, rgba(6,182,212,0.08) 0%, transparent 55%)",
      ].join(","),
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: -80, right: -80, width: 300, height: 300,
        borderRadius: "50%", background: "rgba(16,185,129,0.08)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: -100, left: -80, width: 350, height: 350,
        borderRadius: "50%", background: "rgba(6,182,212,0.06)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        width: 420, background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "24px",
        boxShadow: "0 24px 64px rgba(15,23,42,0.09), 0 4px 16px rgba(15,23,42,0.04)",
        padding: "2.5rem 2.25rem",
        textAlign: "center",
        position: "relative", zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: "20px",
          background: "linear-gradient(135deg, #10B981, #06B6D4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem",
          boxShadow: "0 10px 24px rgba(16,185,129,0.3)",
          fontSize: "1.8rem",
        }}>🌿</div>

        <h1 style={{
          fontSize: "1.6rem", fontWeight: 800,
          color: "#0F172A", marginBottom: "0.4rem",
          letterSpacing: "-0.02em",
        }}>
          EcoSmart Bin
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#94A3B8", marginBottom: "2rem", lineHeight: 1.5 }}>
          Smart waste management platform
        </p>

        {/* Error */}
        {error && (
          <div style={{
            color: "#DC2626", background: "#FEF2F2",
            border: "1px solid #FECACA", padding: "0.75rem 1rem",
            borderRadius: "10px", marginBottom: "1.25rem",
            fontSize: "0.85rem", textAlign: "left",
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <input
            id="login-email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
            required
          />
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.9rem",
              background: loading ? "#6EE7B7" : "linear-gradient(135deg, #10B981, #059669)",
              color: "#FFFFFF", border: "none",
              borderRadius: "9999px",
              fontWeight: 700, fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              boxShadow: loading ? "none" : "0 8px 20px rgba(16,185,129,0.35)",
              transition: "all 0.2s",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ marginTop: "1.75rem", fontSize: "0.875rem", color: "#64748B" }}>
          New to EcoSmart?{" "}
          <Link to="/signup" style={{ color: "#10B981", textDecoration: "none", fontWeight: 700 }}>
            Create an account
          </Link>
        </p>

        {/* Role hint — subtle, no credentials exposed */}
        <div style={{
          marginTop: "1.25rem", paddingTop: "1.25rem",
          borderTop: "1px solid #F1F5F9",
          display: "flex", justifyContent: "center", gap: "1rem",
        }}>
          {[
            { role: "Admin", icon: "🛡️", color: "#6366F1" },
            { role: "Citizen", icon: "👤", color: "#10B981" },
          ].map(({ role, icon, color }) => (
            <div key={role} style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500,
            }}>
              <span style={{ fontSize: "0.85rem" }}>{icon}</span>
              <span style={{ color }}>{role}</span>
              <span>access supported</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
