import * as THREE from "three";
import { FLUID } from "../schematic/kit.jsx";

// Procedural cutaway models for each reactor design.
//
// Layout convention (group-local): y is up, ground at y = 0, the reactor sits
// at the origin, the turbine hall runs along +x, and the camera looks from +z.
// Shells are cut open on their +z side so internals face the viewer.
//
// buildReactorScene(type) → { root, hotspots, update(dt), dispose() }

const TAU = Math.PI * 2;
const CUT = 1.75; // radians removed from shells, centred on +z

/* ───────────────────────── materials ───────────────────────── */

function createMaterials() {
  const std = (params) => new THREE.MeshStandardMaterial(params);
  const fluidPipe = {};
  const fluidBead = {};
  for (const [key, { color }] of Object.entries(FLUID)) {
    fluidPipe[key] = std({ color, metalness: 0.2, roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false });
    fluidBead[key] = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35) });
  }
  return {
    concrete: std({ color: 0x6c675f, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }),
    concreteDark: std({ color: 0x6d6860, roughness: 0.95, metalness: 0 }),
    steel: std({ color: 0xc3c7cc, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide }),
    steelDark: std({ color: 0x5f656d, roughness: 0.38, metalness: 0.8 }),
    paint: std({ color: 0xcfc9bd, roughness: 0.5, metalness: 0.08, side: THREE.DoubleSide }),
    paintBlue: std({ color: 0x40607f, roughness: 0.45, metalness: 0.2 }),
    graphite: std({ color: 0x34343a, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide }),
    fuel: std({ color: 0xffa640, emissive: 0xff7a1a, emissiveIntensity: 1.15, roughness: 0.55, metalness: 0 }),
    pebble: std({ color: 0x2b2b2f, emissive: 0xff8a2a, emissiveIntensity: 0.55, roughness: 0.6 }),
    cherenkov: new THREE.MeshBasicMaterial({ color: 0x3f8fff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
    heatGlow: new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f78b8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false }),
    heavyWater: new THREE.MeshStandardMaterial({ color: 0x6f8cff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    ground: std({ color: 0x0e141c, roughness: 1, metalness: 0 }),
    gold: std({ color: 0xd4a54a, roughness: 0.35, metalness: 0.6 }),
    fluidPipe,
    fluidBead,
  };
}

/* ───────────────────────── geometry helpers ───────────────────────── */

// Capsule profile (bottom pole → top pole) for LatheGeometry.
function capsuleProfile(r, h, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r + 1e-4, Math.sin(a) * r - h / 2));
  }
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r + 1e-4, Math.sin(a) * r + h / 2));
  }
  return pts;
}

function lathe(profile, material, { cut = 0, segments = 48 } = {}) {
  const geometry = cut
    ? new THREE.LatheGeometry(profile, segments, cut / 2, TAU - cut)
    : new THREE.LatheGeometry(profile, segments);
  return new THREE.Mesh(geometry, material);
}

