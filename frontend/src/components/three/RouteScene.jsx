/* eslint-disable react-hooks/purity, react-hooks/immutability */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Float, Text, Grid } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/* ─── Map data ───────────────────────────────────────────────────── */
const ROUTE_NODES = [
  { id: "DEPOT",   label: "Depot",       x: -5.5, z: -4,   color: "#06b6d4", priority: "start",    level: 0  },
  { id: "BIN-003", label: "Food Court",  x: -2.5, z: -2,   color: "#ef4444", priority: "critical", level: 98 },
  { id: "BIN-001", label: "Block A",     x:  0.5, z:  1,   color: "#f97316", priority: "high",     level: 92 },
  { id: "BIN-008", label: "Library",     x:  3,   z: -1.5, color: "#f97316", priority: "high",     level: 87 },
  { id: "BIN-005", label: "Lab Block",   x:  5,   z:  2.5, color: "#eab308", priority: "medium",   level: 78 },
  { id: "RECYCLE", label: "Recycling",   x:  6.5, z: -3,   color: "#22c55e", priority: "end",      level: 0  },
];

const BUILDINGS = [
  { x: -4, z:  2, w: 2.5, d: 2,   h: 1.8, color: "#0f172a" },
  { x: -1, z: -3, w: 2,   d: 1.5, h: 2.5, color: "#0c1320" },
  { x:  2, z:  3, w: 3,   d: 2,   h: 1.4, color: "#0f172a" },
  { x:  5, z: -2, w: 2,   d: 2.5, h: 3,   color: "#0c1320" },
  { x: -6, z:  1, w: 1.5, d: 1.5, h: 2,   color: "#0f172a" },
  { x:  1, z: -1, w: 1.5, d: 1,   h: 1.2, color: "#111827" },
  { x: -3, z:  3, w: 1.8, d: 1.8, h: 2.2, color: "#0c1320" },
  { x:  7, z:  1, w: 2,   d: 1.5, h: 1.5, color: "#0f172a" },
];

const ROAD_PATHS = [
  [[-8, 0, -5],  [8, 0, -5]],
  [[-8, 0,  5],  [8, 0,  5]],
  [[-5, 0, -8],  [-5, 0, 8]],
  [[ 0, 0, -8],  [ 0, 0, 8]],
  [[ 5, 0, -8],  [ 5, 0, 8]],
];

/* ─── Ground / terrain ───────────────────────────────────────────── */
function Ground() {
  return (
    <>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#050e18" />
      </mesh>

      {/* Grid lines */}
      <Grid
        position={[0, 0, 0]}
        args={[22, 22]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#0f2a1a"
        sectionSize={5}
        sectionColor="#22c55e22"
        sectionThickness={0.8}
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </>
  );
}

/* ─── City buildings ─────────────────────────────────────────────── */
function Building({ x, z, w, d, h, color }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      // subtle window blink
      ref.current.material.emissiveIntensity =
        0.04 + Math.abs(Math.sin(state.clock.elapsedTime * 0.4 + x)) * 0.06;
    }
  });
  return (
    <mesh ref={ref} position={[x, h / 2, z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} emissive="#22c55e" emissiveIntensity={0.04} roughness={0.9} />
    </mesh>
  );
}

/* ─── Road lines ─────────────────────────────────────────────────── */
function Roads() {
  return (
    <>
      {ROAD_PATHS.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1a3a2a"
          lineWidth={6}
          opacity={0.8}
          transparent
        />
      ))}
    </>
  );
}

/* ─── Bin node ───────────────────────────────────────────────────── */
function BinNode({ node, index }) {
  const ref = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(t * 2.5 + index) * 0.1);
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 1.5;
      ringRef.current.material.opacity = 0.3 + Math.sin(t * 2 + index) * 0.2;
    }
  });

  const isSpecial = node.priority === "start" || node.priority === "end";

  return (
    <group position={[node.x, 0, node.z]}>
      {/* Vertical glow line up from ground */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1} transparent opacity={0.5} />
      </mesh>

      {/* Pulse ring on ground */}
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={2} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Main sphere node */}
      <mesh ref={ref} position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[isSpecial ? 0.22 : 0.18, 32, 32]} />
        <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.8} />
      </mesh>

      {/* Fill percentage ring around the sphere */}
      {node.level > 0 && (
        <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.025, 8, 32, (node.level / 100) * Math.PI * 2]} />
          <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1.5} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 1.75, 0]}
        fontSize={0.28}
        color={node.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {node.label}
      </Text>
      {node.level > 0 && (
        <Text
          position={[0, 1.42, 0]}
          fontSize={0.2}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {node.level}%
        </Text>
      )}
    </group>
  );
}

