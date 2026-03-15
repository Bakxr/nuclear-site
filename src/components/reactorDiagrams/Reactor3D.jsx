import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getReactorViewerConfig } from "./viewerConfig.js";

const MOBILE_BREAKPOINT = 640;
const modelCache = new Map();

function createMaterials() {
  return {
    vessel: new THREE.MeshStandardMaterial({ color: 0xb9b4a8, metalness: 0.8, roughness: 0.22 }),
    vesselDark: new THREE.MeshStandardMaterial({ color: 0x88827a, metalness: 0.82, roughness: 0.2 }),
    containment: new THREE.MeshStandardMaterial({ color: 0xd7ccb3, metalness: 0.04, roughness: 0.92, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    containmentSolid: new THREE.MeshStandardMaterial({ color: 0xc8b891, metalness: 0.04, roughness: 0.9 }),
    fuel: new THREE.MeshStandardMaterial({ color: 0xffb13c, emissive: new THREE.Color(0xff6a00), emissiveIntensity: 1.35, metalness: 0.08, roughness: 0.62 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x8b928f, metalness: 0.9, roughness: 0.16 }),
    pipeDark: new THREE.MeshStandardMaterial({ color: 0x666d6c, metalness: 0.85, roughness: 0.22 }),
    base: new THREE.MeshStandardMaterial({ color: 0x655d55, metalness: 0.08, roughness: 0.96 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x7a756f, metalness: 0.02, roughness: 0.98 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x3f3b37, metalness: 0.0, roughness: 1.0 }),
    water: new THREE.MeshStandardMaterial({ color: 0x4f7ea2, metalness: 0.12, roughness: 0.28, transparent: true, opacity: 0.52 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xd4a54a, metalness: 0.3, roughness: 0.35 }),
  };
}

function disposeResource(resource) {
  if (!resource) return;
  if (resource.geometry) resource.geometry.dispose();
  if (resource.material) {
    if (Array.isArray(resource.material)) resource.material.forEach((mat) => mat.dispose?.());
    else resource.material.dispose?.();
  }
}

function rod(group, geo, mat, count, positions) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  positions.forEach((pos, index) => {
    dummy.position.set(pos[0], pos[1] ?? 0, pos[2]);
    dummy.rotation.set(0, 0, pos[3] ?? 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return mesh;
}

function tube(group, points, radius, mat, segments = 20, radialSegments = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, radialSegments, false), mat);
  group.add(mesh);
  return mesh;
}

function gridPositions(nx, nz, spacingX, spacingZ, yOffset = 0) {
  const positions = [];
  for (let x = 0; x < nx; x += 1) {
    for (let z = 0; z < nz; z += 1) {
      positions.push([(x - (nx - 1) / 2) * spacingX, yOffset, (z - (nz - 1) / 2) * spacingZ]);
    }
  }
  return positions;
}

function addPedestal(group, materials, radius = 3.25, y = -2.25) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, 0.26, 48), materials.concrete);
  base.position.y = y;
  group.add(base);
  return base;
}

function addContainmentShell(group, materials, radius, height, y, options = {}) {
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, options.radialSegments || 48, 1, true),
    options.solid ? materials.containmentSolid : materials.containment,
  );
  shell.position.y = y;
  group.add(shell);
  if (!options.noDome) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, options.radialSegments || 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      options.solid ? materials.containmentSolid : materials.containment,
    );
    dome.position.y = y + height / 2;
    group.add(dome);
  }
}

