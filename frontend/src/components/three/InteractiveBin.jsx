import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Billboard, Text, Html } from "@react-three/drei";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";

function ExplodingBinBody({ level = 0.7, hovered }) {
  const lidRef = useRef();
  const shellRef = useRef();
  const coreRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();

  const fillHeight = Math.max(0.2, level * 2.2);
  const fillColor = level > 0.9 ? "#ef4444" : level > 0.7 ? "#f97316" : "#22c55e";

  useFrame((state, delta) => {
    // Lerp targets based on hovered state
    const targetLidH = hovered ? 2.8 : 1.5;
    const targetLidRotX = hovered ? -Math.PI / 6 : 0;
    const targetShellOpacity = hovered ? 0.2 : 1.0;
    const targetCoreY = hovered ? 0.5 : -1.3 + fillHeight / 2;
    const targetRing1Y = hovered ? 1.5 : 1.8;
    const targetRing2Y = hovered ? 0.0 : 1.8;

    if (lidRef.current) {
      lidRef.current.position.y = THREE.MathUtils.lerp(lidRef.current.position.y, targetLidH, 6 * delta);
      lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, targetLidRotX, 6 * delta);
      lidRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }

    if (shellRef.current) {
      shellRef.current.material.opacity = THREE.MathUtils.lerp(shellRef.current.material.opacity, targetShellOpacity, 4 * delta);
      // Toggle wireframe based on opacity lerp
      shellRef.current.material.wireframe = shellRef.current.material.opacity < 0.6;
    }

    if (coreRef.current) {
      coreRef.current.position.y = THREE.MathUtils.lerp(coreRef.current.position.y, targetCoreY, 4 * delta);
      coreRef.current.scale.y = THREE.MathUtils.lerp(coreRef.current.scale.y, hovered ? 1.5 : 1, 4 * delta);
      if (hovered) coreRef.current.rotation.y += delta * 0.5;
    }

    if (ringRef1.current && ringRef2.current) {
      ringRef1.current.position.y = THREE.MathUtils.lerp(ringRef1.current.position.y, targetRing1Y, 5 * delta);
      ringRef2.current.position.y = THREE.MathUtils.lerp(ringRef2.current.position.y, targetRing2Y, 5 * delta);
      if (hovered) {
        ringRef1.current.rotation.z += delta * 2;
        ringRef2.current.rotation.x += delta * 2;
      } else {
        ringRef1.current.rotation.z = THREE.MathUtils.lerp(ringRef1.current.rotation.z, 0, 5 * delta);
        ringRef2.current.rotation.x = THREE.MathUtils.lerp(ringRef2.current.rotation.x, 0, 5 * delta);
      }
    }
  });

  return (
    <group>
      {/* Bin body outer shell */}
      <mesh ref={shellRef} position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[1, 1.15, 2.6, 32]} />
        <meshPhongMaterial color="#0f4c2a" transparent opacity={1} shininess={90} />
      </mesh>

      {/* Bin rim */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 0.15, 32]} />
        <meshPhongMaterial color="#22c55e" shininess={100} />
      </mesh>

      {/* Lid */}
      <mesh ref={lidRef} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.12, 32]} />
        <meshPhongMaterial color="#166534" shininess={80} />
      </mesh>

      {/* Inner Glowing Core (Waste content) */}
      <mesh ref={coreRef} position={[0, -1.3 + fillHeight / 2, 0]}>
        <cylinderGeometry args={[0.85, 0.85, fillHeight, 32]} />
        <meshStandardMaterial
          color={fillColor}
          emissive={fillColor}
          emissiveIntensity={hovered ? 1.5 : 0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Sensor rings that detatch and spin on hover */}
      <mesh ref={ringRef1} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 16, 48]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1.5} />
      </mesh>
      
      <mesh ref={ringRef2} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 16, 48]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1} transparent opacity={0.6}/>
      </mesh>

      {/* Base */}
      <mesh position={[0, -1.45, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.1, 32]} />
        <meshPhongMaterial color="#052e16" />
      </mesh>
    </group>
  );
}

{/* Floating Data Nodes that appear on hover */}
function DataNodes({ hovered, level }) {
  const nodesRef = useRef();
  
  useFrame((state, delta) => {
    if (nodesRef.current) {
      nodesRef.current.position.y = THREE.MathUtils.lerp(nodesRef.current.position.y, hovered ? 0 : -2, 4 * delta);
      nodesRef.current.material.opacity = THREE.MathUtils.lerp(nodesRef.current.material.opacity, hovered ? 1 : 0, 5 * delta);
      nodesRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <points ref={nodesRef} position={[0, -2, 0]}>
      <sphereGeometry args={[2.5, 32, 32]} />
      <pointsMaterial color="#06b6d4" size={0.05} transparent opacity={0} sizeAttenuation />
    </points>
  );
}

export default function InteractiveBin({ level = 0.7 }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      style={{ width: "100%", height: "100%", position: "relative", cursor: hovered ? "grab" : "pointer" }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Canvas shadows camera={{ position: [5, 3, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
        <pointLight position={[0, 3, 0]} color="#22c55e" intensity={2} distance={10} />
        <pointLight position={[0, -2, 2]} color="#06b6d4" intensity={1.5} distance={8} />

        <Float speed={hovered ? 3 : 1.5} rotationIntensity={hovered ? 0.5 : 0.2} floatIntensity={hovered ? 1 : 0.4}>
          <ExplodingBinBody level={level} hovered={hovered} />
          <DataNodes hovered={hovered} level={level} />
          
          {/* HTML Overlay tag on hover */}
          {hovered && (
            <Html position={[0, 3.5, 0]} center>
              <div style={{
                background: "rgba(15,23,42,0.9)", border: "1px solid rgba(6,182,212,0.4)",
                padding: "8px 16px", borderRadius: "8px", backdropFilter: "blur(4px)",
                color: "#e2e8f0", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap",
                boxShadow: "0 0 16px rgba(6,182,212,0.2)", pointerEvents: "none",
                animation: "fadeIn 0.3s ease"
              }}>
                <span style={{ color: "#06b6d4", marginRight: "6px" }}>●</span> DIAGNOSTICS ACTIVE
              </div>
            </Html>
          )}
        </Float>

        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!hovered} autoRotateSpeed={1.0} />
      </Canvas>
      
      {/* 2D Overlay Instructions */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, color: "#94a3b8", fontSize: "0.7rem",
        background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: "12px", pointerEvents: "none",
        border: "1px solid rgba(255,255,255,0.1)", opacity: hovered ? 0 : 1, transition: "opacity 0.3s"
      }}>
        Hover to explode view
      </div>
    </div>
  );
}
