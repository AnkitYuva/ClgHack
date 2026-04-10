import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import api from "../../services/api";

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
  const { scene } = useGLTF("/garbage_truck.glb");

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = -(angleRef.current ?? 0);
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.025;
  });

  return (
    <group ref={ref} scale={0.55} position={[0, -0.5, 0]}>
      <primitive object={scene} />
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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OSM © CARTO", subdomains: "abcd", maxZoom: 20,
    }).addTo(map);

    L.marker([DEPOT.lat, DEPOT.lng], { icon: makeDepotIcon(), zIndexOffset: 9999 })
      .addTo(map)
      .bindPopup(`<div style="font-family:Inter,sans-serif;background:#FFFFFF;padding:12px 16px;border-radius:12px;min-width:170px;box-shadow:0 8px 24px rgba(0,0,0,0.1)">
        <div style="color:#0284C7;font-weight:700;font-size:13px">🏭 Collection Depot</div>
        <div style="color:#64748B;font-size:11px;margin-top:4px">Truck starts &amp; returns here</div>
      </div>`, { maxWidth: 220, className: "ecosmart-popup" });

    const fetchRequests = async () => {
      try {
        const res = await api.get("/requests");
        const newStops = res.data.map(r => ({
          id: r.id,
          user_email: r.user_email,
          lat: r.lat,
          lng: r.lng,
          wasteType: r.waste_type,
          fillLevel: r.fill_level || 100,
          timestamp: r.timestamp,
          image_path: r.image_path
        }));
        setStops(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newStops)) {
            return prev; // Keeps the exact same reference, avoiding re-renders
          }
          return newStops;
        });
      } catch (err) {
        console.error("Failed to fetch requests", err);
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 5000); // Poll every 5s

    const style = document.createElement("style");
    style.textContent = `
      .ecosmart-popup .leaflet-popup-content-wrapper{background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.1);padding:0;}
      .ecosmart-popup .leaflet-popup-content{margin:0;}
      .ecosmart-popup .leaflet-popup-tip{background:#FFFFFF;}
      .leaflet-control-zoom a{background:#FFFFFF!important;color:#10B981!important;border-color:#E2E8F0!important;}
      .leaflet-control-zoom a:hover{background:#F1F5F9!important;}
      .leaflet-control-attribution{background:rgba(255,255,255,0.85)!important;color:#94A3B8!important;font-size:9px;}
      .leaflet-control-attribution a{color:#10B981!important;}
      @keyframes spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);

    return () => { 
      clearInterval(interval);
      cancelAnimationFrame(animRef.current); 
      map.remove(); 
      leafletMap.current = null; 
    };
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
        const imageHtml = stop.image_path 
          ? `<div style="padding:10px 14px 0"><img src="http://127.0.0.1:5000/${stop.image_path}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,0.05)" alt="Garbage Photo"/></div>` 
          : '';
          
        const m = L.marker([stop.lat, stop.lng], { icon: makePinIcon(color, idx + 1), zIndexOffset: 500 }).addTo(map);
        m.bindPopup(`
          <div style="font-family:Inter,sans-serif;background:#FFFFFF;border-radius:12px;overflow:hidden;min-width:210px">
            <div style="background:${color}15;border-bottom:1px solid ${color}25;padding:10px 14px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="color:#1E293B;font-weight:700;font-size:13px">Stop #${idx + 1}</span>
                <span style="color:${color};background:${color}15;border:1px solid ${color}30;border-radius:9999px;font-size:10px;font-weight:700;padding:2px 8px">${stop.wasteType.toUpperCase()}</span>
              </div>
            </div>
            ${imageHtml}
            <div style="padding:10px 14px">
              <div style="font-size:11px;color:#475569;margin-bottom:2px">Requested by: <b style="color:#0F172A">${stop.user_email}</b></div>
              <div style="font-size:10px;color:#94A3B8;margin-bottom:6px">${new Date(stop.timestamp).toLocaleTimeString()}</div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:4px">
                <span>Fill Level</span><span style="color:${color};font-weight:700">${stop.fillLevel}%</span>
              </div>
              <div style="height:5px;background:#E2E8F0;border-radius:9999px;overflow:hidden">
                <div style="height:100%;width:${stop.fillLevel}%;background:${color};border-radius:9999px"></div>
              </div>
            </div>
          </div>`,   { maxWidth: 240, className: "ecosmart-popup" });
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
  const markCollected = useCallback(async (id) => {
    try {
      await api.put(`/requests/${id}/collect`);
      setStops(p => p.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Empty state hint */}
      {stops.length === 0 && !loading && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
          background: "rgba(248,250,252,0.7)", backdropFilter: "blur(3px)", pointerEvents: "none",
        }}>
          <div style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "1.25rem", padding: "1.5rem 2.5rem", textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📍</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F172A", marginBottom: "0.35rem" }}>
              No Pending Requests
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748B" }}>Waiting for citizens to request pickup</div>
            <div style={{ fontSize: "0.72rem", color: "#10B981", marginTop: "0.5rem", fontWeight: 600 }}>
              ✦ TSP-optimized · Real roads · Powered by OSRM
            </div>
          </div>
        </div>
      )}

      {/* Loading / error badges */}
      {loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "#FFFFFF", border: "1px solid #E2E8F0",
          borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <div style={{
            width: 13, height: 13, border: "2px solid #10B981",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600 }}>Optimizing route…</span>
        </div>
      )}
      {routeErr && !loading && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 3000,
          background: "#FFF7ED", border: "1px solid #FED7AA",
          borderRadius: "10px", padding: "0.45rem 0.75rem",
        }}>
          <span style={{ fontSize: "0.68rem", color: "#F97316" }}>⚠ {routeErr}</span>
        </div>
      )}

      {/* Savings badge (top-left of map) */}
      {savings && savings.pct > 0 && !loading && (
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 3000,
          background: "#FFFFFF", border: "1px solid #D1FAE5",
          borderRadius: "12px", padding: "0.6rem 0.875rem",
          boxShadow: "0 4px 16px rgba(16,185,129,0.15)",
        }}>
          <div style={{ fontSize: "0.65rem", color: "#64748B", marginBottom: "2px", fontWeight: 600 }}>Route optimized</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#10B981" }}>{savings.pct}%</span>
            <span style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 600 }}>shorter</span>
          </div>
          <div style={{ fontSize: "0.63rem", color: "#64748B", marginTop: "2px" }}>
            {savings.naiveKm} km → {savings.optimKm} km
          </div>
        </div>
      )}

      {/* 3D Truck overlay */}
      <div ref={overlayRef} style={{
        position: "absolute", top: 0, left: 0,
        width: 120, height: 120, zIndex: 2000, pointerEvents: "none",
        display: roadPath.length < 2 ? "none" : "block",
      }}>
        <Canvas
          camera={{ position: [0, 3.5, 4], fov: 45 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={2.5} />
          <directionalLight position={[5, 10, 5]} intensity={3} />
          <directionalLight position={[-5, 5, -5]} intensity={1.5} />
          <Suspense fallback={null}>
            <Truck3D angleRef={truckAngle} />
          </Suspense>
        </Canvas>
      </div>

      {/* Stop list panel */}
      {stops.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 3000,
          background: "#FFFFFF", border: "1px solid #E2E8F0",
          borderRadius: "16px", padding: "0.875rem", width: 256,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>
              📍 {stops.length} pickup{stops.length > 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: "0.63rem", color: "#10B981", background: "#D1FAE5",
              border: "1px solid #A7F3D0", borderRadius: "5px", padding: "2px 7px", fontWeight: 700 }}>
              TSP ✓
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 250, overflowY: "auto" }}>
            {(orderedStops.length > 0 ? orderedStops : stops).map((stop, idx) => {
              const color = WASTE_COLORS[stop.wasteType] || "#f97316";
              return (
                <div key={stop.id} style={{
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  background: "#F8FAFC", borderRadius: "8px",
                  padding: "0.4rem 0.5rem", border: `1px solid ${color}25`,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", background: color,
                    color: "white", fontSize: "0.65rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ color, fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize" }}>{stop.wasteType}</span>
                    <span style={{ color: "#94A3B8", fontSize: "0.6rem" }}>{stop.user_email}</span>
                  </div>
                  <button onClick={() => markCollected(stop.id)}
                    style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", color: "#059669", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700 }}>Collect</button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.63rem", color: "#94A3B8", textAlign: "center", fontWeight: 500 }}>
            Auto-polling live requests...
          </div>
        </div>
      )}
    </div>
  );
}
