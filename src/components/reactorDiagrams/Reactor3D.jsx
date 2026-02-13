import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─── MATERIALS ───────────────────────────────────────────────────────────────
function createMaterials() {
  return {
    vessel: new THREE.MeshStandardMaterial({ color: 0xb8b4a8, metalness: 0.78, roughness: 0.22 }),
    vesselDark: new THREE.MeshStandardMaterial({ color: 0x8c8880, metalness: 0.82, roughness: 0.18 }),
    containment: new THREE.MeshStandardMaterial({ color: 0xd4c8b0, metalness: 0.04, roughness: 0.9, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    containmentSolid: new THREE.MeshStandardMaterial({ color: 0xc8bc9c, metalness: 0.04, roughness: 0.92 }),
    fuel: new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: new THREE.Color(0xff5500), emissiveIntensity: 1.4, metalness: 0.05, roughness: 0.65 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x909890, metalness: 0.88, roughness: 0.14 }),
    base: new THREE.MeshStandardMaterial({ color: 0x706860, metalness: 0.08, roughness: 0.95 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x4a4840, metalness: 0.0, roughness: 1.0 }),
    water: new THREE.MeshStandardMaterial({ color: 0x5080a0, metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.55 }),
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rod(group, geo, mat, count, positions) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  positions.forEach((pos, i) => {
    dummy.position.set(pos[0], pos[1] ?? 0, pos[2]);
    if (pos[3] != null) dummy.rotation.z = pos[3];
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return mesh;
}

function tube(group, points, radius, mat, segments = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, false), mat);
  group.add(mesh);
  return mesh;
}

function gridPositions(nx, nz, spacingX, spacingZ, yOffset = 0) {
  const pos = [];
  for (let x = 0; x < nx; x++)
    for (let z = 0; z < nz; z++)
      pos.push([(x - (nx - 1) / 2) * spacingX, yOffset, (z - (nz - 1) / 2) * spacingZ]);
  return pos;
}

// ─── PWR ─────────────────────────────────────────────────────────────────────
function buildPWR(g, m) {
  // Containment dome
  const cCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 3.6, 48, 1, true), m.containment);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.containment);
  cDome.position.y = 1.8;
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.35, 48), m.containmentSolid);
  cBase.position.y = -2.0;
  g.add(cCyl, cDome, cBase);

  // Reactor pressure vessel
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.9, 32), m.vessel);
  const vTop = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
  vTop.position.y = 1.45;
  const vBot = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.vessel);
  vBot.position.y = -1.45;
  g.add(v, vTop, vBot);

  // Fuel rods (9×9 instanced)
  const rodGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.9, 6);
  rod(g, rodGeo, m.fuel, 81, gridPositions(9, 9, 0.072, 0.072, -0.05));

  // Steam generators (2, flanking)
  for (const side of [-1, 1]) {
    const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.5, 24), m.vessel);
    sg.position.set(side * 1.85, 0.1, 0);
    const sgTop = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
    sgTop.position.set(side * 1.85, 1.35, 0);
    g.add(sg, sgTop);

    // Hot leg pipe
    tube(g, [[side * 0.72, 0.5, 0], [side * 1.2, 0.85, 0], [side * 1.85, 0.5, 0]], 0.10, m.pipe);
    // Cold leg pipe
    tube(g, [[side * 1.85, -0.5, 0], [side * 1.2, -0.82, 0], [side * 0.72, -0.5, 0]], 0.10, m.pipe);
  }

  // Pressurizer
  const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.15, 16), m.vessel);
  pr.position.set(0.55, 2.1, 0.55);
  const prTop = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
  prTop.position.set(0.55, 2.68, 0.55);
  g.add(pr, prTop);
  tube(g, [[0.55, 1.45, 0.55], [0.55, 0.8, 0.2], [0.3, 0.5, 0]], 0.07, m.pipe);
}

