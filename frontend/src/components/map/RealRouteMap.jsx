import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Canvas, useFrame } from "@react-three/fiber";

/* ════════════════════════════════════════════════════════════════
   MATH UTILITIES
════════════════════════════════════════════════════════════════ */
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

/* Nearest-neighbour seed */
function nearestNeighbour(depot, stops) {
  const remaining = [...stops];
  const ordered = [];
  let cur = depot;
  while (remaining.length) {
    let best = remaining[0];
    let bestD = haversine(cur.lat, cur.lng, best.lat, best.lng);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestD) { bestD = d; best = remaining[i]; }
    }
    ordered.push(best);
    cur = best;
    remaining.splice(remaining.indexOf(best), 1);
  }
  return ordered;
}

/* 2-opt improvement — swaps pairs of edges until no improvement */
function twoOpt(stops) {
  if (stops.length < 4) return stops;
  let route = [...stops];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const before =
          haversine(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng) +
          haversine(route[j].lat, route[j].lng, route[(j + 1) % route.length]?.lat ?? route[0].lat,
                                                  route[(j + 1) % route.length]?.lng ?? route[0].lng);
        const after =
          haversine(route[i].lat, route[i].lng, route[j].lat, route[j].lng) +
          haversine(route[i + 1].lat, route[i + 1].lng, route[(j + 1) % route.length]?.lat ?? route[0].lat,
                                                          route[(j + 1) % route.length]?.lng ?? route[0].lng);
        if (after < before - 0.0001) {
          route = [...route.slice(0, i + 1), ...route.slice(i + 1, j + 1).reverse(), ...route.slice(j + 1)];
          improved = true;
        }
      }
    }
  }
  return route;
}

function routeDistance(depot, stops) {
  let dist = 0, prev = depot;
  for (const s of stops) { dist += haversine(prev.lat, prev.lng, s.lat, s.lng); prev = s; }
  dist += haversine(prev.lat, prev.lng, depot.lat, depot.lng);
  return dist;
}

/* ════════════════════════════════════════════════════════════════
   OSRM API CALLS
════════════════════════════════════════════════════════════════ */
const OSRM = "https://router.project-osrm.org";

/**
 * OSRM /trip — full TSP optimization on real roads.
 * source=first locks the depot as start; roundtrip=true returns to it.
 */
async function osrmTrip(waypoints) {
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/trip/v1/driving/${coords}?roundtrip=true&source=first&overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM trip error " + res.status);
  const json = await res.json();
  if (json.code !== "Ok") throw new Error(json.message || "OSRM trip failed");

  const trip = json.trips[0];
  // Waypoint indices tell us the optimal visit order OSRM found
  const orderedIndices = json.waypoints
    .slice(1)                          // skip depot (index 0)
    .sort((a, b) => a.trips_index !== b.trips_index
      ? a.trips_index - b.trips_index
      : a.waypoint_index - b.waypoint_index)
    .map(w => w.waypoint_index - 1);  // -1 because depot was index 0

  const latlngs = trip.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return {
    latlngs,
    distance: trip.distance / 1000,
    duration: Math.round(trip.duration / 60),
    orderedIndices,
  };
}

/**
 * OSRM /route — get road geometry for a fixed waypoint sequence.
 */
async function osrmRoute(waypoints) {
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM route error " + res.status);
  const json = await res.json();
  if (json.code !== "Ok") throw new Error(json.message || "OSRM route failed");
  const route = json.routes[0];
  return {
    latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance / 1000,
    duration: Math.round(route.duration / 60),
  };
}

/* Debounce helper */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
════════════════════════════════════════════════════════════════ */
const DEPOT = { id: "DEPOT", lat: 13.0698, lng: 77.5982 };

const WASTE_COLORS = {
  biodegradable: "#22c55e",
  recyclable:    "#06b6d4",
  hazardous:     "#ef4444",
  mixed:         "#f97316",
};

function makeDepotIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" stroke-width="2"/>
    <circle cx="22" cy="22" r="11" fill="#06b6d4" opacity="0.9"/>
    <text x="22" y="27" text-anchor="middle" font-size="13">🏭</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -26] });
}

function makePinIcon(color, num) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
    <ellipse cx="16" cy="43" rx="7" ry="3" fill="${color}" opacity="0.2"/>
    <path d="M16 2 C8 2 2 8 2 16 C2 28 16 44 16 44 C16 44 30 28 30 16 C30 8 24 2 16 2Z"
          fill="${color}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="9" fill="rgba(0,0,0,0.25)"/>
    <text x="16" y="21" text-anchor="middle" font-size="11" fill="white"
          font-weight="800" font-family="Inter,sans-serif">${num}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [32, 46], iconAnchor: [16, 44], popupAnchor: [0, -46] });
}

