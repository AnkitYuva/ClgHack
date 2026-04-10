import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Canvas, useFrame } from "@react-three/fiber";

/* ── Haversine distance (km) ─────────────────────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/* ── Nearest-neighbour TSP ───────────────────────────────────── */
function optimizeRoute(depot, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = depot;
  while (remaining.length) {
    let nearest = remaining[0];
    let minDist = haversine(current.lat, current.lng, nearest.lat, nearest.lng);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < minDist) { minDist = d; nearest = remaining[i]; }
    }
    ordered.push(nearest);
    current = nearest;
    remaining.splice(remaining.indexOf(nearest), 1);
  }
  return ordered;
}

/* ── Fetch road route from OSRM (free, no key needed) ───────── */
async function fetchRoadRoute(waypoints) {
  // OSRM expects: lng,lat pairs joined by semicolons
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM error: " + res.status);
  const json = await res.json();
  if (json.code !== "Ok" || !json.routes?.length) throw new Error("No route found");
  const route = json.routes[0];
  // GeoJSON coords are [lng, lat] — convert to [lat, lng] for Leaflet
  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { latlngs, distance: route.distance / 1000, duration: Math.round(route.duration / 60) };
}

/* ── Default depot ───────────────────────────────────────────── */
const DEPOT = { id: "DEPOT", label: "🏭 Collection Depot", lat: 13.0698, lng: 77.5982, isDepot: true };

/* ── Waste type colours ──────────────────────────────────────── */
const WASTE_COLORS = {
  biodegradable: "#22c55e",
  recyclable:    "#06b6d4",
  hazardous:     "#ef4444",
  mixed:         "#f97316",
};

/* ── SVG depot marker ────────────────────────────────────────── */
function makeDepotIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r="19" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" stroke-width="2"/>
      <circle cx="21" cy="21" r="10" fill="#06b6d4" opacity="0.9"/>
      <text x="21" y="26" text-anchor="middle" font-size="13">🏭</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -24] });
}

/* ── SVG pin marker with number ─────────────────────────────── */
function makePinIcon(color, num) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <ellipse cx="16" cy="41" rx="7" ry="3" fill="${color}" opacity="0.2"/>
      <path d="M16 2 C8.3 2 2 8.3 2 16 C2 27 16 42 16 42 C16 42 30 27 30 16 C30 8.3 23.7 2 16 2Z"
            fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="9" fill="rgba(0,0,0,0.25)"/>
      <text x="16" y="21" text-anchor="middle" font-size="11" fill="white"
            font-weight="800" font-family="Inter,sans-serif">${num}</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [32, 44], iconAnchor: [16, 42], popupAnchor: [0, -44] });
}