// ─── BWR ─────────────────────────────────────────────────────────────────────
function buildBWR(g, m) {
  // Containment (Mark I — cylindrical + torus suppression pool)
  const cCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.2, 48, 1, true), m.containment);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.containment);
  cDome.position.y = 1.6;
  const suppPool = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.38, 16, 48), m.containment);
  suppPool.rotation.x = Math.PI / 2;
  suppPool.position.y = -1.6;
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 0.3, 48), m.containmentSolid);
  cBase.position.y = -2.05;
  g.add(cCyl, cDome, suppPool, cBase);

  // Larger vessel (steam separators inside = bigger)
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 3.3, 32), m.vessel);
  const vTop = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
  vTop.position.y = 1.65;
  const vBot = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.vessel);
  vBot.position.y = -1.65;
  g.add(v, vTop, vBot);

  // Fuel rods
  const rodGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.9, 6);
  rod(g, rodGeo, m.fuel, 81, gridPositions(9, 9, 0.08, 0.08, -0.3));

  // Steam separator ring (inside vessel top)
  const sep = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 32), m.vesselDark);
  sep.position.y = 0.9;
  g.add(sep);

  // Direct steam outlet pipes (going up)
  for (const [x, z] of [[0.3, 0], [-0.3, 0]]) {
    tube(g, [[x, 1.65, z], [x * 1.3, 2.3, z], [x * 1.6, 3.0, z]], 0.11, m.pipe, 12);
  }
}

// ─── PHWR (CANDU) ────────────────────────────────────────────────────────────
function buildPHWR(g, m) {
  // Calandria (horizontal cylinder)
  const calandria = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.8, 32), m.vessel);
  calandria.rotation.z = Math.PI / 2;
  g.add(calandria);

  // End shields
  for (const x of [-1.9, 1.9]) {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.22, 32), m.vesselDark);
    shield.rotation.z = Math.PI / 2;
    shield.position.x = x;
    g.add(shield);
  }

  // Fuel channels (horizontal, instanced)
  const chanGeo = new THREE.CylinderGeometry(0.065, 0.065, 4.0, 8);
  const chanPositions = [];
  for (let y = -3; y <= 3; y++)
    for (let z = -3; z <= 3; z++)
      chanPositions.push([0, y * 0.15, z * 0.15, Math.PI / 2]);
  rod(g, chanGeo, m.pipe, chanPositions.length, chanPositions);

  // Fuel bundles inside channels (glowing, central 5×5)
  const fuelGeo = new THREE.CylinderGeometry(0.042, 0.042, 3.6, 6);
  const fuelPos = [];
  for (let y = -2; y <= 2; y++)
    for (let z = -2; z <= 2; z++)
      fuelPos.push([0, y * 0.15, z * 0.15, Math.PI / 2]);
  rod(g, fuelGeo, m.fuel, fuelPos.length, fuelPos);

  // Moderator vessel (transparent outer)
  const mod = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 4.0, 32, 1, true), m.containment);
  mod.rotation.z = Math.PI / 2;
  g.add(mod);

  // Support legs
  for (const x of [-1.5, 1.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 0.14), m.base);
    leg.position.set(x, -1.55, 0);
    g.add(leg);
  }
  const footer = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.8), m.base);
  footer.position.y = -2.3;
  g.add(footer);

  // D2O header pipes (top and bottom)
  for (const y of [0.8, -0.8]) {
    tube(g, [[-1.8, y, 0], [0, y + 0.3, 0], [1.8, y, 0]], 0.12, m.water, 15);
  }
}

