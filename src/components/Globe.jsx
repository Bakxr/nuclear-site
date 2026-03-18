import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import * as d3 from "d3";
import { STATUS_COLORS, STATUS_COLORS_HEX } from "../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../data/supplySites.js";

const CAMERA_DEFAULT_Z = 3.05;
const CAMERA_MIN_Z = 1.85;
const CAMERA_MAX_Z = 4.4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getMarkerState(plant, selectedEntity, hoveredPlant, highlightedEntityId) {
  const selectedId = selectedEntity?.id ?? null;
  const selectedCountry = selectedEntity?.country ?? null;
  const isSelected = Boolean(selectedId && plant.id === selectedId);
  const isHovered = Boolean(hoveredPlant?.id && plant.id === hoveredPlant.id);
  const isLinkedHighlight = Boolean(!isSelected && !isHovered && highlightedEntityId && plant.id === highlightedEntityId);
  const isRelatedCountry = Boolean(!isSelected && !isHovered && !isLinkedHighlight && selectedCountry && plant.country === selectedCountry);

  return { isSelected, isHovered, isLinkedHighlight, isRelatedCountry };
}

function applyMarkerPresentation(marker, ring, state) {
  if (!marker || !ring) return;
  const { isSelected, isHovered, isLinkedHighlight, isRelatedCountry } = state;

  const markerScale = isSelected ? 1.72 : isHovered ? 1.4 : isLinkedHighlight ? 1.26 : isRelatedCountry ? 1.14 : 0.98;
  marker.scale.setScalar(markerScale);
  if (marker.material) {
    marker.material.opacity = isSelected ? 1 : isHovered ? 0.94 : isLinkedHighlight ? 0.9 : isRelatedCountry ? 0.84 : 0.62;
    if ("emissiveIntensity" in marker.material) {
      marker.material.emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.34 : isLinkedHighlight ? 0.26 : isRelatedCountry ? 0.18 : 0.08;
    }
  }

  ring.userData.baseScale = isSelected ? 1.14 : isHovered ? 1.09 : isLinkedHighlight ? 1.06 : isRelatedCountry ? 1.03 : 1;
  ring.userData.baseOpacity = isSelected ? 0.16 : isHovered ? 0.1 : isLinkedHighlight ? 0.07 : isRelatedCountry ? 0.05 : 0.016;
  ring.userData.pulseStrength = isSelected ? 0.035 : isHovered ? 0.022 : isLinkedHighlight ? 0.014 : isRelatedCountry ? 0.01 : 0;
  ring.userData.pulseOpacity = isSelected ? 0.035 : isHovered ? 0.024 : isLinkedHighlight ? 0.014 : isRelatedCountry ? 0.01 : 0;
  ring.scale.setScalar(ring.userData.baseScale);
  if (ring.material) {
    ring.material.opacity = ring.userData.baseOpacity;
  }
}

// Simple topojson decoder (no library needed) — lifted to module level so fetchLand can use it
function decodeTopojson(topology, object) {
  const arcs = topology.arcs;
  const transform = topology.transform;
  function decodeArc(arcIdx) {
    const arc = arcs[Math.abs(arcIdx)];
    const coords = [];
    let x = 0, y = 0;
    for (let i = 0; i < arc.length; i++) {
      x += arc[i][0];
      y += arc[i][1];
      const lon = transform ? x * transform.scale[0] + transform.translate[0] : arc[i][0];
      const lat = transform ? y * transform.scale[1] + transform.translate[1] : arc[i][1];
      coords.push([lon, lat]);
    }
    if (arcIdx < 0) coords.reverse();
    return coords;
  }
  function decodeRing(ring) {
    let coords = [];
    ring.forEach(idx => { coords = coords.concat(decodeArc(idx)); });
    return coords;
  }
  if (object.type === "GeometryCollection") {
    const features = object.geometries.map(geom => {
      if (geom.type === "Polygon") {
        return { type: "Feature", geometry: { type: "Polygon", coordinates: geom.arcs.map(decodeRing) } };
      } else if (geom.type === "MultiPolygon") {
        return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: geom.arcs.map(poly => poly.map(decodeRing)) } };
      }
      return null;
    }).filter(Boolean);
    return { type: "FeatureCollection", features };
  }
  if (object.type === "Polygon") {
    return { type: "Feature", geometry: { type: "Polygon", coordinates: object.arcs.map(decodeRing) } };
  }
  if (object.type === "MultiPolygon") {
    return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: object.arcs.map(p => p.map(decodeRing)) } };
  }
  return { type: "FeatureCollection", features: [] };
}