function cylinder(r, h, material, { segments = 32, axis = "y", openEnded = false } = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments, 1, openEnded), material);
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function at(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

// Polyline with rounded corners as a CurvePath (for pipes and flow beads).
function roundedPath(points, radius = 0.22) {
  const v = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  let start = v[0].clone();
  for (let i = 1; i < v.length - 1; i += 1) {
    const prev = v[i - 1];
    const corner = v[i];
    const next = v[i + 1];
    const inDir = corner.clone().sub(prev);
    const outDir = next.clone().sub(corner);
    const r = Math.min(radius, inDir.length() / 2, outDir.length() / 2);
    const a = corner.clone().sub(inDir.normalize().multiplyScalar(r));
    const b = corner.clone().add(outDir.normalize().multiplyScalar(r));
    if (a.distanceTo(start) > 1e-4) path.add(new THREE.LineCurve3(start, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner.clone(), b));
    start = b;
  }
  path.add(new THREE.LineCurve3(start, v[v.length - 1]));
  return path;
}

/* ───────────────────────── scene kit ───────────────────────── */

class Kit {
  constructor() {
    this.root = new THREE.Group();
    this.m = createMaterials();
    this.flows = [];
    this.hotspots = [];
    this.animated = [];
  }

  add(object, parent = this.root) {
    parent.add(object);
    return object;
  }

  hotspot(id, anchor) {
    this.hotspots.push({ id, anchor });
  }

  ground(radius = 9) {
    const disc = this.add(new THREE.Mesh(new THREE.CircleGeometry(radius, 64), this.m.ground));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.01;
    disc.userData.noBounds = true;
    const grid = this.add(new THREE.PolarGridHelper(radius, 16, 8, 64, 0x1c2735, 0x151e29));
    grid.position.y = 0.001;
    grid.userData.noBounds = true;
    return disc;
  }

  // Cylindrical containment with an elliptical dome, cut open toward +z.
  containment({ r = 3.2, wallH = 3.4, domeRy = 1.8, thick = 0.18 } = {}) {
    const outer = [];
    const inner = [];
    outer.push(new THREE.Vector2(r, 0), new THREE.Vector2(r, wallH));
    inner.push(new THREE.Vector2(r - thick, 0), new THREE.Vector2(r - thick, wallH));
    for (let i = 1; i <= 16; i += 1) {
      const a = (i / 16) * (Math.PI / 2);
      outer.push(new THREE.Vector2(Math.max(1e-3, Math.cos(a) * r), wallH + Math.sin(a) * domeRy));
      inner.push(new THREE.Vector2(Math.max(1e-3, Math.cos(a) * (r - thick)), wallH + Math.sin(a) * (domeRy - thick)));
    }
    const shell = this.add(lathe([...outer, ...inner.reverse()], this.m.concrete, { cut: CUT, segments: 64 }));
    shell.userData.part = "containment";
    this.add(at(cylinder(r - thick, 0.12, this.m.concreteDark, { segments: 64 }), 0, 0.06, 0));
    this.hotspot("containment", [-(r * 0.72), wallH + domeRy * 0.62, -r * 0.3]);
    return shell;
  }

  // Pressure vessel shell (capsule), cut open toward +z.
  vessel({ r, h, y, x = 0, z = 0, material = this.m.steel, cut = CUT * 0.8 }) {
    return this.add(at(lathe(capsuleProfile(r, h), material, { cut }), x, y, z));
  }

  // Square fuel lattice (instanced assemblies) inside radius r.
  core({ r, y0, y1, x = 0, z = 0, pitch = 0.1, hex = false, glow = "cherenkov" }) {
    const positions = [];
    const rows = Math.ceil(r / pitch);
    for (let i = -rows; i <= rows; i += 1) {
      for (let j = -rows; j <= rows; j += 1) {
        const px = hex ? (i + (j % 2) * 0.5) * pitch : i * pitch;
        const pz = hex ? j * pitch * 0.866 : j * pitch;
        if (px * px + pz * pz <= (r - pitch * 0.5) ** 2) positions.push([px, pz]);
      }
    }
    const h = y1 - y0;
    const geometry = hex
      ? new THREE.CylinderGeometry(pitch * 0.46, pitch * 0.46, h, 6)
      : new THREE.BoxGeometry(pitch * 0.82, h, pitch * 0.82);
    const mesh = new THREE.InstancedMesh(geometry, this.m.fuel, positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach(([px, pz], i) => {
      dummy.position.set(x + px, (y0 + y1) / 2, z + pz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    this.add(mesh);
    const glowMesh = this.add(at(cylinder(r * 1.12, h * 1.25, this.m[glow], { segments: 32 }), x, (y0 + y1) / 2, z));
    this.animated.push((t) => {
      glowMesh.material.opacity = (glow === "cherenkov" ? 0.13 : 0.12) + Math.sin(t * 1.6) * 0.04;
    });
    return mesh;
  }

  rods({ x = 0, z = 0, y0, y1, count = 5, spread = 0.26, material = this.m.steelDark, bob = 0.05 }) {
    const group = this.add(new THREE.Group());
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      const px = i === 0 ? 0 : Math.cos(a) * spread;
      const pz = i === 0 ? 0 : Math.sin(a) * spread;
      group.add(at(cylinder(0.028, y1 - y0, material, { segments: 10 }), x + px, (y0 + y1) / 2, z + pz));
    }
    const base = group.position.y;
    this.animated.push((t) => {
      group.position.y = base + Math.sin(t * 0.5) * bob;
    });
    return group;
  }

  // Vertical U-tube steam generator (narrow lower shell, wider steam drum).
  steamGenerator({ x, z, y0 = 0.35, r = 0.38, R = 0.56, h = 4.2 }) {
    const pts = [
      new THREE.Vector2(1e-3, y0),
      new THREE.Vector2(r * 0.7, y0 + 0.05),
      new THREE.Vector2(r, y0 + 0.25),
      new THREE.Vector2(r, y0 + h * 0.58),
      new THREE.Vector2(R, y0 + h * 0.7),
      new THREE.Vector2(R, y0 + h * 0.9),
      new THREE.Vector2(R * 0.72, y0 + h * 0.98),
      new THREE.Vector2(1e-3, y0 + h),
    ];
    const mesh = this.add(at(lathe(pts, this.m.paint, { segments: 40 }), x, 0, z));
    return { mesh, top: y0 + h, bottom: y0 };
  }

  pump({ x, y = 0, z, scale = 1 }) {
    const group = this.add(new THREE.Group());
    group.add(at(cylinder(0.22 * scale, 0.42 * scale, this.m.steel), 0, 0.21 * scale, 0));
    group.add(at(cylinder(0.17 * scale, 0.5 * scale, this.m.paintBlue), 0, 0.67 * scale, 0));
    group.position.set(x, y, z);
    return group;
  }

  pipe(points, fluid, { r = 0.08, corner = 0.25, beads = 1 } = {}) {
    const path = roundedPath(points, corner);
    const length = path.getLength();
    const segments = Math.max(12, Math.round(length * 14));
    this.add(new THREE.Mesh(new THREE.TubeGeometry(path, segments, r, 12, false), this.m.fluidPipe[fluid]));
    this.flows.push({ path, fluid, r, length, count: Math.max(3, Math.round(length * 3.2 * beads)) });
    return path;
  }

  turbineHall({ x0 = 4.6, y = 1.4, z = -0.9 } = {}) {
    const m = this.m;
    this.add(at(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.62, 1.6), m.concreteDark), x0 + 2.4, 0.31, z));
    this.add(at(cylinder(0.42, 0.9, m.steel, { axis: "x" }), x0 + 0.5, y, z));
    this.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.72, 0.4, 32).rotateZ(Math.PI / 2), m.steel), x0 + 1.15, y, z));
    this.add(at(cylinder(0.72, 0.7, m.paint, { axis: "x" }), x0 + 1.7, y, z));
    this.add(at(cylinder(0.72, 0.7, m.paint, { axis: "x" }), x0 + 2.5, y, z));
    this.add(at(cylinder(0.08, 3.9, m.steelDark, { axis: "x" }), x0 + 2.2, y, z));
    this.add(at(cylinder(0.5, 1.2, m.paintBlue, { axis: "x" }), x0 + 3.7, y, z));
    // Condenser under the low-pressure turbines.
    this.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.3), m.steelDark), x0 + 2.1, 0.62 + 0.0, z + 1.2));
    this.hotspot("turbine", [x0 + 1.7, y + 0.75, z]);
    this.hotspot("generator", [x0 + 3.7, y + 0.52, z]);
    this.hotspot("condenser", [x0 + 2.1, 0.95, z + 1.2]);
    return { steamIn: [x0 + 0.05, y, z], feedOut: [x0 + 1.2, 0.5, z + 1.2] };
  }

  // Instanced glowing beads that travel along every registered flow path.
  buildFlows() {
    const byFluid = new Map();
    for (const flow of this.flows) {
      if (!byFluid.has(flow.fluid)) byFluid.set(flow.fluid, []);
      byFluid.get(flow.fluid).push(flow);
    }
    const systems = [];
    for (const [fluid, flows] of byFluid) {
      const total = flows.reduce((sum, f) => sum + f.count, 0);
      const r = Math.min(...flows.map((f) => f.r)) * 0.78;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), this.m.fluidBead[fluid], total);
      mesh.frustumCulled = false;
      this.add(mesh);
      systems.push({ mesh, flows });
    }
    const dummy = new THREE.Object3D();
    const point = new THREE.Vector3();
    return (t) => {
      for (const { mesh, flows } of systems) {
        let index = 0;
        for (const flow of flows) {
          const speed = 0.55 / flow.length; // ~0.55 units/s along the pipe
          for (let i = 0; i < flow.count; i += 1) {
            const u = (i / flow.count + t * speed) % 1;
            flow.path.getPointAt(u, point);
            dummy.position.copy(point);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            index += 1;
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
  }

  finish() {
    const updateFlows = this.buildFlows();
    const animated = this.animated;
    const root = this.root;
    const materials = this.m;
    return {
      root,
      hotspots: this.hotspots,
      update(t, { motion = true } = {}) {
        updateFlows(motion ? t : 0);
        if (motion) animated.forEach((fn) => fn(t));
      },
      dispose() {
        root.traverse((object) => {
          object.geometry?.dispose?.();
        });
        const all = [
          ...Object.values(materials).filter((mat) => mat?.isMaterial),
          ...Object.values(materials.fluidPipe),
          ...Object.values(materials.fluidBead),
        ];
        all.forEach((mat) => mat.dispose());
      },
    };
  }
}

/* ───────────────────────── designs ───────────────────────── */

// Feedwater from the condenser back into containment at `target`.
function feedLine(k, plant, target, viaZ = 0.6) {
  const [fx, fy, fz] = plant.feedOut;
  const [tx, ty, tz] = target;
  k.pipe([[fx, fy, fz], [2.6, fy, fz], [2.6, fy, viaZ], [2.6, ty, viaZ], [2.6, ty, tz], [tx, ty, tz]], "feed", { r: 0.07 });
}

function steamLine(k, plant, from, rise = 5.0) {
  const [sx, sy, sz] = from;
  const [px, py, pz] = plant.steamIn;
  k.pipe([[sx, sy, sz], [sx, rise, sz], [4.1, rise, sz], [4.1, py, sz], [4.1, py, pz], [px, py, pz]], "steam", { r: 0.1 });
}

function buildPWR(k, { vver = false } = {}) {
  k.ground();
  k.containment();
  const vr = 0.55;
  k.vessel({ r: vr, h: 1.9, y: 1.9 });
  k.core({ r: 0.42, y0: 0.85, y1: 1.95, hex: vver, pitch: vver ? 0.095 : 0.1 });
  k.rods({ y0: 2.0, y1: 3.0 });
  for (let i = 0; i < 5; i += 1) k.add(at(cylinder(0.035, 0.5, k.m.steelDark, { segments: 8 }), (i - 2) * 0.12, 3.55, -0.05));
  k.hotspot("vessel", [vr * 0.9, 2.9, 0.2]);
  k.hotspot("core", [0, 1.4, 0.3]);
  k.hotspot("rods", [0, 3.7, 0]);
  if (vver) {
    k.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.35, 24), k.m.concreteDark), 0, 0.2, 0));
    k.hotspot("corecatcher", [0.5, 0.25, 0.2]);
  }

  // Pressurizer on the left loop.
  k.vessel({ r: 0.26, h: 1.2, y: 3.0, x: -1.25, z: 0.95, material: k.m.paint, cut: 0 });
  k.pipe([[-1.25, 2.2, 0.95], [-1.25, 2.5, 0.95], [-0.9, 2.5, 0.2]], "hot", { r: 0.05 });
  k.hotspot("pressurizer", [-1.25, 3.9, 0.95]);

  const plant = k.turbineHall();
  [-1, 1].forEach((side, i) => {
    const sgx = 1.75 * side;
    const sgz = -1.0;
    let top;
    if (vver) {
      // Horizontal steam generator: a long drum lying along z.
      const drum = k.add(at(capsuleCylinderZ(0.5, 1.9, k.m.paint), sgx, 2.2, -0.9));
      drum.userData.part = "sg";
      top = [sgx, 2.7, -0.9];
      k.pipe([[0.5 * side, 2.55, -0.15], [sgx * 0.6, 2.55, -0.7], [sgx, 2.55, -0.7], [sgx, 2.25, -0.7]], "hot");
      k.pipe([[sgx, 1.75, -1.4], [sgx, 0.5, -1.4], [sgx * 0.62, 0.5, 0.35], [sgx * 0.62, 1.1, 0.35]], "cold");
      k.pump({ x: sgx * 0.62, z: 0.35, y: 0.3 });
      k.pipe([[sgx * 0.62, 1.2, 0.35], [sgx * 0.62, 2.25, 0.35], [0.5 * side, 2.25, 0.12]], "cold");
    } else {
      const sg = k.steamGenerator({ x: sgx, z: sgz });
      top = [sgx, sg.top - 0.05, sgz];
      k.pipe([[0.5 * side, 2.55, -0.18], [1.2 * side, 2.55, -0.6], [1.35 * side, 2.55, -0.72], [1.35 * side, 0.4, -0.72], [sgx, 0.4, sgz]], "hot");
      k.pipe([[sgx, 0.4, sgz], [sgx * 1.08, 0.4, 0.3], [sgx * 0.7, 0.4, 0.3], [sgx * 0.7, 0.45, 0.3]], "cold");
      k.pump({ x: sgx * 0.7, z: 0.3, y: 0.3 });
      k.pipe([[sgx * 0.7, 1.2, 0.3], [sgx * 0.7, 2.25, 0.3], [0.5 * side, 2.25, 0.14]], "cold");
    }
    steamLine(k, plant, top, 5.0 + i * 0.22);
    if (i === 1) {
      k.hotspot("sg", vver ? [sgx, 2.75, -0.2] : [sgx, 3.9, sgz + 0.5]);
      k.hotspot("rcp", [sgx * 0.7, 1.35, vver ? 0.35 : 0.3]);
      feedLine(k, plant, vver ? [sgx + 0.52, 2.0, -0.9] : [sgx + 0.4, 2.9, sgz]);
    }
  });
  k.hotspot("steamline", [1.8, 5.1, -1.0]);
}

