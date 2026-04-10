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
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const userStr = localStorage.getItem("ecosmart_user");
  const user = userStr ? JSON.parse(userStr) : null;

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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
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
    // HTML5 Geolocation to auto-center and place pin
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (!leafletMap.current) return;
          leafletMap.current.setView([lat, lng], 16);
          setSelectedLocation({ lat, lng });

          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
            <ellipse cx="16" cy="43" rx="7" ry="3" fill="#22c55e" opacity="0.2"/>
            <path d="M16 2 C8 2 2 8 2 16 C2 28 16 44 16 44 C16 44 30 28 30 16 C30 8 24 2 16 2Z" fill="#22c55e" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>`;
          const icon = L.divIcon({ html: svg, className: "", iconSize: [32, 46], iconAnchor: [16, 44] });
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon }).addTo(leafletMap.current);
          }
        },
        (error) => {
          console.log("Geolocation error:", error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    fetchRequests();
    
    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [userStr, navigate]);

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
      if (imageFile) {
        const formData = new FormData();
        formData.append("user_id", user.id);
        formData.append("lat", selectedLocation.lat);
        formData.append("lng", selectedLocation.lng);
        formData.append("waste_type", wasteType);
        formData.append("image", imageFile);
        
        await api.post("/requests", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post("/requests", {
          user_id: user.id,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          waste_type: wasteType
        });
      }
      
      setSelectedLocation(null);
      setImageFile(null);
      // reset file input visually if needed
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

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
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
      {/* Sidebar for requesting */}
      <div style={{ width: 380, background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.03)", zIndex: 10 }}>
        
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #E2E8F0" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#10B981" }}>Citizen Portal</h1>
          <p style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.25rem" }}>Logged in as {user.email}</p>
          <button onClick={logout} style={{ marginTop: "1rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "0.4rem 0.8rem", fontSize: "0.75rem", cursor: "pointer" }}>Log out</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Request Garbage Pickup</h2>
          
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "1rem", lineHeight: "1.5" }}>
              1. <b>Auto-Location:</b> We'll try to find you automatically.<br/>
              2. <b>Manual Override:</b> Alternatively, click anywhere on the map to pinpoint your garbage location.<br/>
              3. Select waste type and submit your request directly to the routing system.
            </p>

            <select 
              value={wasteType} 
              onChange={e => setWasteType(e.target.value)}
              style={{ width: "100%", padding: "0.8rem", background: "#FFFFFF", border: "1px solid #CBD5E1", color: "#0F172A", borderRadius: "8px", marginBottom: "1rem", outline: "none", fontWeight: 500 }}
            >
              <option value="mixed">Auto/Mixed (AI Analyzes Photo)</option>
              <option value="biodegradable">Biodegradable</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazardous">Hazardous</option>
            </select>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.4rem", color: "#475569" }}>
                📸 Upload Garbage Photo (Optional)
              </span>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => e.target.files[0] && setImageFile(e.target.files[0])}
                style={{ fontSize: "0.8rem", width: "100%", padding: "0.5rem", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", cursor: "pointer" }}
              />
            </label>

            <button 
              onClick={handleRequestPickup}
              disabled={!selectedLocation || submitting}
              style={{ width: "100%", padding: "0.85rem", background: selectedLocation ? "#10B981" : "#E2E8F0", color: selectedLocation ? "#FFFFFF" : "#94A3B8", border: "none", borderRadius: "9999px", fontWeight: 700, cursor: selectedLocation ? "pointer" : "not-allowed", transition: "all 0.2s" }}
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
                <div key={req.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "1rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "capitalize", color: "#1E293B" }}>{req.waste_type}</span>
                    <span style={{ 
                      fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px",
                      background: req.status === "Pending" ? "rgba(249,115,22,0.1)" : "rgba(16,185,129,0.1)",
                      color: req.status === "Pending" ? "#F97316" : "#10B981",
                      border: req.status === "Pending" ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(16,185,129,0.2)"
                    }}>
                      {req.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 500 }}>{new Date(req.timestamp).toLocaleString()}</div>
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
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0F172A", padding: "0.75rem 1.25rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}>
            <span style={{ animation: "spin 2s linear infinite", display: "inline-block" }}>⏳</span> Fetching GPS... or click map to manually plot
          </div>
        )}
      </div>
    </div>
  );
}
