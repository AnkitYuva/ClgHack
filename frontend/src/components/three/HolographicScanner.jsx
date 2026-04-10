import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, MeshDistortMaterial, Trail } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

// Glowing rings that scan the model
function ScannerEffect({ color }) {
  const laserRef = useRef();
  
  useFrame((state) => {
    if (laserRef.current) {
      // Moves up and down
      laserRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 1.5;
      laserRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    }
  });

  return (
    <group>
      <mesh ref={laserRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Grid Floor */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6, 20, 20]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// Recyclable: Rotating Bottle and Mobius Loop
function RecyclableModel({ color }) {
  const group = useRef();
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.01;
      group.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });
  return (
    <group ref={group}>
      {/* Bottle Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 2, 32]} />
        <MeshDistortMaterial color={color} wireframe distort={0.2} speed={2} transparent opacity={0.8} />
      </mesh>
      {/* Bottle Neck */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.2, 0.6, 0.5, 32]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}

// Biodegradable: Abstract Organic Leaf/Core
function BiodegradableModel({ color }) {
  const mesh = useRef();
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.015;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.2, 4]} />
      <MeshDistortMaterial color={color} distort={0.6} speed={3} roughness={0} transparent opacity={0.8} wireframe />
    </mesh>
  );
}

// Hazardous: Toxic Barrel / Warning core
function HazardousModel({ color }) {
  const group = useRef();
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y -= 0.02;
    }
  });
  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[0.8, 0.8, 1.8, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <torusGeometry args={[0.8, 0.1, 16, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <torusGeometry args={[0.8, 0.1, 16, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// Main 3D Hologram Component
export default function HolographicScanner({ type = "recyclable", color = "#06b6d4" }) {
  return (
    <div style={{ width: "100%", height: "260px", WebkitMaskImage: "radial-gradient(ellipse at center, white 30%, transparent 80%)" }}>
      <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 5, 5]} intensity={2} />
        <pointLight position={[0, 0, 0]} color={color} intensity={5} distance={10} />
        
        <ScannerEffect color={color} />

        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          {type === "recyclable" && <RecyclableModel color={color} />}
          {type === "biodegradable" && <BiodegradableModel color={color} />}
          {type === "hazardous" && <HazardousModel color={color} />}
        </Float>

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 3} />
      </Canvas>
    </div>
  );
}