// Horizontal drum (capsule along z) used for VVER steam generators.
function capsuleCylinderZ(r, len, material) {
  const mesh = lathe(capsuleProfile(r, len), material, { segments: 32 });
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function buildBWR(k) {
  k.ground();
  // Mark I-style containment: light-bulb drywell over a torus suppression pool.
  const pts = [];
  const drywell = [
    [0.01, 0.4], [1.6, 0.4], [2.1, 1.0], [2.15, 1.9], [1.6, 2.9], [1.05, 3.5], [1.05, 5.0], [0.9, 5.4], [0.01, 5.55],
  ];
  drywell.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const shell = k.add(lathe(pts, k.m.steel, { cut: CUT, segments: 64 }));
  shell.material = k.m.steel;
  const torus = k.add(at(new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.42, 16, 64, TAU - CUT), k.m.steel), 0, 0.45, 0));
  torus.rotation.x = Math.PI / 2;
  torus.rotation.z = -Math.PI / 2 + CUT / 2;
  const pool = k.add(at(new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.3, 12, 64, TAU - CUT), k.m.water), 0, 0.42, 0));
  pool.rotation.copy(torus.rotation);
  k.hotspot("containment", [-1.6, 3.4, -1.0]);

  k.vessel({ r: 0.6, h: 3.1, y: 2.55 });
  k.core({ r: 0.46, y0: 1.05, y1: 2.15 });
  // Steam separators & dryers above the core.
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * TAU;
    k.add(at(cylinder(0.08, 0.6, k.m.steelDark, { segments: 12 }), Math.cos(a) * 0.3, 3.05, Math.sin(a) * 0.3));
  }
  k.add(at(cylinder(0.5, 0.35, k.m.steelDark, { segments: 24 }), 0, 3.65, 0));
  // Bottom-entry control rod drives.
  k.rods({ y0: 0.3, y1: 1.2, count: 7, spread: 0.3 });
  k.hotspot("vessel", [0.55, 3.2, 0.25]);
  k.hotspot("core", [0, 1.6, 0.3]);
  k.hotspot("separators", [0, 3.3, 0.35]);
  k.hotspot("rods", [0.3, 0.55, 0.3]);

  // Recirculation loops.
  [-1, 1].forEach((side) => {
    k.pipe([[0.58 * side, 1.9, 0.1], [1.25 * side, 1.9, 0.35], [1.25 * side, 1.1, 0.35]], "water", { r: 0.07 });
    k.pump({ x: 1.25 * side, y: 0.45, z: 0.35, scale: 0.9 });
    k.pipe([[1.25 * side, 0.5, 0.35], [0.9 * side, 0.9, 0.25], [0.55 * side, 1.2, 0.1]], "water", { r: 0.07 });
  });
  k.hotspot("recirc", [1.25, 1.4, 0.35]);

  const plant = k.turbineHall();
  steamLine(k, plant, [0.2, 4.1, -0.35], 5.9);
  steamLine(k, plant, [-0.2, 4.1, -0.45], 6.1);
  feedLine(k, plant, [0.6, 3.0, -0.2], -0.8);
  k.hotspot("steamline", [2.2, 6.0, -0.4]);
}