// ─── VVER ─────────────────────────────────────────────────────────────────────
function buildVVER(g, m) {
  // Containment (double-wall)
  const cCyl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.8, 6, 1, true), m.containment);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 6, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.containment);
  cDome.position.y = 1.9;
  g.add(cCyl, cDome);

  // Hexagonal reactor vessel
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 3.0, 6), m.vessel);
  const vTop = new THREE.Mesh(new THREE.SphereGeometry(0.76, 6, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
  vTop.position.y = 1.5;
  g.add(v, vTop);

  // Hexagonal fuel assembly (rings)
  const hexRodGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.9, 6);
  const hexPos = [];
  hexPos.push([0, 0, 0]); // center
  for (let ring = 1; ring <= 4; ring++) {
    const count = ring * 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = ring * 0.1;
      const x = r * Math.cos(angle), z = r * Math.sin(angle);
      if (Math.sqrt(x * x + z * z) < 0.62) hexPos.push([x, 0, z]);
    }
  }
  rod(g, hexRodGeo, m.fuel, hexPos.length, hexPos);

  // Horizontal steam generators (4× — distinctive VVER feature)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(angle) * 1.85, cz = Math.sin(angle) * 1.85;
    const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.9, 16), m.vessel);
    sg.rotation.z = Math.PI / 2;
    sg.rotation.y = angle;
    sg.position.set(cx, 0.2, cz);
    g.add(sg);
    tube(g, [[Math.cos(angle) * 0.76, 0.4, Math.sin(angle) * 0.76], [Math.cos(angle) * 1.3, 0.5, Math.sin(angle) * 1.3], [cx, 0.2, cz]], 0.08, m.pipe);
    tube(g, [[cx, -0.2, cz], [Math.cos(angle) * 1.3, -0.4, Math.sin(angle) * 1.3], [Math.cos(angle) * 0.76, -0.4, Math.sin(angle) * 0.76]], 0.08, m.pipe);
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.3, 6), m.base);
  base.position.y = -2.05;
  g.add(base);
}

// ─── SMR ─────────────────────────────────────────────────────────────────────
function buildSMR(g, m) {
  // Ground plane (partially buried)
  const gnd = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.08, 32), m.ground);
  gnd.position.y = -1.6;
  g.add(gnd);

  // Underground shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.0, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3530, metalness: 0.1, roughness: 0.9, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  shaft.position.y = -2.6;
  g.add(shaft);

  // Integrated reactor module (compact, all-in-one)
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 3.2, 32), m.vessel);
  const vTop = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.vessel);
  vTop.position.y = 1.6;
  const vBot = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.vessel);
  vBot.position.y = -1.6;
  g.add(v, vTop, vBot);

  // Integrated steam generator (annular ring inside vessel)
  const sgRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 12, 32), m.vesselDark);
  sgRing.position.y = 0.6;
  g.add(sgRing);

  // Fuel rods (compact 7×7)
  const rodGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.5, 6);
  rod(g, rodGeo, m.fuel, 49, gridPositions(7, 7, 0.072, 0.072, -0.4));

  // Passive safety water tank (around the vessel)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.4, 32, 1, true), m.water);
  g.add(tank);

  // Small outer containment
  const cCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.6, 32, 1, true), m.containment);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.containment);
  cDome.position.y = 1.8;
  g.add(cCyl, cDome);
}

// ─── OTHER (Advanced — FBR/MSR/HTGR) ─────────────────────────────────────────
function buildOther(g, m) {
  // Hexagonal outer shell
  const cHex = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.2, 6, 1, true), m.containment);
  const cTop = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.1, 6), m.containmentSolid);
  cTop.position.y = 2.15;
  g.add(cHex, cTop);

  // Inner vessel (hexagonal)
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 3.2, 6), m.vessel);
  g.add(v);

  // Core (hexagonal fuel zone)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.6, 6), m.fuel);
  core.position.y = -0.3;
  g.add(core);

  // Reflector ring
  const reflector = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 8, 6), m.vesselDark);
  reflector.position.y = -0.3;
  g.add(reflector);

  // Coolant (sodium/salt) pipes — 6 large loops
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const cx = Math.cos(angle) * 1.4, cz = Math.sin(angle) * 1.4;
    tube(g, [
      [Math.cos(angle) * 0.82, 0.6, Math.sin(angle) * 0.82],
      [cx, 1.2, cz],
      [cx, -1.0, cz],
      [Math.cos(angle) * 0.82, -0.6, Math.sin(angle) * 0.82],
    ], 0.095, m.pipe, 18);
  }

  // Heat exchanger modules (alternating)
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const hx = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 12), m.vesselDark);
    hx.position.set(Math.cos(angle) * 1.4, 0.1, Math.sin(angle) * 1.4);
    g.add(hx);
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.3, 6), m.base);
  base.position.y = -2.2;
  g.add(base);
}