function buildPWR(group, materials) {
  addPedestal(group, materials, 3.3, -2.2);
  addContainmentShell(group, materials, 2.25, 3.9, -0.15);

  const bioshield = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.84, 3.5, 32, 1, true), materials.containmentSolid);
  bioshield.position.y = -0.1;
  group.add(bioshield);

  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 3.1, 32), materials.vessel);
  const vesselTop = new THREE.Mesh(new THREE.SphereGeometry(0.76, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
  const vesselBottom = new THREE.Mesh(new THREE.SphereGeometry(0.76, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.vessel);
  vesselTop.position.y = 1.55;
  vesselBottom.position.y = -1.55;
  group.add(vessel, vesselTop, vesselBottom);

  const coreBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.15, 18), materials.vesselDark);
  coreBasket.position.y = -0.15;
  group.add(coreBasket);
  rod(group, new THREE.CylinderGeometry(0.024, 0.024, 2.0, 6), materials.fuel, 100, gridPositions(10, 10, 0.062, 0.062, -0.12));

  for (const side of [-1, 1]) {
    const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.47, 2.7, 24), materials.vessel);
    sg.position.set(side * 1.95, 0.15, 0);
    const sgTop = new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
    sgTop.position.set(side * 1.95, 1.5, 0);
    const sgBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.3, 24), materials.vesselDark);
    sgBase.position.set(side * 1.95, -1.37, 0);
    const pump = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), materials.pipeDark);
    pump.position.set(side * 1.55, -0.9, 1.05);
    group.add(sg, sgTop, sgBase, pump);

    tube(group, [[side * 0.78, 0.78, 0.16], [side * 1.18, 1.0, 0.35], [side * 1.95, 0.82, 0.12]], 0.11, materials.pipe);
    tube(group, [[side * 1.92, -0.62, 0.12], [side * 1.5, -0.92, 0.74], [side * 0.68, -0.55, 0.45]], 0.11, materials.pipe);
    tube(group, [[side * 1.45, -0.9, 0.98], [side * 1.45, -1.45, 0.98], [side * 0.72, -1.5, 0.35]], 0.08, materials.pipeDark, 18);
  }

  const pressurizer = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.35, 16), materials.vessel);
  const pressurizerTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
  pressurizer.position.set(0.76, 2.08, 0.64);
  pressurizerTop.position.set(0.76, 2.76, 0.64);
  group.add(pressurizer, pressurizerTop);
  tube(group, [[0.76, 1.42, 0.62], [0.72, 0.95, 0.48], [0.38, 0.6, 0.2]], 0.07, materials.pipeDark);

  const serviceBridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.24), materials.accent);
  serviceBridge.position.set(0, 2.02, -0.7);
  group.add(serviceBridge);
}

function buildBWR(group, materials) {
  addPedestal(group, materials, 3.15, -2.25);

  const drywell = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.2, 3.4, 40, 1, true), materials.containment);
  drywell.position.y = -0.15;
  const drywellTop = new THREE.Mesh(new THREE.SphereGeometry(1.95, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), materials.containment);
  drywellTop.position.y = 1.55;
  const suppressionPool = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.42, 16, 48), materials.water);
  suppressionPool.rotation.x = Math.PI / 2;
  suppressionPool.position.y = -1.6;
  group.add(drywell, drywellTop, suppressionPool);

  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.94, 3.45, 32), materials.vessel);
  const vesselTop = new THREE.Mesh(new THREE.SphereGeometry(0.94, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
  const vesselBottom = new THREE.Mesh(new THREE.SphereGeometry(0.94, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.vessel);
  vesselTop.position.y = 1.73;
  vesselBottom.position.y = -1.73;
  group.add(vessel, vesselTop, vesselBottom);

  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 2.55, 20), materials.vesselDark);
  shroud.position.y = -0.32;
  const steamDryer = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.45, 18), materials.vesselDark);
  steamDryer.position.y = 1.02;
  const separatorRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 10, 32), materials.pipeDark);
  separatorRing.position.y = 0.92;
  group.add(shroud, steamDryer, separatorRing);
  rod(group, new THREE.CylinderGeometry(0.024, 0.024, 2.0, 6), materials.fuel, 81, gridPositions(9, 9, 0.078, 0.078, -0.48));

  for (const side of [-1, 1]) {
    tube(group, [[side * 0.34, 1.7, 0.1], [side * 0.72, 2.45, 0.28], [side * 1.45, 2.7, 0.1]], 0.11, materials.pipe, 18);
    const turbineHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), materials.pipeDark);
    turbineHeader.rotation.z = Math.PI / 2;
    turbineHeader.position.set(side * 1.86, 2.75, 0.1);
    group.add(turbineHeader);
  }

  for (const side of [-1, 1]) {
    const recircPump = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), materials.pipeDark);
    recircPump.position.set(side * 1.18, -1.0, 1.1);
    group.add(recircPump);
    tube(group, [[side * 0.82, -0.95, 0.42], [side * 1.18, -1.0, 0.86], [side * 1.18, -1.05, 1.08]], 0.09, materials.pipe);
    tube(group, [[side * 1.18, -1.05, 1.08], [side * 1.45, -1.42, 0.8], [side * 1.7, -1.55, 0.18]], 0.08, materials.pipeDark, 16);
  }
}