function buildPHWR(k) {
  k.ground();
  k.containment({ r: 3.4, wallH: 3.8, domeRy: 1.7 });
  // Horizontal calandria along x with fuel channels.
  const calandria = k.add(at(lathe(capsuleProfile(1.0, 1.6), k.m.steel, { cut: CUT }), 0, 1.6, 0.3));
  calandria.rotation.z = Math.PI / 2;
  calandria.rotation.y = 0;
  const moderator = k.add(at(cylinder(0.95, 2.2, k.m.heavyWater, { axis: "x", segments: 32 }), 0, 1.6, 0.3));
  moderator.renderOrder = 1;
  const channels = [];
  for (let i = -3; i <= 3; i += 1) {
    for (let j = -3; j <= 3; j += 1) {
      if (i * i + j * j <= 9) channels.push([i * 0.24, j * 0.24]);
    }
  }
  const tubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 2.9, 10).rotateZ(Math.PI / 2), k.m.fuel, channels.length);
  const dummy = new THREE.Object3D();
  channels.forEach(([y, z], i) => {
    dummy.position.set(0, 1.6 + y, 0.3 + z);
    dummy.updateMatrix();
    tubes.setMatrixAt(i, dummy.matrix);
  });
  k.add(tubes);
  k.hotspot("calandria", [0.2, 2.65, 0.6]);
  k.hotspot("channels", [1.3, 1.6, 0.9]);
  k.hotspot("moderator", [-0.6, 1.1, 1.1]);

  // Fuelling machines at both faces.
  [-1, 1].forEach((side) => {
    k.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.6), k.m.gold), 1.85 * side, 1.6, 0.9));
  });
  k.hotspot("fuelling", [1.85, 2.05, 0.9]);
  k.rods({ y0: 2.3, y1: 3.2, count: 4, spread: 0.45, bob: 0.08 });
  k.hotspot("rods", [0, 3.3, 0.3]);

  const plant = k.turbineHall();
  [-1, 1].forEach((side, i) => {
    const sgx = 1.6 * side;
    const sg = k.steamGenerator({ x: sgx, z: -1.4, h: 4.4 });
    // Outlet header → SG, SG → pump → inlet header (heavy-water primary).
    k.pipe([[1.35 * side, 1.6, 0.3], [1.35 * side, 2.9, -0.2], [sgx, 2.9, -1.1], [sgx, 0.6, -1.1]], "hot", { r: 0.07 });
    k.pump({ x: 2.4 * side, z: -0.5, y: 0.2, scale: 0.9 });
    k.pipe([[sgx, 0.4, -1.4], [2.4 * side, 0.4, -1.0], [2.4 * side, 0.4, -0.5]], "cold", { r: 0.07 });
    k.pipe([[2.4 * side, 1.05, -0.5], [2.4 * side, 1.05, 0.3], [-1.35 * side, 1.05, 0.3]], "cold", { r: 0.06 });
    steamLine(k, plant, [sgx, sg.top - 0.05, -1.4], 5.1 + i * 0.22);
    if (i === 1) {
      k.hotspot("sg", [sgx + 0.5, 3.6, -1.4]);
      k.hotspot("pumps", [2.4, 1.1, -0.5]);
      feedLine(k, plant, [sgx + 0.45, 3.0, -1.4], 1.4);
    }
  });
  k.hotspot("steamline", [1.8, 5.2, -1.4]);
}