// ─── DISPATCHER ───────────────────────────────────────────────────────────────
function buildReactor(group, type, mats) {
  switch (type) {
    case "PWR":  return buildPWR(group, mats);
    case "BWR":  return buildBWR(group, mats);
    case "PHWR": return buildPHWR(group, mats);
    case "VVER": return buildVVER(group, mats);
    case "SMR":  return buildSMR(group, mats);
    default:     return buildOther(group, mats);
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Reactor3D({ type = "PWR" }) {
  const mountRef = useRef(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 680;
    const h = 360;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0d1520, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1520, 0.07);

    // Subtle grid floor
    const grid = new THREE.GridHelper(8, 16, 0x1a2a3a, 0x152030);
    grid.position.y = -2.35;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    // PHWR is horizontal so pull back more
    camera.position.set(type === "PHWR" ? 6.5 : 5.2, type === "PHWR" ? 2.5 : 3.0, type === "PHWR" ? 6.5 : 5.2);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xfff0e0, 0.7));
    const dir = new THREE.DirectionalLight(0xfff8f0, 1.6);
    dir.position.set(6, 10, 6);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.35);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
    const core = new THREE.PointLight(0xff6600, 3.5, 5);
    core.position.set(0, 0, 0);
    scene.add(core);
    const rim = new THREE.DirectionalLight(0x4488bb, 0.4);
    rim.position.set(0, -4, -6);
    scene.add(rim);

    // Build reactor
    const group = new THREE.Group();
    const mats = createMaterials();
    buildReactor(group, type, mats);
    group.rotation.y = Math.PI / 5;
    scene.add(group);

    // Drag / touch rotation
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let velX = 0;

    const getXY = (e) => ({
      x: e.touches ? e.touches[0].clientX : e.clientX,
      y: e.touches ? e.touches[0].clientY : e.clientY,
    });

    const onDown = (e) => { isDragging = true; const p = getXY(e); prevX = p.x; prevY = p.y; velX = 0; renderer.domElement.style.cursor = "grabbing"; };
    const onMove = (e) => {
      if (!isDragging) return;
      const p = getXY(e);
      velX = (p.x - prevX) * 0.013;
      const dy = (p.y - prevY) * 0.009;
      group.rotation.x = Math.max(-0.65, Math.min(0.65, group.rotation.x + dy));
      prevX = p.x; prevY = p.y;
    };
    const onUp = () => { isDragging = false; renderer.domElement.style.cursor = "grab"; };

    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    // Animation
    let animId;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.016;
      if (!isDragging) {
        group.rotation.y += 0.004;
        velX *= 0.9;
      } else {
        group.rotation.y += velX;
      }
      // Pulsing reactor glow
      core.intensity = 3.0 + Math.sin(t * 1.8) * 0.9;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("mousedown", onDown);
      renderer.domElement.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      Object.values(mats).forEach(mat => mat.dispose());
      scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [type]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mountRef} style={{ width: "100%", height: 360, cursor: "grab", borderRadius: 8, overflow: "hidden" }} />
      <div style={{
        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans',sans-serif",
        pointerEvents: "none", transition: "opacity 0.6s",
        opacity: hint ? 1 : 0, whiteSpace: "nowrap",
      }}>
        Drag to rotate · {type} reactor
      </div>
    </div>
  );
}
