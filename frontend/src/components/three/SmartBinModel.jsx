import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function BinBody({ level = 0.7 }) {
  const fillHeight = Math.max(0.2, level * 2.2);
  const fillColor = level > 0.9 ? "#ef4444" : level > 0.7 ? "#f97316" : "#22c55e";

  const lidRef = useRef();
  useFrame((state) => {
    if (lidRef.current) {
      lidRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <group>
      {/* Bin body */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[1, 1.15, 2.6, 48]} />
        <meshPhongMaterial color="#0f4c2a" shininess={80} specular="#22c55e" />
      </mesh>

      {/* Bin rim */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 0.15, 48]} />
        <meshPhongMaterial color="#22c55e" shininess={100} />
      </mesh>

      {/* Lid */}
      <mesh ref={lidRef} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.12, 48]} />
        <meshPhongMaterial color="#166534" shininess={80} />
      </mesh>

      {/* Fill level - glowing content inside */}
      <mesh position={[0, -1.3 + fillHeight / 2, 0]}>
        <cylinderGeometry args={[0.88, 0.88, fillHeight, 32]} />
        <meshStandardMaterial
          color={fillColor}
          emissive={fillColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Glass panel on bin */}
      <mesh position={[0, 0, 1.01]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.08} roughness={0} metalness={0.2} />
      </mesh>

      {/* Sensor ring */}
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 16, 48]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1} />
      </mesh>

      {/* Base */}
      <mesh position={[0, -1.45, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.1, 32]} />
        <meshPhongMaterial color="#052e16" />
      </mesh>
    </group>
  );
}

function GlowRing() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.8;
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.7, 0.025, 16, 80]} />
      <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} transparent opacity={0.4} />
    </mesh>
  );
}

export default function SmartBinModel({ level = 0.7 }) {
  return (
    <Canvas shadows camera={{ position: [4, 2.5, 5], fov: 48 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
      <pointLight position={[0, 3, 0]} color="#22c55e" intensity={2} distance={8} />
      <pointLight position={[0, -2, 2]} color="#06b6d4" intensity={1} distance={6} />

      <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.6}>
        <BinBody level={level} />
        <GlowRing />
      </Float>

      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
    </Canvas>
  );
}