function buildSMR(k) {
  k.ground();
  // Deep reactor pool (open front) that submerges the modules — the passive
  // heat sink. Concrete walls at the back and sides.
  const poolH = 3.3;
  const pool = k.add(at(new THREE.Mesh(new THREE.BoxGeometry(5.2, poolH, 2.6), k.m.water), 0, poolH / 2, 0.05));
  pool.renderOrder = 2;
  k.add(at(new THREE.Mesh(new THREE.BoxGeometry(5.6, poolH + 0.2, 0.2), k.m.concreteDark), 0, (poolH + 0.2) / 2, -1.35));
  [-1, 1].forEach((side) => {
    k.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, poolH + 0.2, 2.9), k.m.concreteDark), 2.7 * side, (poolH + 0.2) / 2, -0.1));
  });
  k.hotspot("pool", [-2.2, poolH - 0.2, 1.0]);

  const modules = [-1.6, 0, 1.6];
  modules.forEach((mx, i) => {
    const front = i === 1;
    // Containment vessel (outer) + reactor vessel (inner).
    k.vessel({ r: 0.46, h: 3.0, y: 2.1, x: mx, z: 0.1, material: k.m.steel, cut: front ? CUT : 0 });
    if (front) {
      k.vessel({ r: 0.32, h: 2.7, y: 2.05, x: mx, z: 0.1, material: k.m.paint, cut: CUT });
      k.core({ r: 0.2, y0: 0.55, y1: 1.2, x: mx, z: 0.1, pitch: 0.075 });
      // Riser + helical-coil steam generator.
      k.add(at(cylinder(0.08, 1.6, k.m.steelDark, { segments: 16 }), mx, 2.0, 0.1));
      const coil = new THREE.Mesh(
        new THREE.TubeGeometry(new HelixCurve(0.2, 0.9, 7, [mx, 1.85, 0.1]), 220, 0.018, 6, false),
        k.m.fluidPipe.feed,
      );
      k.add(coil);
      k.pipe([[mx, 1.25, 0.12], [mx, 2.8, 0.12]], "hot", { r: 0.05 });
      k.pipe([[mx + 0.24, 2.7, 0.1], [mx + 0.24, 1.3, 0.1]], "cold", { r: 0.04 });
      k.pipe([[mx - 0.24, 2.7, 0.1], [mx - 0.24, 1.3, 0.1]], "cold", { r: 0.04 });
      k.hotspot("module", [mx + 0.34, 3.2, 0.3]);
      k.hotspot("core", [mx, 0.9, 0.35]);
      k.hotspot("riser", [mx, 2.4, 0.35]);
      k.hotspot("hcsg", [mx - 0.2, 1.75, 0.3]);
      k.hotspot("cnv", [mx - 0.46, 2.8, 0.1]);
    }
  });

  const plant = k.turbineHall({ x0: 4.2 });
  steamLine(k, plant, [0, 3.65, 0.1], 4.4);
  feedLine(k, plant, [0.46, 2.6, 0.1], 0.1);
  k.hotspot("steamline", [2.0, 4.55, 0.1]);
}

