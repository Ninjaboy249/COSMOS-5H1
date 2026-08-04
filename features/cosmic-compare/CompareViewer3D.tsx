"use client";
// ─────────────────────────────────────────────────────────────────────────────
// CompareViewer3D — React Three Fiber 3D viewer for Cosmic Compare
// Lazy-loads GLB models, supports OrbitControls, auto-rotate, wireframe etc.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stars, PerspectiveCamera, Html } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";
import { CELESTIAL_MODELS } from "@/lib/cosmic-compare-data";

// ── Spinning planet from GLB ──────────────────────────────────────────────────
interface PlanetModelProps {
  url: string;
  position: [number, number, number];
  scale: number;
  color: string;
  autoRotate: boolean;
  wireframe: boolean;
  showAxes: boolean;
  label: string;
  showLabels: boolean;
}

function PlanetModel({ url, position, scale, color, autoRotate, wireframe, showAxes, label, showLabels }: PlanetModelProps) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  // Clone scene so two instances can coexist
  const cloned = scene.clone(true);

  // Apply wireframe if requested
  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => { (m as THREE.MeshStandardMaterial).wireframe = wireframe; });
        } else {
          (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    });
  }, [wireframe, cloned]);

  useFrame((_, delta) => {
    if (autoRotate && ref.current) {
      ref.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <primitive object={cloned} />
      {showAxes && <axesHelper args={[2]} />}
      {showLabels && (
        <Html center distanceFactor={8} position={[0, 1.4, 0]}>
          <div style={{ color: color, background: "rgba(0,0,0,0.7)", padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", border: `1px solid ${color}60` }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Placeholder sphere when no GLB available ──────────────────────────────────
function PlanetSphere({ position, scale, color, autoRotate, wireframe, label, showLabels }: Omit<PlanetModelProps, "url" | "showAxes">) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (autoRotate && ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial color={color} wireframe={wireframe} roughness={0.6} metalness={0.2} />
      {showLabels && (
        <Html center distanceFactor={8} position={[0, 1.4, 0]}>
          <div style={{ color, background: "rgba(0,0,0,0.7)", padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", border: `1px solid ${color}60` }}>
            {label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

// ── Orbit ring ────────────────────────────────────────────────────────────────
function OrbitRing({ radius, color }: { radius: number; color: string }) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, opacity: 0.25, transparent: true });
  const lineObj = new THREE.Line(geo, mat);
  return <primitive object={lineObj} />;
}

// ── Camera reset helper ───────────────────────────────────────────────────────
function CameraReset({ trigger }: { trigger: number }) {
  const { camera } = useThree();
  useEffect(() => {
    if (trigger > 0) {
      camera.position.set(0, 2, 8);
      camera.lookAt(0, 0, 0);
    }
  }, [trigger, camera]);
  return null;
}

// ── Scene contents ────────────────────────────────────────────────────────────
interface SceneProps {
  objA: CelestialCompareData;
  objB: CelestialCompareData;
  autoRotate: boolean;
  wireframe: boolean;
  showOrbits: boolean;
  showAxes: boolean;
  showLabels: boolean;
  resetTrigger: number;
}

function Scene({ objA, objB, autoRotate, wireframe, showOrbits, showAxes, showLabels, resetTrigger }: SceneProps) {
  // Proportional scale: normalize to max diameter so both fit in view
  const maxD = Math.max(objA.diameterKm, objB.diameterKm, 1);
  const baseSize = 1.8;
  const scaleA = Math.max(0.25, (objA.diameterKm / maxD) * baseSize);
  const scaleB = Math.max(0.25, (objB.diameterKm / maxD) * baseSize);

  // Spacing — push apart based on their sizes
  const gap = 3.0;
  const posA: [number, number, number] = [-gap, 0, 0];
  const posB: [number, number, number] = [gap, 0, 0];

  const urlA = CELESTIAL_MODELS[objA.id];
  const urlB = CELESTIAL_MODELS[objB.id];

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={55} />
      <CameraReset trigger={resetTrigger} />
      <OrbitControls enablePan enableZoom enableRotate makeDefault />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
      <pointLight position={[-5, -3, -5]} intensity={0.4} color="#4060ff" />

      {/* Environment */}
      <Environment preset="night" />
      <Stars radius={80} depth={50} count={3000} factor={4} saturation={0.5} fade speed={0.5} />

      {/* Object A */}
      {urlA ? (
        <PlanetModel
          url={urlA} position={posA} scale={scaleA}
          color={objA.color} autoRotate={autoRotate} wireframe={wireframe}
          showAxes={showAxes} label={objA.name} showLabels={showLabels}
        />
      ) : (
        <PlanetSphere
          position={posA} scale={scaleA} color={objA.color}
          autoRotate={autoRotate} wireframe={wireframe} label={objA.name} showLabels={showLabels}
        />
      )}

      {/* Object B */}
      {urlB ? (
        <PlanetModel
          url={urlB} position={posB} scale={scaleB}
          color={objB.color} autoRotate={autoRotate} wireframe={wireframe}
          showAxes={showAxes} label={objB.name} showLabels={showLabels}
        />
      ) : (
        <PlanetSphere
          position={posB} scale={scaleB} color={objB.color}
          autoRotate={autoRotate} wireframe={wireframe} label={objB.name} showLabels={showLabels}
        />
      )}

      {/* Orbit rings */}
      {showOrbits && (
        <>
          <OrbitRing radius={2.5} color={objA.color} />
          <OrbitRing radius={2.5} color={objB.color} />
        </>
      )}
    </>
  );
}

// ── Control button ────────────────────────────────────────────────────────────
function CtrlBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        background: active ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.05)",
        border: active ? "1px solid rgba(99,102,241,0.6)" : "1px solid rgba(255,255,255,0.10)",
        color: active ? "#c4b5fd" : "rgba(191,219,254,0.6)",
      }}
    >
      {children}
    </button>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
interface CompareViewer3DProps {
  objA: CelestialCompareData;
  objB: CelestialCompareData;
}

export default function CompareViewer3D({ objA, objB }: CompareViewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [showOrbits, setShowOrbits] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      ref={containerRef}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "rgba(0,0,10,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        height: fullscreen ? "100vh" : "480px",
      }}
    >
      {/* Object labels overlay */}
      <div className="absolute top-4 left-0 right-0 z-10 flex justify-between px-6 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${objA.color}18`, border: `1px solid ${objA.color}40` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objA.image} alt={objA.name} className="w-5 h-5 object-contain" />
          <span className="text-xs font-semibold" style={{ color: objA.color }}>{objA.name}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${objB.color}18`, border: `1px solid ${objB.color}40` }}>
          <span className="text-xs font-semibold" style={{ color: objB.color }}>{objB.name}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objB.image} alt={objB.name} className="w-5 h-5 object-contain" />
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <Scene
            objA={objA} objB={objB}
            autoRotate={autoRotate} wireframe={wireframe}
            showOrbits={showOrbits} showAxes={showAxes}
            showLabels={showLabels} resetTrigger={resetTrigger}
          />
        </Suspense>
      </Canvas>

      {/* Controls bar */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-wrap gap-2 justify-center px-4">
        <CtrlBtn active={autoRotate} onClick={() => setAutoRotate((v) => !v)}>⟳ Auto Rotate</CtrlBtn>
        <CtrlBtn onClick={() => setResetTrigger((v) => v + 1)}>⌖ Reset View</CtrlBtn>
        <CtrlBtn active={showLabels} onClick={() => setShowLabels((v) => !v)}>🏷 Labels</CtrlBtn>
        <CtrlBtn active={wireframe} onClick={() => setWireframe((v) => !v)}>⬡ Wireframe</CtrlBtn>
        <CtrlBtn active={showOrbits} onClick={() => setShowOrbits((v) => !v)}>○ Orbits</CtrlBtn>
        <CtrlBtn active={showAxes} onClick={() => setShowAxes((v) => !v)}>✛ Axes</CtrlBtn>
        <CtrlBtn onClick={toggleFullscreen}>{fullscreen ? "⊠ Exit" : "⛶ Fullscreen"}</CtrlBtn>
      </div>
    </motion.div>
  );
}