function buildPHWR(group, materials) {
  addPedestal(group, materials, 3.35, -2.35);

  const calandria = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.15, 32), materials.vessel);
  calandria.rotation.z = Math.PI / 2;
  const moderator = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 4.3, 32, 1, true), materials.water);
  moderator.rotation.z = Math.PI / 2;
  group.add(calandria, moderator);

  for (const x of [-2.1, 2.1]) {
    const endShield = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.26, 32), materials.vesselDark);
    endShield.rotation.z = Math.PI / 2;
    endShield.position.x = x;
    group.add(endShield);

    const refueler = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 14), materials.accent);
    refueler.rotation.z = Math.PI / 2;
    refueler.position.set(x + (x > 0 ? 0.55 : -0.55), 0.9, 0);
    group.add(refueler);
  }

  const channelGeo = new THREE.CylinderGeometry(0.05, 0.05, 4.12, 8);
  const channelPositions = [];
  for (let y = -4; y <= 4; y += 1) {
    for (let z = -4; z <= 4; z += 1) {
      if (Math.abs(y) + Math.abs(z) <= 7) channelPositions.push([0, y * 0.13, z * 0.13, Math.PI / 2]);
    }
  }
  rod(group, channelGeo, materials.pipe, channelPositions.length, channelPositions);

  const fuelGeo = new THREE.CylinderGeometry(0.032, 0.032, 3.72, 6);
  const fuelPositions = channelPositions.filter((_, index) => index % 2 === 0);
  rod(group, fuelGeo, materials.fuel, fuelPositions.length, fuelPositions);

  for (const y of [0.92, -0.92]) {
    const header = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.55, 14), materials.pipeDark);
    header.rotation.z = Math.PI / 2;
    header.position.y = y;
    group.add(header);
    tube(group, [[-2.15, y, 0], [-2.7, y, 0.42], [-3.0, y + (y > 0 ? 0.35 : -0.35), 0]], 0.1, materials.water, 16);
    tube(group, [[2.15, y, 0], [2.7, y, -0.42], [3.0, y + (y > 0 ? 0.35 : -0.35), 0]], 0.1, materials.water, 16);
  }

  const cradle = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.18, 1.95), materials.base);
  cradle.position.y = -2.1;
  group.add(cradle);
  for (const x of [-1.65, 1.65]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.18), materials.base);
    leg.position.set(x, -1.3, 0);
    group.add(leg);
  }
}

