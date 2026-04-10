import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Canvas, useFrame } from "@react-three/fiber";

/* ── Bin data — real lat/lng around CMRIT, Bengaluru ─────────────── */
const ROUTE_STOPS = [
  { id: "DEPOT",   label: "Depot / Truck Start",    lat: 13.0698, lng: 77.5982, level: 0,  priority: "start",    color: "#06b6d4", type: "—"            },
  { id: "BIN-003", label: "Food Court",              lat: 13.0715, lng: 77.6001, level: 98, priority: "critical", color: "#ef4444", type: "Biodegradable" },
  { id: "BIN-001", label: "Block A – Main Entrance", lat: 13.0707, lng: 77.5993, level: 92, priority: "high",     color: "#f97316", type: "Recyclable"    },
  { id: "BIN-008", label: "Library",                 lat: 13.0712, lng: 77.5978, level: 87, priority: "high",     color: "#f97316", type: "Recyclable"    },
  { id: "BIN-005", label: "Lab Block – Entrance",    lat: 13.0705, lng: 77.5988, level: 78, priority: "medium",   color: "#eab308", type: "Hazardous"     },
  { id: "RECYCLE", label: "Recycling Center",        lat: 13.0730, lng: 77.6010, level: 0,  priority: "end",      color: "#22c55e", type: "—"            },
];

const PRIORITY_LABEL = {
  start:    "START",
  critical: "CRITICAL",
  high:     "HIGH",
  medium:   "MEDIUM",
  end:      "END",
};

/* ── SVG circle marker factory ───────────────────────────────────── */
function makeIcon(color, size = 32, level = 0) {
  const ring = level > 0
    ? `<circle cx="16" cy="16" r="13" fill="none" stroke="${color}" stroke-width="2.5"
         stroke-dasharray="${(level / 100) * 81.7} 81.7" stroke-linecap="round"
         transform="rotate(-90 16 16)" opacity="0.9"/>`
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}22" stroke="${color}" stroke-width="1.5"/>
      ${ring}
      <circle cx="16" cy="16" r="6" fill="${color}"/>
      <circle cx="16" cy="16" r="4" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
}

