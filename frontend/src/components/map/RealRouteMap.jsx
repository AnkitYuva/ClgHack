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

/* ── Nearest-neighbour TSP ────────────────────────────────────── */
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

function calcStats(depot, route) {
  let dist = 0;
  let prev = depot;
  for (const s of route) {
    dist += haversine(prev.lat, prev.lng, s.lat, s.lng);
    prev = s;
  }
  return {
    distance: Math.round(dist * 10) / 10,
    duration: Math.round(dist * 9),
    fuel: Math.round(dist * 0.5 * 10) / 10,
    co2: Math.round(dist * 11.5 * 10) / 10,
  };
}

/* ── Default depot ────────────────────────────────────────────── */
const DEPOT = { id: "DEPOT", label: "🏭 Collection Depot", lat: 13.0698, lng: 77.5982, isDepot: true };

/* ── Waste type colours ───────────────────────────────────────── */
const WASTE_COLORS = {
  biodegradable: "#22c55e",
  recyclable:    "#06b6d4",
  hazardous:     "#ef4444",
  mixed:         "#f97316",
};

/* ── SVG marker factory ───────────────────────────────────────── */
function makeIcon(color, size = 34, label = "", isDepot = false) {
  const inner = isDepot
    ? `<text x="16" y="21" text-anchor="middle" font-size="12" fill="${color}">🏭</text>`
    : `<circle cx="16" cy="16" r="6" fill="${color}"/><circle cx="16" cy="16" r="4" fill="white" opacity="0.9"/>`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 6}" viewBox="0 0 32 38">
      <circle cx="16" cy="16" r="14" fill="${color}22" stroke="${color}" stroke-width="1.8"/>
      ${inner}
      ${label ? `<text x="16" y="34" text-anchor="middle" font-size="9" fill="${color}" font-weight="700" font-family="Inter,sans-serif">${label}</text>` : ""}
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
}