function buildVVER(group, materials) {
  addPedestal(group, materials, 3.45, -2.2);
  addContainmentShell(group, materials, 2.35, 3.95, -0.1, { radialSegments: 28 });
  addContainmentShell(group, materials, 1.95, 3.5, -0.18, { radialSegments: 24 });

  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 3.2, 6), materials.vessel);
  const vesselTop = new THREE.Mesh(new THREE.SphereGeometry(0.82, 8, 14, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
  const vesselBottom = new THREE.Mesh(new THREE.SphereGeometry(0.82, 8, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.vessel);
  vesselTop.position.y = 1.6;
  vesselBottom.position.y = -1.6;
  group.add(vessel, vesselTop, vesselBottom);

  const hexRodGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.05, 6);
  const hexPositions = [[0, 0, 0]];
  for (let ring = 1; ring <= 5; ring += 1) {
    const count = ring * 6;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = ring * 0.11;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      if (Math.sqrt(x * x + z * z) < 0.68) hexPositions.push([x, -0.05, z]);
    }
  }
  rod(group, hexRodGeo, materials.fuel, hexPositions.length, hexPositions);

  for (let index = 0; index < 4; index += 1) {
    const angle = (index * Math.PI) / 2 + Math.PI / 4;
    const x = Math.cos(angle) * 2.02;
    const z = Math.sin(angle) * 2.02;
    const steamGenerator = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.15, 18), materials.vessel);
    steamGenerator.rotation.z = Math.PI / 2;
    steamGenerator.rotation.y = angle;
    steamGenerator.position.set(x, 0.18, z);
    const steamCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10), materials.vesselDark);
    steamCap.scale.set(0.52, 0.52, 0.52);
    steamCap.position.set(x, 0.18, z);
    const pump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), materials.pipeDark);
    pump.position.set(Math.cos(angle) * 1.62, -1.0, Math.sin(angle) * 1.62);
    group.add(steamGenerator, steamCap, pump);

    tube(group, [[Math.cos(angle) * 0.82, 0.62, Math.sin(angle) * 0.82], [Math.cos(angle) * 1.35, 0.6, Math.sin(angle) * 1.35], [x, 0.2, z]], 0.085, materials.pipe);
    tube(group, [[x, -0.18, z], [Math.cos(angle) * 1.48, -0.52, Math.sin(angle) * 1.48], [Math.cos(angle) * 0.82, -0.58, Math.sin(angle) * 0.82]], 0.085, materials.pipe);
    tube(group, [[Math.cos(angle) * 1.52, -0.92, Math.sin(angle) * 1.52], [Math.cos(angle) * 1.22, -1.2, Math.sin(angle) * 1.22], [Math.cos(angle) * 0.8, -1.36, Math.sin(angle) * 0.8]], 0.065, materials.pipeDark, 14);
  }
}

function buildSMR(group, materials) {
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.08, 40), materials.ground);
  ground.position.y = -1.58;
  group.add(ground);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 2.2, 32, 1, true), materials.containment);
  shaft.position.y = -2.55;
  group.add(shaft);

  const outerPool = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.75, 32, 1, true), materials.water);
  const outerContainment = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 3.95, 32, 1, true), materials.containment);
  const outerDome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), materials.containment);
  outerDome.position.y = 1.97;
  group.add(outerPool, outerContainment, outerDome);

  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 3.35, 32), materials.vessel);
  const vesselTop = new THREE.Mesh(new THREE.SphereGeometry(0.68, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.vessel);
  const vesselBottom = new THREE.Mesh(new THREE.SphereGeometry(0.68, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), materials.vessel);
  vesselTop.position.y = 1.68;
  vesselBottom.position.y = -1.68;
  group.add(vessel, vesselTop, vesselBottom);

  const annularSteamGen = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.1, 14, 38), materials.vesselDark);
  annularSteamGen.position.y = 0.62;
  group.add(annularSteamGen);
  rod(group, new THREE.CylinderGeometry(0.024, 0.024, 1.6, 6), materials.fuel, 49, gridPositions(7, 7, 0.078, 0.078, -0.42));

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.12, 28), materials.concrete);
  deck.position.y = -1.42;
  group.add(deck);

  for (const x of [-1.25, 1.25]) {
    const module = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.38, 0.74), materials.concrete);
    module.position.set(x, -1.18, 0.88);
    group.add(module);
    tube(group, [[x, -0.98, 0.55], [x, -0.42, 0.72], [x * 0.55, 0.15, 0.46]], 0.06, materials.pipeDark, 16);
  }
}

function buildOther(group, materials) {
  addPedestal(group, materials, 3.15, -2.25);
  addContainmentShell(group, materials, 1.98, 4.1, -0.05, { radialSegments: 6, noDome: true });

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 0.14, 6), materials.containmentSolid);
  topCap.position.y = 2.02;
  group.add(topCap);

  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 3.2, 6), materials.vessel);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.75, 6), materials.fuel);
  core.position.y = -0.28;
  const reflector = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.1, 10, 6), materials.vesselDark);
  reflector.position.y = -0.25;
  group.add(vessel, core, reflector);

  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const x = Math.cos(angle) * 1.52;
    const z = Math.sin(angle) * 1.52;
    tube(group, [
      [Math.cos(angle) * 0.88, 0.55, Math.sin(angle) * 0.88],
      [x, 1.18, z],
      [x, -1.08, z],
      [Math.cos(angle) * 0.88, -0.58, Math.sin(angle) * 0.88],
    ], 0.095, index % 2 === 0 ? materials.pipe : materials.water, 18, 10);
  }

  for (let index = 0; index < 3; index += 1) {
    const angle = (index * Math.PI * 2) / 3 + Math.PI / 6;
    const exchanger = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.35, 12), materials.vesselDark);
    exchanger.position.set(Math.cos(angle) * 1.45, 0.15, Math.sin(angle) * 1.45);
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.05, 8), materials.accent);
    plume.position.set(Math.cos(angle) * 1.45, 1.15, Math.sin(angle) * 1.45);
    group.add(exchanger, plume);
  }
}

