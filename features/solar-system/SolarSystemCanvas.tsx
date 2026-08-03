"use client";

import { useRef, Suspense, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Stars,
  useTexture,
  Sphere,
  Ring,
  OrbitControls,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { PLANETS, SUN_DATA } from "@/lib/planets-data";
import type { Planet } from "@/types";

// ─── Sun ──────────────────────────────────────────────────────────────────────
function Sun({ onClick }: { onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
    if (glowRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.001) * 0.03;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group onClick={onClick}>
      {/* Core */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#FDB813"
          emissive="#FF6600"
          emissiveIntensity={1.5}
          roughness={0.8}
          metalness={0}
        />
      </mesh>
      {/* Glow halo 1 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[5.8, 32, 32]} />
        <meshBasicMaterial
          color="#FF8800"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Glow halo 2 */}
      <mesh>
        <sphereGeometry args={[7, 32, 32]} />
        <meshBasicMaterial
          color="#FF6600"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Point light */}
      <pointLight color="#FDB813" intensity={8} distance={300} castShadow />
      <pointLight color="#FF8800" intensity={4} distance={500} />
    </group>
  );
}

// ─── Planet Mesh ──────────────────────────────────────────────────────────────
interface PlanetMeshProps {
  planet: Planet;
  onHover: (p: Planet | null) => void;
  onClick: (p: Planet) => void;
}

function PlanetMesh({ planet, onHover, onClick }: PlanetMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Try to load texture, fall back to color
  let texture: THREE.Texture | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    texture = useTexture(planet.texture);
  } catch {
    texture = undefined;
  }

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Orbit
    const angle = (time / (planet.orbitalPeriod * 40)) % (Math.PI * 2);
    groupRef.current.position.x = Math.cos(angle) * planet.distance;
    groupRef.current.position.z = Math.sin(angle) * planet.distance;

    // Rotation
    meshRef.current.rotation.y += 0.005 / Math.abs(planet.rotationPeriod);

    // Hover scale
    const targetScale = hovered ? 1.25 : 1;
    const currentScale = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(currentScale + (targetScale - currentScale) * 0.1);
  });

  const scaledRadius = Math.max(0.3, Math.min(planet.radius * 0.5, 3.5));

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(planet);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          onHover(null);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(planet);
        }}
      >
        <sphereGeometry args={[scaledRadius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          color={texture ? "#ffffff" : planet.color}
          roughness={0.7}
          metalness={0.1}
          emissive={hovered ? planet.glowColor : "#000000"}
          emissiveIntensity={hovered ? 0.15 : 0}
        />
      </mesh>

      {/* Glow */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[scaledRadius * 1.3, 32, 32]} />
          <meshBasicMaterial
            color={planet.glowColor}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Saturn rings */}
      {planet.hasRings && planet.id === "saturn" && (
        <Ring args={[scaledRadius * 1.4, scaledRadius * 2.4, 64]} rotation={[-Math.PI / 3, 0, 0]}>
          <meshBasicMaterial
            color={planet.ringColor || "#c8b060"}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </Ring>
      )}

      {/* Uranus rings (thinner) */}
      {planet.hasRings && planet.id === "uranus" && (
        <Ring
          args={[scaledRadius * 1.5, scaledRadius * 1.9, 64]}
          rotation={[Math.PI / 2.1, 0.1, 0]}
        >
          <meshBasicMaterial
            color={planet.ringColor || "#5090a0"}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </Ring>
      )}

      {/* Moon for Earth */}
      {planet.hasMoon && <EarthMoon planetRef={groupRef} planetRadius={scaledRadius} />}
    </group>
  );
}

// ─── Earth Moon ───────────────────────────────────────────────────────────────
function EarthMoon({
  planetRef,
  planetRadius,
}: {
  planetRef: React.RefObject<THREE.Group>;
  planetRadius: number;
}) {
  const moonRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!moonRef.current) return;
    const t = state.clock.getElapsedTime();
    moonRef.current.position.x = Math.cos(t * 1.5) * (planetRadius + 1.2);
    moonRef.current.position.z = Math.sin(t * 1.5) * (planetRadius + 1.2);
    moonRef.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={moonRef} castShadow>
      <sphereGeometry args={[planetRadius * 0.27, 32, 32]} />
      <meshStandardMaterial color="#888888" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// ─── Orbit Ring ───────────────────────────────────────────────────────────────
function OrbitRing({ distance }: { distance: number }) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
  }
  const line = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <primitive object={new THREE.Line(line, new THREE.LineBasicMaterial({ color: "#334466", transparent: true, opacity: 0.35 }))} />
  );
}

// ─── Asteroid Belt ────────────────────────────────────────────────────────────
function AsteroidBelt() {
  const count = 400;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const radius = 20 + Math.random() * 2.5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = Math.random() * 0.08 + 0.02;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  return (
    <points geometry={geo}>
      <pointsMaterial color="#8899aa" size={0.12} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Slow cinematic drift
    const targetX = mouse.current.x * 4;
    const targetY = 8 + mouse.current.y * 3;
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
    // Add subtle breathing
    camera.position.z = 55 + Math.sin(t * 0.1) * 1.5;
  });

  if (typeof window !== "undefined") {
    window.onmousemove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
  }

  return null;
}

// ─── Solar System Scene ───────────────────────────────────────────────────────
interface SolarSystemSceneProps {
  onPlanetHover: (p: Planet | null) => void;
  onPlanetClick: (p: Planet) => void;
  onSunClick: () => void;
}

function SolarSystemScene({
  onPlanetHover,
  onPlanetClick,
  onSunClick,
}: SolarSystemSceneProps) {
  return (
    <>
      <CameraRig />
      <Stars radius={300} depth={60} count={5000} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.05} />
      <Sun onClick={onSunClick} />
      <AsteroidBelt />
      {PLANETS.map((planet) => (
        <group key={planet.id}>
          <OrbitRing distance={planet.distance} />
          <PlanetMesh
            planet={planet}
            onHover={onPlanetHover}
            onClick={onPlanetClick}
          />
        </group>
      ))}
    </>
  );
}

// ─── Solar System Canvas ─────────────────────────────────────────────────────
interface SolarSystemCanvasProps {
  onPlanetHover: (p: Planet | null) => void;
  onPlanetClick: (p: Planet) => void;
  onSunClick: () => void;
}

export default function SolarSystemCanvas({
  onPlanetHover,
  onPlanetClick,
  onSunClick,
}: SolarSystemCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 8, 55], fov: 60, near: 0.1, far: 2000 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        alpha: true,
      }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <SolarSystemScene
          onPlanetHover={onPlanetHover}
          onPlanetClick={onPlanetClick}
          onSunClick={onSunClick}
        />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