function makePinIcon(color, num) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <ellipse cx="15" cy="39" rx="6" ry="3" fill="${color}" opacity="0.25"/>
      <path d="M15 2 C7.3 2 1 8.3 1 16 C1 26 15 40 15 40 C15 40 29 26 29 16 C29 8.3 22.7 2 15 2Z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <text x="15" y="20" text-anchor="middle" font-size="11" fill="white" font-weight="800"
            font-family="Inter,sans-serif">${num}</text>
    </svg>`;
  return L.divIcon({
    html: svg, className: "",
    iconSize: [30, 42], iconAnchor: [15, 40], popupAnchor: [0, -42],
  });
}

/* ── Lerp ─────────────────────────────────────────────────────── */
function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ── 3D Truck ─────────────────────────────────────────────────── */
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
  const routeLayerRef = useRef(null);  // polyline group
  const markersRef    = useRef([]);    // stop markers

  const [stops,     setStops]     = useState([]); // user-added stops
  const [route,     setRoute]     = useState([]); // optimized order
  const [animRoute, setAnimRoute] = useState([]); // flat [lat,lng] list for truck
  const [zoom,      setZoom]      = useState(16);

  /* ── Init Leaflet ─────────────────────────────────────────────── */
  useEffect(() => {
    if (leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [13.0712, 77.5993],
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
    });
    leafletMap.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OSM © CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Depot marker (fixed)
    L.marker([DEPOT.lat, DEPOT.lng], { icon: makeIcon("#06b6d4", 38, "", true), zIndexOffset: 9999 })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;background:#0f172a;padding:10px 14px;min-width:160px;border-radius:10px">
          <div style="color:#06b6d4;font-weight:700;font-size:13px">🏭 Collection Depot</div>
          <div style="color:#475569;font-size:11px;margin-top:4px">Truck starts & ends here</div>
        </div>`, { maxWidth: 220, className: "ecosmart-popup" });

    // Click to add stop
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const id = `STOP-${Date.now()}`;
      setStops(prev => [...prev, {
        id, lat, lng,
        label: `Stop ${prev.length + 1}`,
        wasteType: "mixed",
        fillLevel: Math.floor(Math.random() * 40) + 60, // 60-99%
      }]);
    });

    map.on("zoom", () => setZoom(map.getZoom()));

    // Popup styles
    const style = document.createElement("style");
    style.textContent = `
      .ecosmart-popup .leaflet-popup-content-wrapper {
        background: #0f172a; border: 1px solid rgba(34,197,94,0.2);
        border-radius: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); padding: 0;
      }
      .ecosmart-popup .leaflet-popup-content { margin: 0; }
      .ecosmart-popup .leaflet-popup-tip { background: #0f172a; }
      .leaflet-control-zoom a { background:#0f172a!important;color:#22c55e!important;border-color:rgba(34,197,94,0.2)!important; }
      .leaflet-control-zoom a:hover { background:#1e293b!important; }
      .leaflet-control-attribution { background:rgba(2,6,23,0.7)!important;color:#475569!important;font-size:9px; }
      .leaflet-control-attribution a { color:#22c55e!important; }
      .click-hint { pointer-events:none; }
    `;
    document.head.appendChild(style);

    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  /* ── Re-draw markers + route when stops change ─────────────────── */
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Remove old route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (stops.length === 0) {
      setRoute([]);
      setAnimRoute([]);
      if (onStatsChange) onStatsChange(null);
      return;
    }

    // Compute optimized order
    const ordered = optimizeRoute(DEPOT, stops);
    setRoute(ordered);

    // Build full route coords: depot → stop1 → … → depot
    const coords = [
      [DEPOT.lat, DEPOT.lng],
      ...ordered.map(s => [s.lat, s.lng]),
      [DEPOT.lat, DEPOT.lng],
    ];
    setAnimRoute(coords);

    // Stats
    if (onStatsChange) {
      const stats = calcStats(DEPOT, ordered);
      onStatsChange({ ...stats, count: ordered.length });
    }

    // Draw polylines
    const group = L.layerGroup();
    L.polyline(coords, { color: "#22c55e", weight: 10, opacity: 0.07 }).addTo(group);
    L.polyline(coords, { color: "#22c55e", weight: 3, opacity: 0.9, dashArray: "8 6" }).addTo(group);
    group.addTo(map);
    routeLayerRef.current = group;

    // Draw pin markers in optimized order
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

    // Fit bounds
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [60, 60] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ── Animate truck along route ────────────────────────────────── */
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (animRoute.length < 2) return;

    let seg = 0, frac = 0;
    const SPEED = 0.0012;

    function frame() {
      frac += SPEED;
      if (frac >= 1) { frac = 0; seg = (seg + 1) % (animRoute.length - 1); }

      const from = animRoute[seg];
      const to   = animRoute[seg + 1];
      const pos  = lerp(from, to, frac);

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
  }, [animRoute]);

  /* ── Remove a stop ────────────────────────────────────────────── */
  const removeStop = useCallback((id) => {
    setStops(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, label: `Stop ${i + 1}` })));
  }, []);

  /* ── Change waste type ────────────────────────────────────────── */
  const changeWasteType = useCallback((id, type) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, wasteType: type } : s));
  }, []);

  /* ── Clear all ────────────────────────────────────────────────── */
  const clearAll = useCallback(() => setStops([]), []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Leaflet map canvas */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Click hint overlay — shown only when no stops placed */}
      {stops.length === 0 && (
        <div className="click-hint" style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 1000,
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
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              to add waste pickup locations
            </div>
            <div style={{ fontSize: "0.72rem", color: "#06b6d4", marginTop: "0.5rem" }}>
              ✦ Route auto-optimizes after each pin
            </div>
          </div>
        </div>
      )}

      {/* 3D truck overlay */}
      <div ref={overlayRef} style={{
        position: "absolute", top: 0, left: 0,
        width: 80, height: 80, zIndex: 2000, pointerEvents: "none",
        display: animRoute.length < 2 ? "none" : "block",
      }}>
        <Canvas camera={{ position: [0, 4, 3], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 5, 2]} intensity={2.5} castShadow />
          <Truck3D angleRef={truckAngleRef} />
        </Canvas>
      </div>

      {/* Controls panel (bottom-left) */}
      {stops.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 3000,
          background: "rgba(2,6,23,0.92)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(6,182,212,0.2)", borderRadius: "14px",
          padding: "0.875rem", width: 230,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9" }}>
              📍 {stops.length} pickup{stops.length > 1 ? "s" : ""} added
            </span>
            <button onClick={clearAll} style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", borderRadius: "6px", fontSize: "0.68rem",
              padding: "2px 8px", cursor: "pointer", fontWeight: 600,
            }}>Clear all</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: 210, overflowY: "auto" }}>
            {route.map((stop, idx) => {
              const color = WASTE_COLORS[stop.wasteType] || "#f97316";
              return (
                <div key={stop.id} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.4rem 0.5rem",
                  border: `1px solid ${color}20`,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", background: color,
                    color: "white", fontSize: "0.6rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <select
                    value={stop.wasteType}
                    onChange={e => changeWasteType(stop.id, e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none", color: color,
                      fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", outline: "none",
                    }}
                  >
                    <option value="mixed" style={{ background: "#0f172a" }}>🔶 Mixed</option>
                    <option value="biodegradable" style={{ background: "#0f172a" }}>🟢 Biodegradable</option>
                    <option value="recyclable" style={{ background: "#0f172a" }}>🔵 Recyclable</option>
                    <option value="hazardous" style={{ background: "#0f172a" }}>🔴 Hazardous</option>
                  </select>
                  <button onClick={() => removeStop(stop.id)} style={{
                    background: "none", border: "none", color: "#475569",
                    cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, flexShrink: 0,
                  }}>✕</button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "0.625rem", fontSize: "0.65rem", color: "#475569", textAlign: "center" }}>
            Click map to add more locations
          </div>
        </div>
      )}
    </div>
  );
}
