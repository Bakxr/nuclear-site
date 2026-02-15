import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import * as d3 from "d3";
import { STATUS_COLORS, STATUS_COLORS_HEX } from "../data/constants.js";

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
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

export default function Globe({ onSelectPlant, plants }) {
  const mountRef = useRef(null);
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: -1.0 });
  const autoRotate = useRef(true);
  const autoRotateTimer = useRef(null);

  // Shared refs between the two effects
  const pivotGroupRef = useRef(null);
  const markersRef = useRef([]);

  // ── Effect 1: One-time scene setup (renderer, lights, globe, atmosphere, animation loop) ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.0);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x88aacc, 0.25);
    rim.position.set(-3, -2, -3);
    scene.add(rim);

    // Pivot group for all rotating elements
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    // Ocean sphere
    const oceanGeom = new THREE.SphereGeometry(0.995, 96, 96);
    const oceanMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, shininess: 60, transparent: true, opacity: 0.95 });
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
        ctx.fillStyle = "#c8b89a";
        ctx.strokeStyle = "#a89878";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        path(land);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(212,165,74,0.12)";
        ctx.lineWidth = 0.5;
        const graticule = d3.geoGraticule().step([15, 15])();
        ctx.beginPath();
        path(graticule);
        ctx.stroke();

        landTexture = new THREE.CanvasTexture(texCanvas);
        landTexture.needsUpdate = true;
        globeGeom = new THREE.SphereGeometry(1, 96, 96);
        globeMat = new THREE.MeshPhongMaterial({ map: landTexture, transparent: true, shininess: 10 });
      } else {
        // Fallback: solid color globe
        globeGeom = new THREE.SphereGeometry(1, 64, 64);
        globeMat = new THREE.MeshPhongMaterial({ color: 0xc8b89a, shininess: 10 });
      }
      pivotGroup.add(new THREE.Mesh(globeGeom, globeMat));
    });

    // Atmosphere
    const atmosGeom = new THREE.SphereGeometry(1.06, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main(){ float intensity=pow(0.65-dot(vNormal,vec3(0.0,0.0,1.0)),3.0); gl_FragColor=vec4(0.4,0.6,1.0,1.0)*intensity*0.5; }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (autoRotate.current && !isDragging.current) {
        rotation.current.y += 0.0015;
      }
      pivotGroup.rotation.x = rotation.current.x;
      pivotGroup.rotation.y = rotation.current.y;

      const t = Date.now() * 0.003;
      pivotGroup.children.forEach(ch => {
        if (ch.userData?.pulse) {
          const s = 1 + 0.4 * Math.sin(t + ch.userData.phase);
          ch.scale.set(s, s, s);
          ch.material.opacity = 0.15 + 0.2 * Math.sin(t + ch.userData.phase);
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
        setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top });
        mount.style.cursor = "pointer";
      } else {
        setHoveredPlant(null);
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
      if (hits.length > 0) onSelectPlant(hits[0].object.userData.plant);
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
        if (hits.length > 0) onSelectPlant(hits[0].object.userData.plant);
      }
    };

    const el = renderer.domElement;
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("click", onClick);
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
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      // Dispose static geometry/materials
      oceanGeom.dispose();
      oceanMat.dispose();
      atmosGeom.dispose();
      atmosMat.dispose();
      globeGeom?.dispose();
      globeMat?.dispose();
      landTexture?.dispose();
      renderer.dispose();
      pivotGroupRef.current = null;
      if (mount.contains(el)) mount.removeChild(el);
    };
  }, []); // ← runs once only; never re-runs on plants/filter changes

  // ── Effect 2: Update markers only when plants prop changes (no CDN re-fetch) ──
  useEffect(() => {
    const pivotGroup = pivotGroupRef.current;
    if (!pivotGroup) return;

    // Dispose and remove old markers and rings
    const toRemove = pivotGroup.children.filter(ch => ch.userData?.isMarker || ch.userData?.pulse);
    toRemove.forEach(ch => {
      ch.geometry?.dispose();
      ch.material?.dispose();
      pivotGroup.remove(ch);
    });

    // Add new markers
    const markers = [];
    plants.forEach((plant, i) => {
      const pos = latLngToVector3(plant.lat, plant.lng, 1.015);
      const color = STATUS_COLORS_HEX[plant.status] ?? STATUS_COLORS_HEX.Shutdown;

      const markerGeom = new THREE.SphereGeometry(0.012, 10, 10);
      const markerMat = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.copy(pos);
      marker.userData = { plant, index: i, isMarker: true };
      markers.push(marker);
      pivotGroup.add(marker);

      // Glow ring
      const ringGeom = new THREE.RingGeometry(0.014, 0.024, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData.pulse = true;
      ring.userData.phase = Math.random() * 6.28;
      pivotGroup.add(ring);
    });

    markersRef.current = markers;

    return () => {
      // Dispose marker GPU resources on re-run or unmount
      const group = pivotGroupRef.current;
      if (!group) return;
      markers.forEach(m => {
        m.geometry?.dispose();
        m.material?.dispose();
      });
    };
  }, [plants]);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative", cursor: "grab", borderRadius: 16, overflow: "hidden" }}>
      {hoveredPlant && tooltip.visible && (
        <div style={{
          position: "absolute", left: Math.min(tooltip.x + 14, 300), top: tooltip.y - 10,
          background: "rgba(20,18,14,0.94)", color: "#f5f0e8", padding: "12px 16px", borderRadius: 8,
          fontSize: 13, fontFamily: "'DM Sans',sans-serif", pointerEvents: "none", zIndex: 10,
          border: "1px solid rgba(212,165,74,0.3)", maxWidth: 240, lineHeight: 1.4,
          backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{hoveredPlant.name}</div>
          <div style={{ opacity: 0.6, marginTop: 2 }}>{hoveredPlant.country}</div>
          <div style={{ color: "#d4a54a", marginTop: 6, fontFamily: "'DM Mono',monospace", fontSize: 14 }}>{hoveredPlant.capacity.toLocaleString()} MW</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: STATUS_COLORS[hoveredPlant.status] ?? STATUS_COLORS.Shutdown }}>● {hoveredPlant.status}</span>
            <span style={{ fontSize: 11, opacity: 0.5 }}>{hoveredPlant.reactors} reactor{hoveredPlant.reactors > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