/* ── Lerp between two lat/lng points ─────────────────────────────── */
function lerpLatLng(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ── 3D Truck Model ──────────────────────────────────────────────── */
function Truck3D({ angleRef }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      // Smoothly rotate truck to face driving direction.
      // angleRef holds atan2(dy, dx) in screen space.
      // We negate it to match ThreeJS Y rotation properly (X-Z plane).
      const targetAngle = -angleRef.current;
      groupRef.current.rotation.y = Number.isNaN(targetAngle) ? 0 : targetAngle;
      
      // Add slight driving bob
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.03;
    }
  });

  return (
    <group ref={groupRef} scale={1.8}>
      {/* Cab */}
      <mesh position={[0, 0.18, 0.15]} castShadow>
        <boxGeometry args={[0.35, 0.28, 0.32]} />
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.2} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Container */}
      <mesh position={[0, 0.14, -0.18]} castShadow>
        <boxGeometry args={[0.38, 0.22, 0.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Headlights */}
      <pointLight color="#22c55e" intensity={5} distance={3} position={[0.1, 0.1, 0.35]} />
      <pointLight color="#22c55e" intensity={5} distance={3} position={[-0.1, 0.1, 0.35]} />
    </group>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export default function RealRouteMap() {
  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const animRef       = useRef(null);
  const overlayRef    = useRef(null);
  const truckAngleRef = useRef(0);
  const [activeStop, setActiveStop] = useState(null);

  useEffect(() => {
    if (leafletMap.current) return; // already initialized

    const map = L.map(mapRef.current, {
      center: [13.0712, 77.5993],
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
    });
    leafletMap.current = map;

    /* ── Dark-themed tile layer ───────────────────────────────────── */
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© OSM © CARTO',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    /* ── Route polylines ──────────────────────────────────────────── */
    const routeCoords = ROUTE_STOPS.map(s => [s.lat, s.lng]);
    L.polyline(routeCoords, {
      color: "#22c55e",
      weight: 3,
      opacity: 0.85,
      dashArray: "8 6",
    }).addTo(map);

    L.polyline(routeCoords, {
      color: "#22c55e",
      weight: 10,
      opacity: 0.08,
    }).addTo(map);

    /* ── Bin markers ──────────────────────────────────────────────── */
    ROUTE_STOPS.forEach((stop, idx) => {
      const iconSize = stop.priority === "start" || stop.priority === "end" ? 38 : 34;
      const marker = L.marker([stop.lat, stop.lng], {
        icon: makeIcon(stop.color, iconSize, stop.level),
        zIndexOffset: stop.priority === "critical" ? 1000 : 0,
      }).addTo(map);

      const fillBar = stop.level > 0
        ? `<div style="margin-top:8px">
             <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:3px">
               <span>Fill Level</span><span style="color:${stop.color};font-weight:700">${stop.level}%</span>
             </div>
             <div style="height:6px;background:#1e293b;border-radius:9999px;overflow:hidden">
               <div style="height:100%;width:${stop.level}%;background:${stop.color};border-radius:9999px"></div>
             </div>
           </div>`
        : "";

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;background:#0f172a;border-radius:12px;overflow:hidden">
          <div style="background:${stop.color}18;border-bottom:1px solid ${stop.color}30;padding:10px 12px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:700;color:#f1f5f9">${stop.label}</span>
              <span style="font-size:10px;font-weight:700;color:${stop.color};
                background:${stop.color}20;border:1px solid ${stop.color}40;
                border-radius:9999px;padding:2px 8px">${PRIORITY_LABEL[stop.priority]}</span>
            </div>
          </div>
          <div style="padding:10px 12px">
            <div style="font-size:11px;color:#64748b">Stop ${idx + 1} of ${ROUTE_STOPS.length}</div>
            ${fillBar}
          </div>
        </div>
      `, { maxWidth: 220, className: "ecosmart-popup" });

      marker.on("click", () => setActiveStop(stop));
    });

    /* ── Tracking the 3D truck overlay ────────────────────────────── */
    const SPEED = 0.0015; // fraction per frame
    let seg = 0;
    let frac = 0;

    function renderFrame() {
      // 1. Advance logic
      frac += SPEED;
      if (frac >= 1) {
        frac = 0;
        seg = (seg + 1) % (ROUTE_STOPS.length - 1);
      }
      
      const from = [ROUTE_STOPS[seg].lat, ROUTE_STOPS[seg].lng];
      const to   = [ROUTE_STOPS[seg + 1].lat, ROUTE_STOPS[seg + 1].lng];
      const pos  = lerpLatLng(from, to, frac);

      // 2. Sync to screen space (works smoothly during pan/zoom)
      if (overlayRef.current && map) {
        const point = map.latLngToContainerPoint(pos);
        
        // Setup angle parsing: screen x goes right, screen y goes down
        const pFrom = map.latLngToContainerPoint(from);
        const pTo = map.latLngToContainerPoint(to);
        const dx = pTo.x - pFrom.x;
        const dy = pTo.y - pFrom.y;
        
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          // Add PI/2 offset because the ThreeJS camera and map coordinate 
          // spaces are offset by 90 degrees relative to atan2 typical usage.
          truckAngleRef.current = Math.atan2(dy, dx) + Math.PI / 2;
        }

        // Apply absolute position 
        overlayRef.current.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
      }

      animRef.current = requestAnimationFrame(renderFrame);
    }
    
    animRef.current = requestAnimationFrame(renderFrame);

    /* ── Fit map to route bounds ──────────────────────────────────── */
    const bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding: [40, 40] });

    /* ── Inject popup styles ──────────────────────────────────────── */
    const style = document.createElement("style");
    style.textContent = `
      .ecosmart-popup .leaflet-popup-content-wrapper {
        background: #0f172a;
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 14px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(34,197,94,0.08);
        padding: 0;
      }
      .ecosmart-popup .leaflet-popup-content { margin: 0; }
      .ecosmart-popup .leaflet-popup-tip { background: #0f172a; }
      .leaflet-control-zoom a {
        background: #0f172a !important;
        color: #22c55e !important;
        border-color: rgba(34,197,94,0.2) !important;
      }
      .leaflet-control-zoom a:hover { background: #1e293b !important; }
      .leaflet-control-attribution {
        background: rgba(2,6,23,0.7) !important;
        color: #475569 !important;
        font-size: 9px;
      }
      .leaflet-control-attribution a { color: #22c55e !important; }
    `;
    document.head.appendChild(style);

    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 2D Leaflet Map */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating 3D truck overlay wrapper */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 80,
          height: 80,
          zIndex: 2000,
          pointerEvents: "none",
        }}
      >
        <Canvas camera={{ position: [0, 4, 3], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 5, 2]} intensity={2.5} castShadow />
          <Truck3D angleRef={truckAngleRef} />
        </Canvas>
      </div>

      {/* Active stop info overlay */}
      {activeStop && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 3000,
          background: "rgba(2,6,23,0.92)", backdropFilter: "blur(12px)",
          border: `1px solid ${activeStop.color}30`,
          borderRadius: "14px", padding: "0.875rem 1rem",
          minWidth: 200, boxShadow: `0 0 24px ${activeStop.color}15`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeStop.color,
              boxShadow: `0 0 6px ${activeStop.color}`, display: "inline-block" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f1f5f9" }}>{activeStop.label}</span>
          </div>
          {activeStop.level > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b", marginBottom: "4px" }}>
                <span>Fill Level</span>
                <span style={{ color: activeStop.color, fontWeight: 700 }}>{activeStop.level}%</span>
              </div>
              <div style={{ height: 6, background: "#1e293b", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${activeStop.level}%`, background: activeStop.color, borderRadius: 9999 }} />
              </div>
              <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "6px" }}>Waste: {activeStop.type}</div>
            </>
          )}
          <button onClick={() => setActiveStop(null)}
            style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none",
              color: "#475569", cursor: "pointer", fontSize: "0.9rem", lineHeight: 1 }}>✕</button>
        </div>
      )}
    </div>
  );
}