/* ── Lerp along [lat,lng] path ───────────────────────────────── */
function lerpLatLng(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ── 3D Truck ────────────────────────────────────────────────── */
function Truck3D({ angleRef }) {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = -(angleRef.current ?? 0);
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.03;
  });
  return (
    <group ref={groupRef} scale={1.8}>
      <mesh position={[0, 0.18, 0.15]} castShadow>
        <boxGeometry args={[0.35, 0.28, 0.32]} />
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.25} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.14, -0.18]} castShadow>
        <boxGeometry args={[0.38, 0.22, 0.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      <pointLight color="#22c55e" intensity={5} distance={3} position={[0.1, 0.1, 0.35]} />
      <pointLight color="#22c55e" intensity={5} distance={3} position={[-0.1, 0.1, 0.35]} />
    </group>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function RealRouteMap({ onStatsChange }) {
  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const animRef       = useRef(null);
  const overlayRef    = useRef(null);
  const truckAngleRef = useRef(0);
  const routeLayerRef = useRef(null);
  const markersRef    = useRef([]);

  const [stops,     setStops]     = useState([]);
  const [roadPath,  setRoadPath]  = useState([]); // [lat,lng][] from OSRM
  const [loading,   setLoading]   = useState(false);
  const [routeErr,  setRouteErr]  = useState(null);

  /* ── Init Leaflet ───────────────────────────────────────────── */
  useEffect(() => {
    if (leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [13.0712, 77.5993],
      zoom: 16,
      zoomControl: true,
    });
    leafletMap.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OSM © CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Fixed depot marker
    L.marker([DEPOT.lat, DEPOT.lng], { icon: makeDepotIcon(), zIndexOffset: 9999 })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;background:#0f172a;padding:12px 16px;min-width:170px;border-radius:12px">
          <div style="color:#06b6d4;font-weight:700;font-size:13px">🏭 Collection Depot</div>
          <div style="color:#475569;font-size:11px;margin-top:4px">Truck starts &amp; returns here</div>
        </div>`, { maxWidth: 220, className: "ecosmart-popup" });

    // Click to add pickup location
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setStops(prev => [...prev, {
        id: `STOP-${Date.now()}`,
        lat, lng,
        wasteType: "mixed",
        fillLevel: Math.floor(Math.random() * 40) + 60,
      }]);
    });

    // Popup + zoom styles
    const style = document.createElement("style");
    style.textContent = `
      .ecosmart-popup .leaflet-popup-content-wrapper {
        background:#0f172a;border:1px solid rgba(34,197,94,0.2);
        border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,0.6);padding:0;
      }
      .ecosmart-popup .leaflet-popup-content{margin:0;}
      .ecosmart-popup .leaflet-popup-tip{background:#0f172a;}
      .leaflet-control-zoom a{background:#0f172a!important;color:#22c55e!important;border-color:rgba(34,197,94,0.2)!important;}
      .leaflet-control-zoom a:hover{background:#1e293b!important;}
      .leaflet-control-attribution{background:rgba(2,6,23,0.7)!important;color:#475569!important;font-size:9px;}
      .leaflet-control-attribution a{color:#22c55e!important;}
    `;
    document.head.appendChild(style);

    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  /* ── Re-fetch road route whenever stops change ──────────────── */
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear old markers and polyline
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }

    if (stops.length === 0) {
      setRoadPath([]);
      if (onStatsChange) onStatsChange(null);
      return;
    }

    // Optimise stop order (nearest-neighbour)
    const ordered = optimizeRoute(DEPOT, stops);

    // Draw numbered pin markers
    ordered.forEach((stop, idx) => {
      const color = WASTE_COLORS[stop.wasteType] || "#f97316";
      const marker = L.marker([stop.lat, stop.lng], {
        icon: makePinIcon(color, idx + 1),
        zIndexOffset: 500,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;background:#0f172a;border-radius:12px;overflow:hidden;min-width:190px">
          <div style="background:${color}18;border-bottom:1px solid ${color}30;padding:10px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="color:#f1f5f9;font-weight:700;font-size:13px">Stop #${idx + 1}</span>
              <span style="color:${color};background:${color}20;border:1px solid ${color}40;
                border-radius:9999px;font-size:10px;font-weight:700;padding:2px 8px">${stop.wasteType.toUpperCase()}</span>
            </div>
          </div>
          <div style="padding:10px 14px">
            <div style="font-size:11px;color:#64748b;margin-bottom:6px">${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:4px">
              <span>Fill Level</span><span style="color:${color};font-weight:700">${stop.fillLevel}%</span>
            </div>
            <div style="height:5px;background:#1e293b;border-radius:9999px;overflow:hidden">
              <div style="height:100%;width:${stop.fillLevel}%;background:${color};border-radius:9999px"></div>
            </div>
          </div>
        </div>`, { maxWidth: 240, className: "ecosmart-popup" });

      markersRef.current.push(marker);
    });

    // OSRM road routing: depot → stop1 → … → stopN → depot
    const waypoints = [DEPOT, ...ordered, DEPOT];
    setLoading(true);
    setRouteErr(null);

    fetchRoadRoute(waypoints)
      .then(({ latlngs, distance, duration }) => {
        setRoadPath(latlngs);

        // Draw road-following polylines
        const group = L.layerGroup();
        L.polyline(latlngs, { color: "#22c55e", weight: 12, opacity: 0.07 }).addTo(group); // glow
        L.polyline(latlngs, { color: "#22c55e", weight: 4,  opacity: 0.95, dashArray: "10 6" }).addTo(group);
        group.addTo(map);
        routeLayerRef.current = group;

        // Fit map to road route
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [60, 60] });

        // Stats from OSRM actual road distance
        if (onStatsChange) {
          onStatsChange({
            distance: Math.round(distance * 10) / 10,
            duration,
            fuel:  Math.round(distance * 0.5 * 10) / 10,
            co2:   Math.round(distance * 11.5 * 10) / 10,
            count: ordered.length,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("OSRM road routing failed, falling back to straight lines:", err);
        // Fallback: straight-line polyline
        const coords = [DEPOT, ...ordered, DEPOT].map(p => [p.lat, p.lng]);
        setRoadPath(coords);
        const group = L.layerGroup();
        L.polyline(coords, { color: "#f97316", weight: 10, opacity: 0.07 }).addTo(group);
        L.polyline(coords, { color: "#f97316", weight: 3,  opacity: 0.8, dashArray: "6 5" }).addTo(group);
        group.addTo(map);
        routeLayerRef.current = group;
        map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
        setRouteErr("Road routing unavailable — showing straight-line estimate");
        setLoading(false);

        // Fallback stats
        let dist = 0, prev = DEPOT;
        for (const s of ordered) { dist += haversine(prev.lat, prev.lng, s.lat, s.lng); prev = s; }
        if (onStatsChange) {
          onStatsChange({
            distance: Math.round(dist * 10) / 10,
            duration: Math.round(dist * 9),
            fuel: Math.round(dist * 0.5 * 10) / 10,
            co2:  Math.round(dist * 11.5 * 10) / 10,
            count: ordered.length,
          });
        }
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ── Animate truck along road path ─────────────────────────── */
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (roadPath.length < 2) return;

    let seg = 0, frac = 0;
    const SPEED = 0.002; // slightly faster so long road paths don't feel slow

    function frame() {
      frac += SPEED;
      if (frac >= 1) { frac = 0; seg = (seg + 1) % (roadPath.length - 1); }

      const from = roadPath[seg];
      const to   = roadPath[seg + 1];
      const pos  = lerpLatLng(from, to, frac);

      const map = leafletMap.current;
      if (overlayRef.current && map) {
        const pt    = map.latLngToContainerPoint(pos);
        const pFrom = map.latLngToContainerPoint(from);
        const pTo   = map.latLngToContainerPoint(to);
        const dx = pTo.x - pFrom.x, dy = pTo.y - pFrom.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          truckAngleRef.current = Math.atan2(dy, dx) + Math.PI / 2;
        }
        overlayRef.current.style.transform = `translate(${pt.x}px,${pt.y}px) translate(-50%,-50%)`;
      }
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [roadPath]);

  /* ── Stop management ────────────────────────────────────────── */
  const removeStop  = useCallback((id) => setStops(prev => prev.filter(s => s.id !== id)), []);
  const changeWaste = useCallback((id, type) => setStops(prev => prev.map(s => s.id === id ? { ...s, wasteType: type } : s)), []);
  const clearAll    = useCallback(() => setStops([]), []);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Leaflet canvas */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Click-to-place hint */}
      {stops.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
          background: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.35)",
            borderRadius: "1.25rem", padding: "1.5rem 2.5rem", textAlign: "center",
            boxShadow: "0 0 40px rgba(6,182,212,0.15)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📍</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.35rem" }}>
              Click anywhere on the map
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>to add waste pickup locations</div>
            <div style={{ fontSize: "0.72rem", color: "#06b6d4", marginTop: "0.5rem" }}>
              ✦ Route follows real roads · powered by OpenStreetMap
            </div>
          </div>
        </div>
      )}

      {/* OSRM loading spinner */}
      {loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "rgba(2,6,23,0.88)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(6,182,212,0.3)", borderRadius: "10px",
          padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <div style={{
            width: 14, height: 14, border: "2px solid #06b6d4",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: "0.72rem", color: "#06b6d4", fontWeight: 600 }}>
            Finding road route…
          </span>
        </div>
      )}

      {/* Route error badge */}
      {routeErr && !loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "rgba(2,6,23,0.88)", border: "1px solid rgba(249,115,22,0.3)",
          borderRadius: "10px", padding: "0.45rem 0.75rem",
        }}>
          <span style={{ fontSize: "0.68rem", color: "#f97316" }}>⚠ {routeErr}</span>
        </div>
      )}

      {/* 3D Truck */}
      <div ref={overlayRef} style={{
        position: "absolute", top: 0, left: 0,
        width: 80, height: 80, zIndex: 2000, pointerEvents: "none",
        display: roadPath.length < 2 ? "none" : "block",
      }}>
        <Canvas camera={{ position: [0, 4, 3], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 5, 2]} intensity={2.5} castShadow />
          <Truck3D angleRef={truckAngleRef} />
        </Canvas>
      </div>

      {/* Stop list panel (bottom-left) */}
      {stops.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 3000,
          background: "rgba(2,6,23,0.93)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(6,182,212,0.2)", borderRadius: "14px",
          padding: "0.875rem", width: 240,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9" }}>
              📍 {stops.length} pickup{stops.length > 1 ? "s" : ""}
            </span>
            <button onClick={clearAll} style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", borderRadius: "6px", fontSize: "0.68rem",
              padding: "2px 8px", cursor: "pointer", fontWeight: 600,
            }}>Clear all</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 220, overflowY: "auto" }}>
            {stops.map((stop, idx) => {
              const color = WASTE_COLORS[stop.wasteType] || "#f97316";
              return (
                <div key={stop.id} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "rgba(255,255,255,0.04)", borderRadius: "8px",
                  padding: "0.4rem 0.5rem", border: `1px solid ${color}20`,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", background: color,
                    color: "white", fontSize: "0.6rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <select
                    value={stop.wasteType}
                    onChange={e => changeWaste(stop.id, e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none",
                      color: color, fontSize: "0.68rem", fontWeight: 600,
                      cursor: "pointer", outline: "none",
                    }}
                  >
                    <option value="mixed"         style={{ background: "#0f172a" }}>🔶 Mixed</option>
                    <option value="biodegradable" style={{ background: "#0f172a" }}>🟢 Biodegradable</option>
                    <option value="recyclable"    style={{ background: "#0f172a" }}>🔵 Recyclable</option>
                    <option value="hazardous"     style={{ background: "#0f172a" }}>🔴 Hazardous</option>
                  </select>
                  <button onClick={() => removeStop(stop.id)} style={{
                    background: "none", border: "none", color: "#475569",
                    cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, flexShrink: 0,
                  }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "#334155", textAlign: "center" }}>
            Click map to add more · Route follows real roads
          </div>
        </div>
      )}
    </div>
  );
}