// Helix around a vertical axis for the SMR's coiled steam generator tubes.
class HelixCurve extends THREE.Curve {
  constructor(radius, height, turns, [x, y, z]) {
    super();
    Object.assign(this, { radius, height, turns, cx: x, cy: y, cz: z });
  }

  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * TAU;
    return target.set(this.cx + Math.cos(a) * this.radius, this.cy - this.height / 2 + t * this.height, this.cz + Math.sin(a) * this.radius);
  }
}

function buildHTGR(k) {
  k.ground();
  // Confinement building: open-front box outline.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.4, 3.4), k.m.concrete);
  frame.position.set(0.4, 2.7, -0.4);
  frame.material = k.m.concrete.clone();
  frame.material.transparent = true;
  frame.material.opacity = 0.1;
  frame.material.depthWrite = false;
  k.add(frame);
  k.hotspot("building", [-2.1, 5.0, -1.6]);

  // Reactor vessel with graphite reflector and pebble bed.
  k.vessel({ r: 0.75, h: 3.6, y: 2.8, x: -0.9 });
  k.add(at(lathe(capsuleProfile(0.6, 2.2), k.m.graphite, { cut: CUT }), -0.9, 2.6, 0));
  const pebbles = [];
  for (let y = 1.8; y <= 3.4; y += 0.11) {
    for (let a = 0; a < TAU; a += 0.42) {
      for (let r = 0.1; r <= 0.46; r += 0.12) {
        const ang = a + y * 3;
        const px = Math.cos(ang) * r;
        const pz = Math.sin(ang) * r;
        const theta = Math.atan2(px, pz);
        if (Math.abs(theta) < CUT / 2 - 0.05 && r > 0.3) continue; // keep the cut face open
        pebbles.push([-0.9 + px, y, pz]);
      }
    }
  }
  const pebbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.052, 10, 8), k.m.pebble, pebbles.length);
  const dummy = new THREE.Object3D();
  pebbles.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    pebbleMesh.setMatrixAt(i, dummy.matrix);
  });
  k.add(pebbleMesh);
  const glow = k.add(at(cylinder(0.52, 1.8, k.m.heatGlow), -0.9, 2.6, 0));
  k.animated.push((t) => { glow.material.opacity = 0.14 + Math.sin(t * 1.4) * 0.05; });
  k.rods({ x: -0.9, y0: 3.6, y1: 4.5, count: 4, spread: 0.52 });
  k.hotspot("vessel", [-0.2, 4.2, 0.3]);
  k.hotspot("pebbles", [-0.9, 2.6, 0.5]);
  k.hotspot("rods", [-0.9, 4.7, 0.2]);

  // Steam generator vessel + coaxial hot gas duct + circulator.
  k.vessel({ r: 0.6, h: 3.4, y: 2.6, x: 1.2, material: k.m.paint, cut: CUT });
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(0.38, 2.4, 9, [1.2, 2.4, 0]), 260, 0.025, 6, false), k.m.fluidPipe.feed);
  k.add(coil);
  k.add(at(cylinder(0.2, 1.3, k.m.steel, { axis: "x", segments: 20 }), 0.15, 1.4, 0));
  k.pipe([[-0.2, 1.4, 0.06], [0.6, 1.4, 0.06]], "helium", { r: 0.06 });
  k.pipe([[0.6, 1.4, -0.08], [-0.2, 1.4, -0.08]], "heliumCold", { r: 0.05 });
  k.pump({ x: 1.2, y: 4.5, z: 0, scale: 0.9 });
  k.hotspot("sg", [1.7, 3.0, 0.3]);
  k.hotspot("duct", [0.15, 1.7, 0.2]);
  k.hotspot("circulator", [1.2, 5.3, 0]);

  const plant = k.turbineHall({ x0: 4.6 });
  steamLine(k, plant, [1.6, 3.9, -0.2], 5.8);
  feedLine(k, plant, [1.8, 1.6, 0], -1.4);
  k.hotspot("steamline", [3.0, 5.9, -0.2]);
}

const BUILDERS = {
  PWR: (k) => buildPWR(k),
  VVER: (k) => buildPWR(k, { vver: true }),
  BWR: buildBWR,
  PHWR: buildPHWR,
  SMR: buildSMR,
  Other: buildHTGR,
};

export function buildReactorScene(type) {
  const kit = new Kit();
  (BUILDERS[type] || BUILDERS.Other)(kit);
  return kit.finish();
}