function lerpLatLng(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ════════════════════════════════════════════════════════════════
   3D TRUCK
════════════════════════════════════════════════════════════════ */
function Truck3D({ angleRef }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = -(angleRef.current ?? 0);
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.03;
  });
  return (
    <group ref={ref} scale={1.8}>
      <mesh position={[0, 0.18, 0.15]}>
        <boxGeometry args={[0.35, 0.28, 0.32]} />
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.3} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0.14, -0.18]}>
        <boxGeometry args={[0.38, 0.22, 0.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      <pointLight color="#22c55e" intensity={6} distance={3} position={[0.1, 0.1, 0.35]} />
      <pointLight color="#22c55e" intensity={6} distance={3} position={[-0.1, 0.1, 0.35]} />
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
  const truckAngle    = useRef(0);
  const routeLayer    = useRef(null);
  const pinMarkers    = useRef([]);
  const debouncedRef  = useRef(null);

  const [stops,        setStops]        = useState([]);
  const [roadPath,     setRoadPath]     = useState([]);
  const [orderedStops, setOrderedStops] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [routeErr,     setRouteErr]     = useState(null);
  const [savings,      setSavings]      = useState(null); // { pct, naiveKm, optimKm }

  /* ── Init map ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (leafletMap.current) return;
    const map = L.map(mapRef.current, { center: [13.0712, 77.5993], zoom: 16 });
    leafletMap.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OSM © CARTO", subdomains: "abcd", maxZoom: 20,
    }).addTo(map);

    L.marker([DEPOT.lat, DEPOT.lng], { icon: makeDepotIcon(), zIndexOffset: 9999 })
      .addTo(map)
      .bindPopup(`<div style="font-family:Inter,sans-serif;background:#0f172a;padding:12px 16px;border-radius:12px;min-width:170px">
        <div style="color:#06b6d4;font-weight:700;font-size:13px">🏭 Collection Depot</div>
        <div style="color:#475569;font-size:11px;margin-top:4px">Truck starts &amp; returns here</div>
      </div>`, { maxWidth: 220, className: "ecosmart-popup" });

    map.on("click", ({ latlng: { lat, lng } }) => {
      setStops(prev => [...prev, {
        id: `S-${Date.now()}`,
        lat, lng,
        wasteType: "mixed",
        fillLevel: Math.floor(Math.random() * 40) + 60,
      }]);
    });

    const style = document.createElement("style");
    style.textContent = `
      .ecosmart-popup .leaflet-popup-content-wrapper{background:#0f172a;border:1px solid rgba(34,197,94,0.2);border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,0.6);padding:0;}
      .ecosmart-popup .leaflet-popup-content{margin:0;}
      .ecosmart-popup .leaflet-popup-tip{background:#0f172a;}
      .leaflet-control-zoom a{background:#0f172a!important;color:#22c55e!important;border-color:rgba(34,197,94,0.2)!important;}
      .leaflet-control-zoom a:hover{background:#1e293b!important;}
      .leaflet-control-attribution{background:rgba(2,6,23,0.7)!important;color:#475569!important;font-size:9px;}
      .leaflet-control-attribution a{color:#22c55e!important;}
      @keyframes spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);

    return () => { cancelAnimationFrame(animRef.current); map.remove(); leafletMap.current = null; };
  }, []);

  /* ── Core routing logic ───────────────────────────────────────── */
  const runRouting = useCallback(async (currentStops) => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear old pins & polyline
    pinMarkers.current.forEach(m => map.removeLayer(m));
    pinMarkers.current = [];
    if (routeLayer.current) { map.removeLayer(routeLayer.current); routeLayer.current = null; }

    if (currentStops.length === 0) {
      setRoadPath([]); setOrderedStops([]); setSavings(null);
      if (onStatsChange) onStatsChange(null);
      return;
    }

    setLoading(true); setRouteErr(null);

    try {
      // === Step 1: OSRM /trip for TSP-optimal order on real roads ===
      const waypoints = [DEPOT, ...currentStops];
      let ordered, latlngs, distance, duration;

      try {
        const result = await osrmTrip(waypoints);
        latlngs  = result.latlngs;
        distance = result.distance;
        duration = result.duration;
        // Re-order stops according to OSRM's optimal sequence
        ordered = result.orderedIndices.map(i => currentStops[i]).filter(Boolean);
        if (ordered.length !== currentStops.length) ordered = currentStops; // safety fallback
      } catch (tripErr) {
        console.warn("OSRM /trip failed, using 2-opt + /route fallback:", tripErr.message);
        // === Fallback: nearest-neighbour + 2-opt, then get road geometry ===
        const nn = nearestNeighbour(DEPOT, currentStops);
        ordered  = twoOpt(nn);
        const fallbackWaypoints = [DEPOT, ...ordered, DEPOT];
        try {
          const r = await osrmRoute(fallbackWaypoints);
          latlngs = r.latlngs; distance = r.distance; duration = r.duration;
        } catch {
          // Straight-line fallback
          latlngs = fallbackWaypoints.map(p => [p.lat, p.lng]);
          distance = routeDistance(DEPOT, ordered);
          duration = Math.round(distance * 9);
          setRouteErr("Road data unavailable — showing estimated route");
        }
      }

      // === Step 2: Compute savings vs naive (sequential) order ===
      const naiveDist  = routeDistance(DEPOT, currentStops);          // unoptimized: user's click order
      const optimDist  = distance;
      const savedPct   = naiveDist > 0 ? Math.round((1 - optimDist / naiveDist) * 100) : 0;
      setSavings({ pct: savedPct, naiveKm: Math.round(naiveDist * 10) / 10, optimKm: Math.round(optimDist * 10) / 10 });

      setOrderedStops(ordered);
      setRoadPath(latlngs);

      // === Step 3: Draw polylines ===
      const group = L.layerGroup();
      L.polyline(latlngs, { color: "#22c55e", weight: 14, opacity: 0.06 }).addTo(group); // outer glow
      L.polyline(latlngs, { color: "#22c55e", weight: 5,  opacity: 1,    dashArray: "10 6" }).addTo(group); // road line
      // Direction arrows every ~20 points
      for (let i = 10; i < latlngs.length - 1; i += 20) {
        const from = latlngs[i], to = latlngs[Math.min(i + 1, latlngs.length - 1)];
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
        L.marker(from, {
          icon: L.divIcon({
            html: `<div style="transform:rotate(${angle}deg);color:#22c55e;font-size:12px;line-height:1">▶</div>`,
            className: "", iconSize: [12, 12], iconAnchor: [6, 6],
          }),
          interactive: false, zIndexOffset: -100,
        }).addTo(group);
      }
      group.addTo(map);
      routeLayer.current = group;

      // === Step 4: Draw ordered pin markers ===
      ordered.forEach((stop, idx) => {
        const color = WASTE_COLORS[stop.wasteType] || "#f97316";
        const m = L.marker([stop.lat, stop.lng], { icon: makePinIcon(color, idx + 1), zIndexOffset: 500 }).addTo(map);
        m.bindPopup(`
          <div style="font-family:Inter,sans-serif;background:#0f172a;border-radius:12px;overflow:hidden;min-width:195px">
            <div style="background:${color}18;border-bottom:1px solid ${color}30;padding:10px 14px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="color:#f1f5f9;font-weight:700;font-size:13px">Stop #${idx + 1}</span>
                <span style="color:${color};background:${color}20;border:1px solid ${color}40;border-radius:9999px;font-size:10px;font-weight:700;padding:2px 8px">${stop.wasteType.toUpperCase()}</span>
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
        pinMarkers.current.push(m);
      });

      // Fit map to road path
      if (latlngs.length > 0) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
      }

      // Emit stats
      if (onStatsChange) {
        onStatsChange({
          distance: Math.round(optimDist * 10) / 10,
          duration,
          fuel:  Math.round(optimDist * 0.5 * 10) / 10,
          co2:   Math.round(optimDist * 11.5 * 10) / 10,
          count: ordered.length,
        });
      }
    } catch (err) {
      console.error("Routing failed:", err);
      setRouteErr("Routing error — try again");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStatsChange]);

  /* ── Debounced trigger whenever stops change (500 ms) ─────────── */
  useEffect(() => {
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(() => runRouting(stops), 500);
    return () => clearTimeout(debouncedRef.current);
  }, [stops, runRouting]);

  /* ── Truck animation ──────────────────────────────────────────── */
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (roadPath.length < 2) return;
    let seg = 0, frac = 0;
    const SPEED = 0.002;
    function frame() {
      frac += SPEED;
      if (frac >= 1) { frac = 0; seg = (seg + 1) % (roadPath.length - 1); }
      const from = roadPath[seg], to = roadPath[seg + 1];
      const pos = lerpLatLng(from, to, frac);
      const map = leafletMap.current;
      if (overlayRef.current && map) {
        const pt = map.latLngToContainerPoint(pos);
        const pF = map.latLngToContainerPoint(from);
        const pT = map.latLngToContainerPoint(to);
        const dx = pT.x - pF.x, dy = pT.y - pF.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1)
          truckAngle.current = Math.atan2(dy, dx) + Math.PI / 2;
        overlayRef.current.style.transform = `translate(${pt.x}px,${pt.y}px) translate(-50%,-50%)`;
      }
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [roadPath]);

  /* ── Stop controls ────────────────────────────────────────────── */
  const removeStop  = useCallback((id) => setStops(p => p.filter(s => s.id !== id)), []);
  const changeWaste = useCallback((id, t) => setStops(p => p.map(s => s.id === id ? { ...s, wasteType: t } : s)), []);
  const clearAll    = useCallback(() => setStops([]), []);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Empty state hint */}
      {stops.length === 0 && !loading && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
          background: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)", pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: "1.25rem", padding: "1.5rem 2.5rem", textAlign: "center",
            boxShadow: "0 0 40px rgba(6,182,212,0.12)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📍</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.35rem" }}>
              Click anywhere on the map
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>to add waste pickup locations</div>
            <div style={{ fontSize: "0.72rem", color: "#06b6d4", marginTop: "0.5rem" }}>
              ✦ TSP-optimized · Real roads · Powered by OSRM
            </div>
          </div>
        </div>
      )}

      {/* Loading / error badges */}
      {loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "rgba(2,6,23,0.9)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(6,182,212,0.3)", borderRadius: "10px",
          padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <div style={{
            width: 13, height: 13, border: "2px solid #06b6d4",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: "0.72rem", color: "#06b6d4", fontWeight: 600 }}>Optimizing route…</span>
        </div>
      )}
      {routeErr && !loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "rgba(2,6,23,0.88)", border: "1px solid rgba(249,115,22,0.3)",
          borderRadius: "10px", padding: "0.45rem 0.75rem",
        }}>
          <span style={{ fontSize: "0.68rem", color: "#f97316" }}>⚠ {routeErr}</span>
        </div>
      )}

      {/* Savings badge (top-left of map) */}
      {savings && savings.pct > 0 && !loading && (
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 3000,
          background: "rgba(2,6,23,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px",
          padding: "0.6rem 0.875rem",
          boxShadow: "0 0 20px rgba(34,197,94,0.1)",
        }}>
          <div style={{ fontSize: "0.65rem", color: "#64748b", marginBottom: "2px" }}>Route optimized</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#22c55e" }}>{savings.pct}%</span>
            <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>shorter</span>
          </div>
          <div style={{ fontSize: "0.63rem", color: "#475569", marginTop: "2px" }}>
            {savings.naiveKm} km → {savings.optimKm} km
          </div>
        </div>
      )}

      {/* 3D Truck overlay */}
      <div ref={overlayRef} style={{
        position: "absolute", top: 0, left: 0,
        width: 80, height: 80, zIndex: 2000, pointerEvents: "none",
        display: roadPath.length < 2 ? "none" : "block",
      }}>
        <Canvas camera={{ position: [0, 4, 3], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 5, 2]} intensity={2.5} castShadow />
          <Truck3D angleRef={truckAngle} />
        </Canvas>
      </div>

      {/* Stop list panel */}
      {stops.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 3000,
          background: "rgba(2,6,23,0.93)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(6,182,212,0.18)", borderRadius: "14px",
          padding: "0.875rem", width: 248,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9" }}>
              📍 {stops.length} pickup{stops.length > 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.63rem", color: "#22c55e", background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)", borderRadius: "5px", padding: "2px 6px", fontWeight: 600 }}>
                TSP ✓
              </span>
              <button onClick={clearAll} style={{
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444", borderRadius: "5px", fontSize: "0.65rem",
                padding: "2px 7px", cursor: "pointer", fontWeight: 600,
              }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 200, overflowY: "auto" }}>
            {(orderedStops.length > 0 ? orderedStops : stops).map((stop, idx) => {
              const color = WASTE_COLORS[stop.wasteType] || "#f97316";
              return (
                <div key={stop.id} style={{
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  background: "rgba(255,255,255,0.04)", borderRadius: "8px",
                  padding: "0.4rem 0.5rem", border: `1px solid ${color}20`,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", background: color,
                    color: "white", fontSize: "0.6rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <select value={stop.wasteType} onChange={e => changeWaste(stop.id, e.target.value)}
                    style={{ flex: 1, background: "transparent", border: "none", color, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer", outline: "none" }}>
                    <option value="mixed"         style={{ background: "#0f172a" }}>🔶 Mixed</option>
                    <option value="biodegradable" style={{ background: "#0f172a" }}>🟢 Biodegradable</option>
                    <option value="recyclable"    style={{ background: "#0f172a" }}>🔵 Recyclable</option>
                    <option value="hazardous"     style={{ background: "#0f172a" }}>🔴 Hazardous</option>
                  </select>
                  <button onClick={() => removeStop(stop.id)}
                    style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.63rem", color: "#334155", textAlign: "center" }}>
            Click map to add · Route auto-optimizes in 0.5s
          </div>
        </div>
      )}
    </div>
  );
}
