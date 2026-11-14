import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assemblyStations, riskTone, type RiskLevel } from "@/lib/manufacturing";
import { RotateCcw } from "lucide-react";

type Props = {
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
  compact?: boolean;
};

const palette: Record<RiskLevel, number> = {
  critical: 0xf17a78,
  high: 0xf7bd69,
  watch: 0xa996ff,
  stable: 0x6ed7a0,
};

function addBox(scene: THREE.Object3D, size: [number, number, number], position: [number, number, number], color: number, materialOptions: THREE.MeshStandardMaterialParameters = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.22, ...materialOptions }));
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function addRobot(scene: THREE.Object3D, x: number, z: number, risk: RiskLevel) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const glow = palette[risk];
  addBox(group, [0.48, 0.42, 0.48], [0, 0.25, 0], 0x163647, { emissive: glow, emissiveIntensity: 0.08 });
  const arm = new THREE.Group();
  arm.position.set(0, 0.48, 0);
  const lower = addBox(arm, [0.16, 0.72, 0.16], [0, 0.34, 0], glow, { emissive: glow, emissiveIntensity: 0.45 });
  lower.rotation.z = -0.25;
  const forearm = addBox(arm, [0.13, 0.62, 0.13], [0.12, 0.58, 0], 0xc9eff2, { emissive: glow, emissiveIntensity: 0.24 });
  forearm.rotation.z = 0.48;
  arm.userData.animation = { lower, forearm };
  group.add(arm);
  scene.add(group);
  return group;
}

export function FactoryTwinCanvas({ selectedStation, onSelectStation, compact = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x07131d, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.replaceChildren(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Interactive 3D synthetic automobile assembly line");

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x07131d, 10, 22);
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    camera.position.set(8.8, 6.6, 10.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 17;
    controls.target.set(0, 0.4, 0);

    scene.add(new THREE.HemisphereLight(0xa8e9ee, 0x06101b, 1.5));
    const key = new THREE.DirectionalLight(0x8eeaff, 2.6);
    key.position.set(4, 9, 3);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight(0x6c7bff, 2.2, 12);
    rim.position.set(-4, 3, -4);
    scene.add(rim);

    const floor = addBox(scene, [12, 0.15, 8], [0, -0.1, 0], 0x0d2635, { roughness: 0.88, metalness: 0.05 });
    floor.receiveShadow = true;
    const grid = new THREE.GridHelper(12, 24, 0x21506a, 0x123244);
    grid.position.y = 0.01;
    scene.add(grid);
    addBox(scene, [10.5, 0.12, 0.7], [0, 0.12, 0], 0x102f40, { emissive: 0x123f53, emissiveIntensity: 0.24 });
    addBox(scene, [10.5, 0.12, 0.7], [0, 0.12, -2.4], 0x102f40, { emissive: 0x123f53, emissiveIntensity: 0.24 });

    const stationMeshes = new Map<THREE.Object3D, string>();
    const stationPositions: Record<string, [number, number, number]> = {
      module: [-4, 0.42, -2.4], enclosure: [-1.35, 0.42, -2.4], harness: [1.35, 0.42, -2.4], cooling: [4, 0.42, -2.4], bms: [0, 0.42, 2.1],
    };
    assemblyStations.forEach(station => {
      const position = stationPositions[station.id];
      const group = new THREE.Group();
      group.position.set(...position);
      const color = palette[station.risk];
      const base = addBox(group, [2.05, 0.68, 1.25], [0, 0.3, 0], 0x142d3d, { emissive: color, emissiveIntensity: station.id === selectedStation ? 0.26 : 0.08 });
      base.userData.stationId = station.id;
      stationMeshes.set(base, station.id);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 }));
      beacon.position.set(0, 0.82, 0);
      group.add(beacon);
      const labelPlate = addBox(group, [1.45, 0.16, 0.06], [0, 0.72, 0.64], color, { emissive: color, emissiveIntensity: 0.42 });
      labelPlate.userData.stationId = station.id;
      stationMeshes.set(labelPlate, station.id);
      scene.add(group);
      addRobot(scene, position[0], position[2] + 0.92, station.risk);
    });

    for (let i = 0; i < 3; i += 1) {
      const part = addBox(scene, [0.22, 0.18, 0.16], [-4.5 + i * 2.8, 0.37, 0], 0x39e6d0, { emissive: 0x39e6d0, emissiveIntensity: 0.7, metalness: 0.5 });
      part.userData.travelIndex = i;
      part.castShadow = true;
    }
    const warehouse = new THREE.Group();
    addBox(warehouse, [1.2, 2.25, 2.7], [-5.1, 1.12, 2.2], 0x123244, { emissive: 0x39e6d0, emissiveIntensity: 0.05 });
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 2; col += 1) addBox(warehouse, [0.34, 0.34, 0.18], [-5.48 + col * 0.58, 0.42 + row * 0.58, 0.78], row === 2 ? 0xf17a78 : 0x39e6d0, { emissive: row === 2 ? 0xf17a78 : 0x39e6d0, emissiveIntensity: 0.38 });
    scene.add(warehouse);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...stationMeshes.keys()], false)[0];
      const stationId = hit ? stationMeshes.get(hit.object) : undefined;
      if (stationId) onSelectStation(stationId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frame = 0;
    let disposed = false;
    const render = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      controls.update();
      scene.traverse(object => {
        const data = object.userData as { travelIndex?: number; animation?: { lower: THREE.Object3D; forearm: THREE.Object3D } };
        if (!prefersReduced && typeof data.travelIndex === "number") object.position.x = -4.5 + ((elapsed * 0.6 + data.travelIndex * 2.8) % 8.4);
        if (!prefersReduced && data.animation) {
          data.animation.lower.rotation.z = -0.25 + Math.sin(elapsed * 1.2) * 0.18;
          data.animation.forearm.rotation.z = 0.48 + Math.cos(elapsed * 1.2) * 0.16;
        }
      });
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const width = host.clientWidth || 640;
      const height = host.clientHeight || (compact ? 280 : 430);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    render();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach(material => material.dispose()); else object.material.dispose(); }
      });
      renderer.dispose();
      host.replaceChildren();
    };
  }, [compact, onSelectStation, selectedStation, resetNonce]);

  return <div ref={hostRef} className={`factory-twin-canvas ${compact ? "compact" : ""}`}><button className="twin-reset" onClick={() => setResetNonce(value => value + 1)} aria-label="Reset camera"><RotateCcw size={13} />Reset camera</button>{fallback && <div className="factory-twin-fallback"><div className="fallback-track" />{assemblyStations.map(station => <button key={station.id} className={`fallback-station ${riskTone[station.risk]} ${selectedStation === station.id ? "selected" : ""}`} onClick={() => onSelectStation(station.id)}><span>{station.name}</span><small>{station.availability}% available</small></button>)}</div>}</div>;
}