function buildProceduralReactor(group, type, materials) {
  switch (type) {
    case "PWR":
      buildPWR(group, materials);
      break;
    case "BWR":
      buildBWR(group, materials);
      break;
    case "PHWR":
      buildPHWR(group, materials);
      break;
    case "VVER":
      buildVVER(group, materials);
      break;
    case "SMR":
      buildSMR(group, materials);
      break;
    default:
      buildOther(group, materials);
      break;
  }
}

async function loadImportedModel(assetPath) {
  if (!assetPath) return null;
  if (modelCache.has(assetPath)) return modelCache.get(assetPath).clone(true);

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(assetPath);
  modelCache.set(assetPath, gltf.scene);
  return gltf.scene.clone(true);
}

function applyTransform(target, transform) {
  if (!target || !transform) return;
  if (transform.position) target.position.set(...transform.position);
  if (transform.rotation) target.rotation.set(...transform.rotation);
  if (transform.scale) {
    if (Array.isArray(transform.scale)) target.scale.set(...transform.scale);
    else target.scale.setScalar(transform.scale);
  }
}

export default function Reactor3D({ type = "PWR" }) {
  const mountRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    pointerType: "mouse",
    prevX: 0,
    prevY: 0,
    vx: 0,
  });
  const [viewerMeta, setViewerMeta] = useState(() => ({
    isMobileViewport: typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false,
    width: 680,
  }));
  const config = useMemo(
    () => getReactorViewerConfig(type, viewerMeta.isMobileViewport),
    [type, viewerMeta.isMobileViewport],
  );
  const hintKey = `${type}-${viewerMeta.isMobileViewport ? "mobile" : "desktop"}`;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const updateSize = () => {
      const width = container.clientWidth || 680;
      setViewerMeta((prev) => {
        const isMobileViewport = width <= MOBILE_BREAKPOINT;
        if (prev.width === width && prev.isMobileViewport === isMobileViewport) return prev;
        return { width, isMobileViewport };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || viewerMeta.width || 680;
    const height = config.height;
    let animationId = 0;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, viewerMeta.isMobileViewport ? 1.35 : 1.8));
    renderer.setClearColor(0x0d1520, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = viewerMeta.isMobileViewport ? 1.02 : 1.1;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1520, viewerMeta.isMobileViewport ? 0.082 : 0.068);

    const grid = new THREE.GridHelper(8, viewerMeta.isMobileViewport ? 12 : 16, 0x223448, 0x152030);
    grid.position.y = -2.35;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(viewerMeta.isMobileViewport ? 46 : 42, width / height, 0.1, 100);
    camera.position.set(...config.camera.position);
    camera.lookAt(...config.camera.lookAt);

    scene.add(new THREE.AmbientLight(0xfff1e3, viewerMeta.isMobileViewport ? 0.82 : 0.72));
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.65);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.38);
    fillLight.position.set(-5, 2, -5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x4488bb, 0.42);
    rimLight.position.set(0, -4, -6);
    scene.add(rimLight);
    const coreLight = new THREE.PointLight(0xff6a00, 3.1, 5.4);
    coreLight.position.set(0, 0.15, 0);
    scene.add(coreLight);

    const group = new THREE.Group();
    const materials = createMaterials();
    group.rotation.y = Math.PI / 5;
    scene.add(group);

    const renderFrame = () => renderer.render(scene, camera);

    const populateScene = async () => {
      try {
        if (config.renderMode === "imported" && config.assetPath) {
          const importedScene = await loadImportedModel(config.assetPath);
          if (disposed || !importedScene) return;
          applyTransform(importedScene, config.transform);
          group.add(importedScene);
        } else {
          buildProceduralReactor(group, type, materials);
        }
      } catch {
        buildProceduralReactor(group, type, materials);
      }
      renderFrame();
    };

    populateScene();

    const dragState = dragStateRef.current;
    const onPointerDown = (event) => {
      dragState.active = true;
      dragState.moved = false;
      dragState.pointerId = event.pointerId;
      dragState.pointerType = event.pointerType;
      dragState.prevX = event.clientX;
      dragState.prevY = event.clientY;
      dragState.vx = 0;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!dragState.active || dragState.pointerId !== event.pointerId) return;

      const dx = event.clientX - dragState.prevX;
      const dy = event.clientY - dragState.prevY;

      if (dragState.pointerType === "touch" && !dragState.moved) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          dragState.active = false;
          renderer.domElement.releasePointerCapture?.(event.pointerId);
          renderer.domElement.style.cursor = "grab";
          return;
        }
      }

      dragState.moved = true;
      dragState.vx = dx * (viewerMeta.isMobileViewport ? 0.008 : 0.011);
      group.rotation.y += dragState.vx;
      group.rotation.x = Math.max(-0.62, Math.min(0.62, group.rotation.x + dy * 0.0075));
      dragState.prevX = event.clientX;
      dragState.prevY = event.clientY;
      if (dragState.pointerType === "touch") event.preventDefault();
    };

    const releasePointer = (event) => {
      if (dragState.pointerId !== event.pointerId) return;
      dragState.active = false;
      dragState.pointerId = null;
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: false });
    renderer.domElement.addEventListener("pointerup", releasePointer);
    renderer.domElement.addEventListener("pointercancel", releasePointer);
    renderer.domElement.addEventListener("pointerleave", releasePointer);

    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      if (!dragState.active) {
        group.rotation.y += viewerMeta.isMobileViewport ? 0.0026 : 0.0038;
        dragState.vx *= 0.9;
      }
      coreLight.intensity = (viewerMeta.isMobileViewport ? 2.6 : 3.0) + Math.sin(performance.now() * 0.0018) * 0.75;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", releasePointer);
      renderer.domElement.removeEventListener("pointercancel", releasePointer);
      renderer.domElement.removeEventListener("pointerleave", releasePointer);

      scene.traverse((obj) => {
        if (obj.type !== "Scene") disposeResource(obj);
      });
      Object.values(materials).forEach((material) => material.dispose());
      renderer.dispose();
      container.replaceChildren();
    };
  }, [config, type, viewerMeta.isMobileViewport, viewerMeta.width]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: config.height,
          cursor: "grab",
          borderRadius: 10,
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(18,28,39,0.96) 0%, rgba(9,13,20,1) 100%)",
        }}
      />
      {config.attribution && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            maxWidth: viewerMeta.isMobileViewport ? "72%" : "52%",
            fontSize: 10,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.62)",
            background: "rgba(7,11,17,0.52)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "8px 10px",
            backdropFilter: "blur(10px)",
          }}
        >
          Model source: {config.attribution.label}
        </div>
      )}
      <div
        key={hintKey}
        style={{
          position: "absolute",
          bottom: viewerMeta.isMobileViewport ? 8 : 12,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: viewerMeta.isMobileViewport ? "90%" : "unset",
          textAlign: "center",
          fontSize: viewerMeta.isMobileViewport ? 10 : 11,
          lineHeight: 1.3,
          color: "rgba(255,255,255,0.48)",
          fontFamily: "'DM Sans',sans-serif",
          pointerEvents: "none",
          opacity: 0,
          whiteSpace: viewerMeta.isMobileViewport ? "normal" : "nowrap",
          animation: "np-hint-fade 3s ease forwards",
        }}
      >
        Drag to rotate · {viewerMeta.isMobileViewport ? "swipe sideways on mobile" : `${type} reactor`}
      </div>
    </div>
  );
}