// Module-level land cache — fetched once per page load, never re-fetched on plants/filter changes
let cachedLand = null;
let landFetchPromise = null;

function fetchLand() {
  if (cachedLand) return Promise.resolve(cachedLand);
  if (landFetchPromise) return landFetchPromise;
  landFetchPromise = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
    .then(r => r.json())
    .then(world => {
      cachedLand = world.type === "Topology" ? decodeTopojson(world, world.objects.land) : world;
      landFetchPromise = null;
      return cachedLand;
    })
    .catch(() => {
      landFetchPromise = null;
      return null;
    });
  return landFetchPromise;
}

export default function Globe({
  onSelectPlant,
  onHoverPlant,
  plants,
  mode = "reactors",
  selectedEntity = null,
  highlightedEntityId = null,
}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(CAMERA_DEFAULT_Z);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: -1.0 });
  const autoRotate = useRef(true);
  const autoRotateTimer = useRef(null);
  const onSelectPlantRef = useRef(onSelectPlant);
  const onHoverPlantRef = useRef(onHoverPlant);
  const modeRef = useRef(mode);
  const selectedEntityRef = useRef(selectedEntity);
  const hoveredPlantRef = useRef(hoveredPlant);
  const highlightedEntityIdRef = useRef(highlightedEntityId);

  // Shared refs between the two effects
  const pivotGroupRef = useRef(null);
  const markersRef = useRef([]);
  const ringsRef = useRef([]);

  useEffect(() => {
    onSelectPlantRef.current = onSelectPlant;
  }, [onSelectPlant]);

  useEffect(() => {
    onHoverPlantRef.current = onHoverPlant;
  }, [onHoverPlant]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    selectedEntityRef.current = selectedEntity;
  }, [selectedEntity]);

  useEffect(() => {
    hoveredPlantRef.current = hoveredPlant;
  }, [hoveredPlant]);

  useEffect(() => {
    highlightedEntityIdRef.current = highlightedEntityId;
  }, [highlightedEntityId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mountRef.current);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.pointerEvents = isInteractive ? "auto" : "none";
  }, [isInteractive]);

  // ── Effect 1: One-time scene setup (renderer, lights, globe, atmosphere, animation loop) ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = CAMERA_DEFAULT_Z;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current = renderer.domElement;
    renderer.domElement.style.pointerEvents = "none";
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xe1ceb0, 0.78);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7c8f9a, 0.1);
    rim.position.set(-3, -2, -3);
    scene.add(rim);

    // Star field background
    const starsGeom = new THREE.BufferGeometry();
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 9 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starsGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xbda98b, size: 0.022, transparent: true, opacity: 0.18 });
    const starField = new THREE.Points(starsGeom, starsMat);
    scene.add(starField);

    // Pivot group for all rotating elements
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    // Ocean sphere
    const oceanGeom = new THREE.SphereGeometry(0.995, 96, 96);
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x121a23,
      emissive: 0x0a1117,
      specular: 0x2b3946,
      shininess: 24,
      transparent: true,
      opacity: 0.97,
    });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    pivotGroup.add(ocean);

    // Land texture from canvas
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 2048;
    texCanvas.height = 1024;
    const ctx = texCanvas.getContext("2d");
    const projection = d3.geoEquirectangular().fitSize([2048, 1024], { type: "Sphere" });
    const path = d3.geoPath(projection, ctx);

    // Track globe mesh for cleanup
    let globeGeom = null;
    let globeMat = null;
    let landTexture = null;

    fetchLand().then(land => {
      if (!mount.isConnected) return; // component unmounted before fetch resolved
      ctx.clearRect(0, 0, 2048, 1024);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 2048, 1024);

      if (land) {
        ctx.fillStyle = "#a19687";
        ctx.strokeStyle = "#5a554c";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        path(land);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(126,168,192,0.04)";
        ctx.lineWidth = 0.6;
        const graticule = d3.geoGraticule().step([15, 15])();
        ctx.beginPath();
        path(graticule);
        ctx.stroke();

        landTexture = new THREE.CanvasTexture(texCanvas);
        landTexture.needsUpdate = true;
        globeGeom = new THREE.SphereGeometry(1, 96, 96);
        globeMat = new THREE.MeshPhongMaterial({
          map: landTexture,
          color: 0xb8aa95,
          specular: 0x1f2730,
          transparent: true,
          opacity: 0.93,
          shininess: 8,
        });
      } else {
        // Fallback: solid color globe
        globeGeom = new THREE.SphereGeometry(1, 64, 64);
        globeMat = new THREE.MeshPhongMaterial({ color: 0xb8aa95, specular: 0x1f2730, shininess: 10 });
      }
      pivotGroup.add(new THREE.Mesh(globeGeom, globeMat));
    });

    // Atmosphere
    const atmosGeom = new THREE.SphereGeometry(1.06, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main(){ float intensity=pow(0.7-dot(vNormal,vec3(0.0,0.0,1.0)),3.0); gl_FragColor=vec4(0.46,0.56,0.62,1.0)*intensity*0.17; }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    const haloGeom = new THREE.SphereGeometry(1.12, 64, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x7ea8c0,
      transparent: true,
      opacity: 0.014,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(haloGeom, haloMat));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (autoRotate.current && !isDragging.current) {
        rotation.current.y += 0.0011;
      }
      pivotGroup.rotation.x = rotation.current.x;
      pivotGroup.rotation.y = rotation.current.y;

      const t = Date.now() * 0.003;
      pivotGroup.children.forEach(ch => {
        if (ch.userData?.isRing) {
          const pulseStrength = ch.userData.pulseStrength || 0;
          const pulseOpacity = ch.userData.pulseOpacity || 0;
          const phase = ch.userData.phase || 0;
          const pulse = pulseStrength ? (0.5 + 0.5 * Math.sin(t + phase)) : 0;
          const scale = (ch.userData.baseScale || 1) + (pulseStrength * pulse);
          ch.scale.set(scale, scale, scale);
          ch.material.opacity = (ch.userData.baseOpacity || 0) + (pulseOpacity * pulse);
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const onMouseDown = (e) => {
      isDragging.current = true;
      hasDragged.current = false;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      autoRotate.current = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
    const onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (isDragging.current) {
        const dx = e.clientX - previousMouse.current.x;
        const dy = e.clientY - previousMouse.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) hasDragged.current = true;
        rotation.current.y += dx * 0.005;
        rotation.current.x += dy * 0.005;
        rotation.current.x = Math.max(-1.2, Math.min(1.2, rotation.current.x));
        previousMouse.current = { x: e.clientX, y: e.clientY };
      }
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markersRef.current);
      if (hits.length > 0) {
        setHoveredPlant(hits[0].object.userData.plant);
        onHoverPlantRef.current?.(hits[0].object.userData.plant);
        setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top });
        mount.style.cursor = "pointer";
      } else {
        setHoveredPlant(null);
        onHoverPlantRef.current?.(null);
        setTooltip(prev => ({ ...prev, visible: false }));
        mount.style.cursor = isDragging.current ? "grabbing" : "grab";
      }
    };
    const onMouseUp = () => {
      isDragging.current = false;
      autoRotateTimer.current = setTimeout(() => { autoRotate.current = true; }, 4000);
    };
    const onClick = (e) => {
      if (hasDragged.current) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markersRef.current);
      if (hits.length > 0 && modeRef.current === "reactors") onSelectPlantRef.current?.(hits[0].object.userData.plant);
    };

    // ── Touch handlers (mobile) ──────────────────────────────────────────
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      isDragging.current = true;
      hasDragged.current = false;
      previousMouse.current = { x: t.clientX, y: t.clientY };
      autoRotate.current = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault(); // prevent page scroll while rotating
      const t = e.touches[0];
      if (isDragging.current) {
        const dx = t.clientX - previousMouse.current.x;
        const dy = t.clientY - previousMouse.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) hasDragged.current = true;
        rotation.current.y += dx * 0.005;
        rotation.current.x += dy * 0.005;
        rotation.current.x = Math.max(-1.2, Math.min(1.2, rotation.current.x));
        previousMouse.current = { x: t.clientX, y: t.clientY };
      }
    };
    const onTouchEnd = (e) => {
      isDragging.current = false;
      autoRotateTimer.current = setTimeout(() => { autoRotate.current = true; }, 4000);
      if (!hasDragged.current && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const rect = mount.getBoundingClientRect();
        mouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(markersRef.current);
        if (hits.length > 0 && modeRef.current === "reactors") onSelectPlantRef.current?.(hits[0].object.userData.plant);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const nextZ = clamp(camera.position.z + (e.deltaY * 0.0028), CAMERA_MIN_Z, CAMERA_MAX_Z);
      camera.position.z = nextZ;
      setZoomLevel(nextZ);
    };

    const el = renderer.domElement;
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("click", onClick);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("click", onClick);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      // Dispose static geometry/materials
      oceanGeom.dispose();
      oceanMat.dispose();
      atmosGeom.dispose();
      atmosMat.dispose();
      haloGeom.dispose();
      haloMat.dispose();
      starsGeom.dispose();
      starsMat.dispose();
      globeGeom?.dispose();
      globeMat?.dispose();
      landTexture?.dispose();
      renderer.dispose();
      cameraRef.current = null;
      canvasRef.current = null;
      pivotGroupRef.current = null;
      if (mount.contains(el)) mount.removeChild(el);
    };
  }, []); // ← runs once only; never re-runs on plants/filter changes

  // ── Effect 2: Update markers only when plants prop changes (no CDN re-fetch) ──
  useEffect(() => {
    const pivotGroup = pivotGroupRef.current;
    if (!pivotGroup) return;

    // Dispose and remove old markers and rings
    const toRemove = pivotGroup.children.filter(ch => ch.userData?.isMarker || ch.userData?.isRing);
    toRemove.forEach(ch => {
      ch.geometry?.dispose();
      ch.material?.dispose();
      pivotGroup.remove(ch);
    });

    // Add new markers
    const markers = [];
    const rings = [];
    plants.forEach((plant, i) => {
      const pos = latLngToVector3(plant.lat, plant.lng, 1.015);
      const color = mode === "reactors"
        ? (STATUS_COLORS_HEX[plant.status] ?? STATUS_COLORS_HEX.Shutdown)
        : (SUPPLY_STAGE_COLORS[plant.stage] || "#d4a54a");

      const markerGeom = new THREE.SphereGeometry(mode === "reactors" ? 0.0105 : 0.014, 12, 12);
      const markerMat = new THREE.MeshPhongMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.2),
        shininess: 34,
        transparent: true,
        opacity: 0.74,
      });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.copy(pos);
      marker.userData = { plant, index: i, isMarker: true };
      markers.push(marker);
      pivotGroup.add(marker);

      // Quiet contextual ring, promoted only on hover or selection.
      const ringGeom = new THREE.RingGeometry(mode === "reactors" ? 0.014 : 0.018, mode === "reactors" ? 0.021 : 0.028, 22);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData = {
        isRing: true,
        phase: Math.random() * 6.28,
        baseScale: 1,
        baseOpacity: 0.03,
        pulseStrength: 0,
        pulseOpacity: 0,
      };
      rings.push(ring);
      pivotGroup.add(ring);
      applyMarkerPresentation(marker, ring, getMarkerState(plant, selectedEntityRef.current, hoveredPlantRef.current, highlightedEntityIdRef.current));
    });

    markersRef.current = markers;
    ringsRef.current = rings;

    return () => {
      // Dispose marker GPU resources on re-run or unmount
      const group = pivotGroupRef.current;
      if (!group) return;
      markers.forEach(m => {
        m.geometry?.dispose();
        m.material?.dispose();
      });
      rings.forEach(ring => {
        ring.geometry?.dispose();
        ring.material?.dispose();
      });
    };
  }, [plants, mode]);

  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const ring = ringsRef.current[index];
      applyMarkerPresentation(marker, ring, getMarkerState(marker.userData.plant, selectedEntity, hoveredPlant, highlightedEntityId));
    });
  }, [highlightedEntityId, hoveredPlant, selectedEntity]);

  function setCameraZoom(nextZ) {
    const camera = cameraRef.current;
    if (!camera) return;
    const safeZoom = clamp(nextZ, CAMERA_MIN_Z, CAMERA_MAX_Z);
    camera.position.z = safeZoom;
    setZoomLevel(safeZoom);
  }

  function resetView() {
    rotation.current = { x: 0.3, y: -1.0 };
    autoRotate.current = true;
    setHoveredPlant(null);
    onHoverPlantRef.current?.(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
    setCameraZoom(CAMERA_DEFAULT_Z);
  }

  function disengage() {
    setIsInteractive(false);
    setHoveredPlant(null);
    onHoverPlantRef.current?.(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  }

  async function toggleFullscreen() {
    const mount = mountRef.current;
    if (!mount) return;

    if (document.fullscreenElement === mount) {
      await document.exitFullscreen();
      return;
    }

    await mount.requestFullscreen?.();
  }

  const controlButtonStyle = {
    border: "1px solid rgba(125,139,156,0.14)",
    background: "rgba(10,14,19,0.76)",
    color: "rgba(237,241,245,0.88)",
    fontFamily: "'DM Mono',monospace",
    fontWeight: 700,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    boxShadow: "none",
  };

  return (
    <div
      ref={mountRef}
      onClick={() => {
        if (!isInteractive) setIsInteractive(true);
      }}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: isInteractive ? "grab" : "pointer",
        borderRadius: 2,
        overflow: "hidden",
        touchAction: isInteractive ? "none" : "auto",
      }}
    >
      {isInteractive && (
      <div className="np-globe-controls" style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setCameraZoom(zoomLevel - 0.28)}
          style={{
            ...controlButtonStyle,
            minWidth: 40,
            height: 38,
            padding: "0 12px",
            borderRadius: 2,
            fontSize: 20,
            letterSpacing: "0",
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setCameraZoom(zoomLevel + 0.28)}
          style={{
            ...controlButtonStyle,
            minWidth: 40,
            height: 38,
            padding: "0 12px",
            borderRadius: 2,
            fontSize: 20,
            letterSpacing: "0",
          }}
        >
          -
        </button>
        <button
          type="button"
          aria-label="Reset globe view"
          onClick={() => resetView()}
          style={{
            ...controlButtonStyle,
            minWidth: 58,
            height: 38,
            padding: "0 14px",
            borderRadius: 2,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Reset
        </button>
        <button
          type="button"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={() => toggleFullscreen()}
          style={{
            ...controlButtonStyle,
            minWidth: 58,
            height: 38,
            padding: "0 14px",
            borderRadius: 2,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {isFullscreen ? "Exit" : "Full"}
        </button>
        <button
          type="button"
          aria-label="Release globe controls"
          onClick={() => disengage()}
          style={{
            ...controlButtonStyle,
            minWidth: 58,
            height: 38,
            padding: "0 14px",
            borderRadius: 2,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Done
        </button>
      </div>
      )}
      <div className="np-globe-status" style={{
        position: "absolute",
        left: 14,
        bottom: 14,
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 2,
        background: "rgba(10,14,19,0.72)",
        border: "1px solid rgba(125,139,156,0.12)",
        color: "rgba(237,241,245,0.78)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        backdropFilter: "blur(8px)",
      }}>
        {isInteractive ? (
          <>
            <span>Zoom {Math.round(((CAMERA_MAX_Z - zoomLevel) / (CAMERA_MAX_Z - CAMERA_MIN_Z)) * 100)}%</span>
            <span style={{ opacity: 0.42 }}>|</span>
            <span style={{ opacity: 0.72 }}>Wheel / drag / tap markers</span>
          </>
        ) : (
          <span style={{ opacity: 0.82 }}>Click map to engage controls</span>
        )}
      </div>
      {hoveredPlant && tooltip.visible && (
        <div style={{
          position: "absolute",
          left: `clamp(12px, ${tooltip.x + 14}px, calc(100% - 252px))`,
          top: Math.max(12, tooltip.y - 10),
          background: "rgba(10,14,19,0.94)", color: "#f5f0e8", padding: "12px 16px", borderRadius: 2,
          fontSize: 13, fontFamily: "'DM Sans',sans-serif", pointerEvents: "none", zIndex: 10,
          border: "1px solid rgba(125,139,156,0.14)", maxWidth: "min(240px, calc(100% - 24px))", lineHeight: 1.4,
          backdropFilter: "blur(8px)", boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{hoveredPlant.name}</div>
          {mode === "reactors" ? (
            <>
              <div style={{ opacity: 0.6, marginTop: 2 }}>{hoveredPlant.country}</div>
              <div style={{ color: "#d4a54a", marginTop: 6, fontFamily: "'DM Mono',monospace", fontSize: 14 }}>{hoveredPlant.capacity.toLocaleString()} MW</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: STATUS_COLORS[hoveredPlant.status] ?? STATUS_COLORS.Shutdown }}>● {hoveredPlant.status}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{hoveredPlant.reactors} reactor{hoveredPlant.reactors > 1 ? "s" : ""}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ opacity: 0.6, marginTop: 2 }}>{hoveredPlant.country} · {hoveredPlant.region}</div>
              <div style={{ color: SUPPLY_STAGE_COLORS[hoveredPlant.stage] || "#d4a54a", marginTop: 6, fontFamily: "'DM Mono',monospace", fontSize: 13 }}>
                {hoveredPlant.stage}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(245,240,232,0.7)", lineHeight: 1.5 }}>
                {hoveredPlant.detail}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 10 }}>
                <span style={{ fontSize: 11, color: "rgba(245,240,232,0.72)" }}>{hoveredPlant.status}</span>
                <span style={{ fontSize: 11, opacity: 0.5, textAlign: "right" }}>{hoveredPlant.operator}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
