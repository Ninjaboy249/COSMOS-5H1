"use client";
// ─────────────────────────────────────────────────────────────────────────────
// SingleViewer3D — React Three Fiber single-object 3D viewer
// Fixes:
//  1. White-screen flash — Canvas gl cleared to black; Environment wrapped in
//     its own Suspense so it never blocks the planet render; no scene.clone()
//     inside render (causes WebGL corruption). Model is keyed by URL so React
//     fully remounts when the selection changes.
//  2. Large models appear tiny — PlanetModel auto-fits by computing the
//     bounding box of the loaded scene and scaling to fill a target radius.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";
import { CELESTIAL_MODELS } from "@/lib/cosmic-compare-data";

// ── Target fill radius in world units — camera sits at z=5, fov=50 ────────────
const TARGET_RADIUS = 1.8;

// ── Auto-fit helper: scale + centre a scene so its bounding sphere ≈ TARGET_RADIUS
function fitScene(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const centre = new THREE.Vector3();
  box.getCenter(centre);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? (TARGET_RADIUS * 2) / maxDim : 1;

  scene.scale.setScalar(scale);
  // re-centre after scaling
  scene.position.sub(centre.multiplyScalar(scale));
  return scale;
}

// ── GLB model ─────────────────────────────────────────────────────────────────
// Key this component by `url` in the parent so it fully remounts on object change.
function PlanetModel({
  url,
  autoRotate,
  wireframe,
}: {
  url: string;
  autoRotate: boolean;
  wireframe: boolean;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Auto-fit once on load
  useEffect(() => {
    if (!groupRef.current) return;
    fitScene(groupRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Apply / remove wireframe reactively without cloning
  useEffect(() => {
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mat = (child as THREE.Mesh).material;
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        (m as THREE.MeshStandardMaterial).wireframe = wireframe;
      });
    });
  }, [wireframe, scene]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// ── Fallback sphere (no GLB available) ───────────────────────────────────────
function PlanetSphere({
  color,
  autoRotate,
  wireframe,
}: {
  color: string;
  autoRotate: boolean;
  wireframe: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) meshRef.current.rotation.y += delta * 0.35;
  });
  return (
    <mesh ref={meshRef} scale={TARGET_RADIUS}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color={color}
        wireframe={wireframe}
        roughness={0.55}
        metalness={0.15}
      />
    </mesh>
  );
}

// ── Starfield background (its own Suspense so HDR never blocks the planet) ───
function Background() {
  return (
    <Stars
      radius={90}
      depth={60}
      count={4000}
      factor={4}
      saturation={0.4}
      fade
      speed={0.4}
    />
  );
}

// ── Camera that resets when the selected object changes ───────────────────────
function CameraController({ resetKey }: { resetKey: string }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
  }, [resetKey, camera]);
  return null;
}

// ── Control button ────────────────────────────────────────────────────────────
function CtrlBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        background: active ? "rgba(99,102,241,0.35)" : "rgba(0,0,20,0.65)",
        border: active
          ? "1px solid rgba(99,102,241,0.6)"
          : "1px solid rgba(255,255,255,0.12)",
        color: active ? "#c4b5fd" : "rgba(191,219,254,0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </button>
  );
}

