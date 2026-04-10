import { Bell, Wifi, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ title = "Dashboard" }) {
  const navigate = useNavigate();
  let user = {};
  try {
    const raw = localStorage.getItem("ecosmart_user");
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    // catch JSON parsing errors
  }

  const handleLogout = () => {
    localStorage.removeItem("ecosmart_token");
    localStorage.removeItem("ecosmart_user");
    navigate("/login");
  };
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "1rem 1.5rem",
      background: "rgba(2, 6, 23, 0.7)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9" }}>{title}</h1>
        <p style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "9999px", padding: "0.3rem 0.75rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
            boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>LIVE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem",
          fontSize: "0.72rem", color: "#64748b" }}>
          <Wifi size={13} color="#22c55e" /> Connected
        </div>

        {/* Notification bell */}
        <button style={{
          position: "relative", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem",
          padding: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center"
        }}>
          <Bell size={16} color="#94a3b8" />
          <span style={{
            position: "absolute", top: 4, right: 4, width: 7, height: 7,
            borderRadius: "50%", background: "#ef4444",
            boxShadow: "0 0 6px #ef4444"
          }} />
        </button>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #16a34a, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: "0.8rem", color: "#000"
          }}>{user.email ? user.email.charAt(0).toUpperCase() : "A"}</div>
          <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.4rem" }} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
