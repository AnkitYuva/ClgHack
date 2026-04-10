import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [wasteType, setWasteType] = useState("mixed");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("ecosmart_user") || "null");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [13.0712, 77.5993], // Default to campus/city center
      zoom: 15,
    });
    leafletMap.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OSM © CARTO",
    }).addTo(map);

    // Click to drop a pin
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
          <ellipse cx="16" cy="43" rx="7" ry="3" fill="#22c55e" opacity="0.2"/>
          <path d="M16 2 C8 2 2 8 2 16 C2 28 16 44 16 44 C16 44 30 28 30 16 C30 8 24 2 16 2Z" fill="#22c55e" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>`;
        const icon = L.divIcon({ html: svg, className: "", iconSize: [32, 46], iconAnchor: [16, 44] });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      }
    });

    fetchRequests();
    
    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [user, navigate]);

  const fetchRequests = async () => {
    try {
      const res = await api.get(`/requests?user_id=${user.id}`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPickup = async () => {
    if (!selectedLocation) return;
    setSubmitting(true);
    try {
      await api.post("/requests", {
        user_id: user.id,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        waste_type: wasteType
      });
      setSelectedLocation(null);
      if (markerRef.current && leafletMap.current) {
        leafletMap.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      fetchRequests();
    } catch (err) {
      alert("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ecosmart_token");
    localStorage.removeItem("ecosmart_user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#020617", color: "white" }}>
      {/* Sidebar for requesting */}
      <div style={{ width: 380, background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>
        
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#22c55e" }}>Citizen Portal</h1>
          <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Logged in as {user.email}</p>
          <button onClick={logout} style={{ marginTop: "1rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "0.4rem 0.8rem", fontSize: "0.75rem", cursor: "pointer" }}>Log out</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Request Garbage Pickup</h2>
          
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.8rem", color: "#e2e8f0", marginBottom: "1rem" }}>
              1. Click anywhere on the map to mark your location.<br/><br/>
              2. Select waste type.<br/><br/>
              3. Submit your request directly to the municipal routing system.
            </p>

            <select 
              value={wasteType} 
              onChange={e => setWasteType(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "6px", marginBottom: "1rem", outline: "none" }}
            >
              <option value="mixed">Mixed Waste</option>
              <option value="biodegradable">Biodegradable</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazardous">Hazardous</option>
            </select>

            <button 
              onClick={handleRequestPickup}
              disabled={!selectedLocation || submitting}
              style={{ width: "100%", padding: "0.75rem", background: selectedLocation ? "#22c55e" : "#475569", color: "#0f172a", border: "none", borderRadius: "6px", fontWeight: 700, cursor: selectedLocation ? "pointer" : "not-allowed" }}
            >
              {submitting ? "Sending..." : "Submit Pickup Request"}
            </button>
          </div>

          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Your Recent Requests</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {requests.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#64748b" }}>No requests found.</p>
            ) : (
              requests.map(req => (
                <div key={req.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "capitalize" }}>{req.waste_type}</span>
                    <span style={{ 
                      fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                      background: req.status === "Pending" ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)",
                      color: req.status === "Pending" ? "#f97316" : "#22c55e",
                      border: req.status === "Pending" ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(34,197,94,0.3)"
                    }}>
                      {req.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{new Date(req.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {!selectedLocation && (
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(2,6,23,0.8)", border: "1px solid rgba(34,197,94,0.3)", color: "white", padding: "0.5rem 1rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 }}>
            📍 Click on the map to set your pickup location
          </div>
        )}
      </div>
    </div>
  );
}
