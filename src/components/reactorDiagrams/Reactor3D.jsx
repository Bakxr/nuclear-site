import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildReactorScene } from "./three/build.js";
import { SCHEMATICS } from "./schematic/layouts.jsx";
import { FLUID } from "./schematic/kit.jsx";

const MOBILE_BREAKPOINT = 640;
// Camera looks from +z (group-local) where every model is cut away; the
// group's base rotation turns the turbine hall (+x) toward screen-right.
const VIEW_DIR = new THREE.Vector3(0, 0.36, 1).normalize();
const BASE_YAW = 0.55;
const HIDDEN_MARKERS = new Set(["containment", "condenser", "generator", "steamline", "building"]);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function Reactor3D({ type = "PWR" }) {
  const mountRef = useRef(null);
  const markerRefs = useRef({});
  const selectedRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false));
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const design = SCHEMATICS[type] || SCHEMATICS.Other;
  // Geometry is built once per design; the effect below owns GPU resources.
  const model = useMemo(() => buildReactorScene(type), [type]);
  // Markers for the reactor-side components only; the turbine hall and
  // containment are covered by the schematic and would crowd the view.
  const hotspots = useMemo(
    () => model.hotspots.filter((h) => design.parts[h.id] && !HIDDEN_MARKERS.has(h.id)),
    [model, design],
  );
  const height = isMobile ? 340 : 420;
  const selected = useMemo(() => {
    const spot = hotspots.find((h) => h.id === selectedId);
    return spot ? { ...spot, ...(design.parts[spot.id] || { label: spot.id, description: "" }) } : null;
  }, [hotspots, selectedId, design]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const reduced = prefersReducedMotion();
    let width = container.clientWidth || 680;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;
    scene.fog = new THREE.Fog(0x0e0b08, 16, 34);

    scene.add(new THREE.HemisphereLight(0xf3e7d3, 0x201810, 0.55));
    const key = new THREE.DirectionalLight(0xfff3e2, 1.6);
    key.position.set(6, 10, 7);
    scene.add(key);
    const coreLight = new THREE.PointLight(0xff8a3a, 6, 4.5, 1.6);
    coreLight.position.set(0, 1.5, 0.3);
    scene.add(coreLight);

    const group = new THREE.Group();
    group.add(model.root);
    group.rotation.y = BASE_YAW;
    scene.add(group);

    // Frame the model: fit its bounding sphere to the view.
    // The ground disc is scenery — leave it out of the framing box.
    const box = new THREE.Box3();
    model.root.children.forEach((child) => {
      if (!child.userData.noBounds) box.expandByObject(child);
    });
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const camera = new THREE.PerspectiveCamera(isMobile ? 40 : 34, width / height, 0.1, 100);
    const center = sphere.center.clone();
    // Fit whichever field of view is tighter (horizontal on narrow screens).
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const fitDistance = (sphere.radius / Math.sin(Math.min(vFov, hFov) / 2)) * (isMobile ? 0.98 : 0.6);
    const defaultTarget = center.clone();
    const defaultPosition = center.clone().add(VIEW_DIR.clone().multiplyScalar(fitDistance));
    camera.position.copy(defaultPosition);
    camera.lookAt(defaultTarget);
    const currentTarget = defaultTarget.clone();

    const anchors = hotspots.map((h) => ({ id: h.id, v: new THREE.Vector3(...h.anchor) }));

    const syncMarkers = () => {
      const tmp = new THREE.Vector3();
      for (const { id, v } of anchors) {
        const marker = markerRefs.current[id];
        if (!marker) continue;
        tmp.copy(v);
        model.root.localToWorld(tmp);
        tmp.project(camera);
        const visible = tmp.z > -1 && tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
        marker.style.opacity = visible ? "1" : "0";
        marker.style.pointerEvents = visible ? "auto" : "none";
        marker.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * width}px, ${(-tmp.y * 0.5 + 0.5) * height}px) translate(-50%, -50%)`;
      }
    };

    // Drag to rotate (yaw) and tilt; vertical swipes on touch scroll the page.
    const drag = { active: false, moved: false, id: null, type: "mouse", x: 0, y: 0, yaw: 0, tilt: 0, lastInteract: -Infinity };
    const onDown = (event) => {
      Object.assign(drag, { active: true, moved: false, id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY });
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event) => {
      if (!drag.active || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (drag.type === "touch" && !drag.moved) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          drag.active = false;
          return;
        }
      }
      drag.moved = true;
      drag.yaw += dx * 0.009;
      drag.tilt = THREE.MathUtils.clamp(drag.tilt + dy * 0.006, -0.35, 0.45);
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.lastInteract = performance.now();
      if (drag.type === "touch") event.preventDefault();
    };
    const onUp = (event) => {
      if (drag.id !== event.pointerId) return;
      drag.active = false;
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove, { passive: false });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);

    // Only animate while on screen and the tab is visible.
    let visible = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; })
      : null;
    io?.observe(container);

    const onResize = () => {
      width = container.clientWidth || width;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const clock = new THREE.Clock();
    let frame = 0;
    const tmpPos = new THREE.Vector3();
    const tmpTarget = new THREE.Vector3();
    const render = () => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();

      // Idle: a gentle sway that keeps the cutaway facing the viewer.
      const idle = performance.now() - drag.lastInteract > 2500 && !drag.active;
      if (idle && !reduced) drag.yaw *= 0.985;
      const sway = reduced ? 0 : Math.sin(t * 0.22) * 0.22;
      group.rotation.y = BASE_YAW + drag.yaw + (idle ? sway : 0);
      group.rotation.x = drag.tilt * 0.6;

      const active = selectedRef.current;
      if (active) {
        tmpTarget.set(...active.anchor);
        model.root.localToWorld(tmpTarget);
        tmpPos.copy(tmpTarget).add(VIEW_DIR.clone().multiplyScalar(fitDistance * 0.45));
      } else {
        tmpTarget.copy(defaultTarget);
        tmpPos.copy(defaultPosition);
      }
      currentTarget.lerp(tmpTarget, 0.07);
      camera.position.lerp(tmpPos, 0.07);
      camera.lookAt(currentTarget);

      coreLight.intensity = 5 + Math.sin(t * 1.6) * (reduced ? 0 : 1.2);
      model.update(t, { motion: !reduced });
      syncMarkers();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
      group.remove(model.root);
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      container.replaceChildren();
    };
  }, [model, hotspots, isMobile, height]);

  // Free the model's geometry/materials when the design changes or on unmount.
  useEffect(() => () => model.dispose(), [model]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const panel = {
    background: "rgba(16, 13, 9, 0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    borderRadius: 12,
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={mountRef}
        role="img"
        aria-label={`Interactive 3D cutaway of a ${design.title}. Drag to rotate; select a marker for details.`}
        style={{
          width: "100%",
          height,
          cursor: "grab",
          borderRadius: 10,
          overflow: "hidden",
          background: "radial-gradient(ellipse 80% 70% at 45% 40%, #221c14 0%, #0e0b08 70%)",
        }}
      />

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 10 }}>
        {hotspots.map((spot) => {
          const on = selectedId === spot.id;
          const showLabel = !isMobile && (on || hoveredId === spot.id);
          const info = design.parts[spot.id];
          return (
            <button
              key={spot.id}
              ref={(node) => {
                if (node) markerRefs.current[spot.id] = node;
                else delete markerRefs.current[spot.id];
              }}
              type="button"
              aria-label={info?.label || spot.id}
              aria-pressed={on}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId((current) => (current === spot.id ? null : spot.id));
              }}
              onMouseEnter={() => setHoveredId(spot.id)}
              onMouseLeave={() => setHoveredId((current) => (current === spot.id ? null : current))}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: on ? 20 : 16,
                height: on ? 20 : 16,
                padding: 0,
                borderRadius: "50%",
                border: `2px solid ${on ? "#f5d082" : "rgba(255,255,255,0.85)"}`,
                background: on ? "#d4a54a" : "rgba(16, 13, 9, 0.85)",
                boxShadow: on ? "0 0 0 6px rgba(212,165,74,0.2), 0 0 22px rgba(212,165,74,0.5)" : "0 0 0 4px rgba(255,255,255,0.08)",
                opacity: 0,
                cursor: "pointer",
                transition: "width .2s, height .2s, background .2s",
              }}
            >
              <span style={{ position: "absolute", inset: 3, borderRadius: "50%", background: on ? "#1a140c" : "#d4a54a" }} />
              {showLabel ? (
                <span
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(16, 13, 9, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 11.5,
                    lineHeight: 1,
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  {info?.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div
          style={{
            ...panel,
            position: "absolute",
            ...(isMobile ? { left: 10, right: 10, bottom: 10 } : { right: 12, top: 12, width: 260 }),
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4a54a", fontWeight: 700 }}>Inside the reactor</div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelectedId(null)}
              style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 600, marginBottom: 5 }}>{selected.label}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,0.75)" }}>{selected.description}</div>
        </div>
      ) : null}

      <ul
        aria-label="Legend"
        style={{
          ...panel,
          position: "absolute",
          left: 12,
          bottom: 12,
          margin: 0,
          padding: "8px 10px",
          listStyle: "none",
          display: isMobile ? "none" : "grid",
          gap: 4,
          pointerEvents: "none",
          font: "500 10.5px/1.2 'DM Sans',sans-serif",
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {design.fluids.map((fluid) => (
          <li key={fluid} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <i style={{ width: 12, height: 4, borderRadius: 2, background: FLUID[fluid].color }} />
            {FLUID[fluid].label}
          </li>
        ))}
      </ul>

      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 14,
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "'DM Sans',sans-serif",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        Drag to rotate · tap a marker for details
      </div>
    </div>
  );
}
