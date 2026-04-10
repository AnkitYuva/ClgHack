import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/register", { email, password });
      if (res.data.success) {
        localStorage.setItem("ecosmart_token", res.data.token);
        localStorage.setItem("ecosmart_user", JSON.stringify(res.data.user));
        navigate("/user-dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020617" }}>
      <div style={{ width: 400, padding: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", backdropFilter: "blur(10px)", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.5rem" }}>Create Account</h2>
        <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "2rem" }}>Join the EcoSmart Bin community</p>
        
        {error && <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "0.5rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}
        
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#f1f5f9", outline: "none" }}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#f1f5f9", outline: "none" }}
            required 
          />
          <button type="submit" style={{ width: "100%", padding: "0.75rem", background: "#06b6d4", color: "#0f172a", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer", marginTop: "0.5rem" }}>
            Sign Up
          </button>
        </form>
        
        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#64748b" }}>
          Already have an account? <Link to="/login" style={{ color: "#06b6d4", textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
