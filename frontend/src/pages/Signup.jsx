import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/register", { email, password });
      if (res.data.success) {
        localStorage.setItem("ecosmart_token", res.data.token);
        localStorage.setItem("ecosmart_user", JSON.stringify(res.data.user));
        navigate("/user-dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.9rem 1rem",
    background: "#F8FAFC", border: "1px solid #E2E8F0",
    borderRadius: "12px", color: "#0F172A", outline: "none",
    fontSize: "0.9rem", transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F4F7F6",
      backgroundImage: "radial-gradient(circle at 70% 20%, rgba(6,182,212,0.08) 0%, transparent 60%), radial-gradient(circle at 30% 80%, rgba(16,185,129,0.06) 0%, transparent 60%)",
    }}>
      <div style={{
        width: 420, background: "#FFFFFF",
        border: "1px solid #E2E8F0", borderRadius: "24px",
        boxShadow: "0 20px 60px rgba(15,23,42,0.08)", padding: "2.5rem",
        textAlign: "center",
      }}>
        {/* Logo mark */}
        <div style={{
          width: 60, height: 60, borderRadius: "18px",
          background: "linear-gradient(135deg, #06B6D4, #10B981)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem", boxShadow: "0 8px 20px rgba(6,182,212,0.3)",
          fontSize: "1.6rem",
        }}>♻️</div>

        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0F172A", marginBottom: "0.35rem" }}>
          Create Account
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#94A3B8", marginBottom: "2rem" }}>
          Join the EcoSmart Bin community
        </p>

        {error && (
          <div style={{
            color: "#DC2626", background: "#FEF2F2",
            border: "1px solid #FECACA", padding: "0.75rem 1rem",
            borderRadius: "10px", marginBottom: "1.25rem",
            fontSize: "0.85rem", textAlign: "left",
          }}>⚠ {error}</div>
        )}

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <input
            type="email"
            placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Choose a password"
            value={password} onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.9rem",
              background: loading ? "#BAE6FD" : "#06B6D4",
              color: "#FFFFFF", border: "none", borderRadius: "9999px",
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.5rem", fontSize: "0.95rem",
              boxShadow: "0 8px 20px rgba(6,182,212,0.3)",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#64748B" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#10B981", textDecoration: "none", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