/* ─── Animated truck ─────────────────────────────────────────────── */
function Truck({ path }) {
  const ref       = useRef();
  const t         = useRef(0);

  const trailArray = useMemo(() => new Float32Array(90), []); // 30 points × 3
  const trailGeo = useRef();

  useFrame((state, delta) => {
    t.current = (t.current + delta * 0.09) % 1;
    const total = path.length - 1;
    const seg   = Math.floor(t.current * total);
    const frac  = (t.current * total) - seg;
    const from  = new THREE.Vector3(path[seg].x, 0.35, path[seg].z);
    const to    = new THREE.Vector3(path[Math.min(seg + 1, total)].x, 0.35, path[Math.min(seg + 1, total)].z);

    const pos = from.clone().lerp(to, frac);
    ref.current.position.copy(pos);

    // Orient truck toward direction of travel
    const dir = to.clone().sub(from).normalize();
    if (dir.length() > 0.001) {
      const angle = Math.atan2(dir.x, dir.z);
      ref.current.rotation.y = angle;
    }

    // Update trail
    const arr = trailArray;
    for (let i = arr.length - 3; i >= 3; i -= 3) {
      arr[i]     = arr[i - 3];
      arr[i + 1] = arr[i - 2];
      arr[i + 2] = arr[i - 1];
    }
    arr[0] = pos.x; arr[1] = pos.y + 0.05; arr[2] = pos.z;
    if (trailGeo.current) {
      trailGeo.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Truck body */}
      <group ref={ref}>
        {/* Cab */}
        <mesh position={[0, 0.18, 0.15]} castShadow>
          <boxGeometry args={[0.35, 0.28, 0.28]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
        </mesh>
        {/* Container */}
        <mesh position={[0, 0.14, -0.18]} castShadow>
          <boxGeometry args={[0.38, 0.22, 0.38]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
        {/* Headlights */}
        <pointLight color="#22c55e" intensity={4} distance={2.5} position={[0, 0.2, 0.35]} />
      </group>

      {/* Trail line */}
      <line>
        <bufferGeometry ref={trailGeo}>
          <bufferAttribute
            attach="attributes-position"
            count={30}
            array={trailArray}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.35} />
      </line>
    </group>
  );
}

/* ─── Route path line ────────────────────────────────────────────── */
function RouteLine({ nodes }) {
  const points = nodes.map(n => [n.x, 1.15, n.z]);
  const colors = nodes.map(n => new THREE.Color(n.color));

  return (
    <Line
      points={points}
      vertexColors={colors}
      lineWidth={2.5}
      dashed
      dashSize={0.35}
      dashOffset={0}
      gapSize={0.15}
    />
  );
}

/* ─── Ambient particles ──────────────────────────────────────────── */
function FloatingDust() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = Math.random() * 4 + 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={150} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#22c55e" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ─── Main export ────────────────────────────────────────────────── */
export default function RouteScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [4, 9, 12], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#020813"]} />
      <fog attach="fog" args={["#020813", 18, 32]} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[-5, 3, -3]} color="#06b6d4" intensity={2} distance={12} />
      <pointLight position={[6,  3,  4]} color="#22c55e" intensity={2} distance={12} />

      {/* Scene */}
      <Ground />
      <Roads />
      {BUILDINGS.map((b, i) => <Building key={i} {...b} />)}
      {ROUTE_NODES.map((node, i) => <BinNode key={node.id} node={node} index={i} />)}
      <RouteLine nodes={ROUTE_NODES} />
      <Truck path={ROUTE_NODES} />
      <FloatingDust />

      <OrbitControls
        enablePan
        enableZoom
        minDistance={5}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}