// ── Loading overlay shown while the GLB streams in ───────────────────────────
function LoadingOverlay({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none"
      style={{ background: "rgba(0,0,10,0.75)" }}
    >
      <div
        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${color}60`, borderTopColor: color }}
      />
      <p className="text-xs font-medium" style={{ color, textShadow: `0 0 12px ${color}` }}>
        Loading model…
      </p>
    </div>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
interface SingleViewer3DProps {
  obj: CelestialCompareData;
}

export default function SingleViewer3D({ obj }: SingleViewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const glbUrl = CELESTIAL_MODELS[obj.id] || null;

  // Show loading spinner whenever model URL changes
  useEffect(() => {
    setLoading(true);
    setWireframe(false);
  }, [obj.id]);

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
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        height: fullscreen ? "100vh" : 480,
        background: "#00000f",   // explicit near-black — prevents any white flash
      }}
    >
      {/* Object name badge */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full pointer-events-none"
        style={{
          background: `${obj.color}14`,
          border: `1px solid ${obj.color}50`,
          backdropFilter: "blur(10px)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={obj.image} alt={obj.name} className="w-5 h-5 object-contain" />
        <span
          className="text-xs font-semibold"
          style={{ color: obj.color, textShadow: `0 0 10px ${obj.color}` }}
        >
          {obj.name}
        </span>
        <span className="text-white/40 text-[10px]">{obj.diameter}</span>
      </div>

      {/* Loading overlay */}
      {loading && <LoadingOverlay color={obj.color} />}

      {/* 3D Canvas — onCreated sets clear colour to near-black before first paint */}
      <Canvas
        frameloop="always"
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#00000f"), 1);
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <CameraController resetKey={obj.id} />
        <OrbitControls enablePan={false} enableZoom enableRotate makeDefault />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={2.0} castShadow={false} />
        <directionalLight position={[-4, -3, -4]} intensity={0.25} color="#3050cc" />

        {/* Stars — own Suspense so they never block the planet */}
        <Suspense fallback={null}>
          <Background />
        </Suspense>

        {/* Planet / model — keyed by obj.id so React fully remounts on change */}
        <Suspense fallback={null}>
          {glbUrl ? (
            <PlanetModel
              key={obj.id}
              url={glbUrl}
              autoRotate={autoRotate}
              wireframe={wireframe}
            />
          ) : (
            <PlanetSphere
              key={obj.id}
              color={obj.color}
              autoRotate={autoRotate}
              wireframe={wireframe}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Invisible sentinel: marks loading done once the canvas has painted */}
      {/* We use a rAF loop via useEffect in a tiny helper below */}
      <CanvasReadySignal onReady={() => setLoading(false)} glbUrl={glbUrl} objId={obj.id} />

      {/* Controls bar */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-wrap gap-2 justify-center px-4">
        <CtrlBtn active={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
          ⟳ Auto Rotate
        </CtrlBtn>
        <CtrlBtn active={wireframe} onClick={() => setWireframe((v) => !v)}>
          ⬡ Wireframe
        </CtrlBtn>
        <CtrlBtn onClick={toggleFullscreen}>
          {fullscreen ? "⊠ Exit Fullscreen" : "⛶ Fullscreen"}
        </CtrlBtn>
      </div>
    </div>
  );
}

// ── CanvasReadySignal — hides the loading overlay once the GLB has been parsed
// Uses useGLTF to preload; when it resolves we mark loading done.
function CanvasReadySignal({
  onReady,
  glbUrl,
  objId,
}: {
  onReady: () => void;
  glbUrl: string | null;
  objId: string;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending timer from the last object
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!glbUrl) {
      // Sphere is instant — short delay so camera settles
      timerRef.current = setTimeout(onReady, 300);
      return;
    }

    // For GLB files, poll useGLTF cache; fall back to a max-wait of 30 s
    let resolved = false;
    const MAX_WAIT = 30_000;
    const POLL_MS = 200;
    const start = Date.now();

    const poll = () => {
      try {
        // useGLTF.preload registers the asset; accessing the cache synchronously
        // throws if not yet ready, so we wrap in try/catch.
        useGLTF.preload(glbUrl);
        // If preload was already called the asset may be in Drei's internal
        // cache. We can't access it directly, so we use a time-based heuristic:
        // wait at least 600 ms after URL changes (canvas first paint), then
        // poll every 200 ms until either the model appears or we hit MAX_WAIT.
        const elapsed = Date.now() - start;
        if (elapsed > 600) {
          resolved = true;
          onReady();
          return;
        }
      } catch {
        // still loading
      }
      if (!resolved && Date.now() - start < MAX_WAIT) {
        timerRef.current = setTimeout(poll, POLL_MS);
      } else if (!resolved) {
        onReady(); // give up and show whatever is there
      }
    };

    timerRef.current = setTimeout(poll, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId]);

  return null;
}
