import { useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3";
import { STATUS_TEXT_COLORS } from "../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../data/supplySites.js";
import { fetchCountries } from "../../services/worldAtlas.js";
import { angularDistance, clamp, focusOn, formatCoords, shortestTurn } from "./globeMath.js";
import { dotRadius } from "./mapMath.js";

const SPHERE = { type: "Sphere" };
const GRATICULE = geoGraticule10();
const MAX_ZOOM = 8;
const HOME = { lng: -40, lat: 24 }; // over the Atlantic: the Americas and Europe in view
const SPIN = 5; // degrees per second while idle
const RING = 16; // room for the bezel round the globe

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Canvas needs real colours: read the theme tokens off the element.
function readPalette(el) {
  const css = getComputedStyle(el);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const paper = token("--np-bg", "#f5f2ea");
  const dark = Number.parseInt(paper.slice(1, 3), 16) < 96;
  const cache = new Map();
  return {
    paper,
    ink: token("--np-text", "#16140f"),
    land: dark ? token("--np-callout-bg", "#24221e") : paper,
    sea: dark ? token("--np-bg", "#121110") : token("--np-callout-bg", "#eae5d8"),
    accent: token("--np-accent", "#1c44c9"),
    shade: dark ? "rgba(0, 0, 0, 0.55)" : "rgba(22, 20, 15, 0.16)",
    dark,
    color(value) {
      if (!value?.startsWith("var(")) return value;
      if (!cache.has(value)) cache.set(value, token(value.slice(4, -1).trim(), "#888"));
      return cache.get(value);
    },
  };
}

// The reactor map as an engraved globe: hatched sea, paper land, ink coast,
// the far side showing faintly through. It turns slowly until touched; drag
// to spin, the buttons zoom, and narrowing the list (filters, search, a
// story's "Map:" link) swings the globe round to what's left. Plants under
// construction pulse.
export default function PrintGlobe({ items, mode = "reactors", totalCount, onSelectPlant }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const readoutRef = useRef(null);
  const [countries, setCountries] = useState(null);
  const [hover, setHover] = useState(null);
  const [zoom, setZoom] = useState(1);
  const sim = useRef({
    lng: HOME.lng, lat: HOME.lat, zoom: 1, target: null, spinning: !prefersReducedMotion(),
    velocity: 0, drag: null, inside: false, visible: true, width: 0, height: 0, onScreen: [], hovered: null,
  });
  const scene = useRef({ dots: [], countries: null, mode, palette: null });

  useEffect(() => {
    let cancelled = false;
    fetchCountries().then((geo) => { if (!cancelled) setCountries(geo); });
    return () => { cancelled = true; };
  }, []);

  const dots = useMemo(() => (items || [])
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => ({
      item,
      r: dotRadius(item, mode),
      color: mode === "reactors"
        ? STATUS_TEXT_COLORS[item.status] || STATUS_TEXT_COLORS.Shutdown
        : SUPPLY_STAGE_COLORS[item.stage] || "var(--np-c-amber)",
      pulse: mode === "reactors" && item.status === "Construction",
    }))
    // Big plants first so small ones stay visible on top.
    .sort((a, b) => b.r - a.r), [items, mode]);

  scene.current.dots = dots;
  scene.current.countries = countries;
  scene.current.mode = mode;

  const filtered = Number.isFinite(totalCount) && dots.length > 0 && dots.length < totalCount;
  const fitKey = filtered ? dots.map((d) => d.item.name).join("|") : "all";

  // Swing round to a narrowed list; back to a slow turn otherwise.
  useEffect(() => {
    const s = sim.current;
    if (filtered) {
      const focus = focusOn(dots.map((d) => d.item), 6);
      s.target = { lng: focus.lng, lat: clamp(focus.lat, -70, 70), zoom: focus.zoom };
      s.spinning = false;
      setZoom(focus.zoom);
    } else {
      s.target = { lng: s.lng, lat: HOME.lat, zoom: 1 };
      s.spinning = !prefersReducedMotion();
      setZoom(1);
    }
    s.velocity = 0;
    setHover(null);
    // fitKey captures the dots that matter for the fit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Size, theme, visibility and the draw loop.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const s = sim.current;
    const reduced = prefersReducedMotion();
    const front = geoOrthographic().clipAngle(90).precision(0.6);
    const back = geoOrthographic().clipAngle(90).precision(0.6).reflectX(true);
    const frontPath = geoPath(front, ctx);
    const backPath = geoPath(back, ctx);
    let dpr = 1;
    let frame = 0;
    let last = performance.now();

    const refreshPalette = () => { scene.current.palette = readPalette(wrap); };
    refreshPalette();

    const resize = () => {
      const width = wrap.clientWidth;
      const height = Math.round(clamp(width * 0.82, 340, 620));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.width = width;
      s.height = height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
    };
    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(wrap);

    const themeObserver = new MutationObserver(refreshPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const scheme = window.matchMedia?.("(prefers-color-scheme: dark)");
    scheme?.addEventListener?.("change", refreshPalette);

    const viewObserver = new IntersectionObserver(([entry]) => { s.visible = entry.isIntersecting; });
    viewObserver.observe(wrap);

    function step(dt) {
      if (s.target) {
        const ease = 1 - Math.exp(-dt * 4.5);
        const turn = shortestTurn(s.lng, s.target.lng);
        s.lng += turn * ease;
        s.lat += (s.target.lat - s.lat) * ease;
        s.zoom += (s.target.zoom - s.zoom) * ease;
        if (Math.abs(turn) < 0.05 && Math.abs(s.target.lat - s.lat) < 0.05 && Math.abs(s.target.zoom - s.zoom) < 0.005) {
          s.target = null;
        }
      } else if (!s.drag) {
        if (Math.abs(s.velocity) > 0.5) {
          s.lng += s.velocity * dt;
          s.velocity *= Math.exp(-dt * 2.5);
        } else {
          s.velocity = 0;
          if (s.spinning && !s.inside) s.lng += SPIN * dt;
        }
      }
      s.lng = ((s.lng + 540) % 360) - 180;
    }

    function draw(time) {
      const { width, height } = s;
      const pal = scene.current.palette;
      const { dots: all, countries: geo } = scene.current;
      const cx = width / 2;
      const cy = height / 2;
      const radius = (Math.min(width, height) / 2 - RING) * s.zoom;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      front.scale(radius).translate([cx, cy]).rotate([-s.lng, -s.lat]);
      back.scale(radius).translate([cx, cy]).rotate([-s.lng + 180, s.lat]);

      // Bezel: two hairlines with a degree scale that turns with the globe.
      if (s.zoom < 1.4) {
        ctx.strokeStyle = pal.ink;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.75;
        for (const extra of [5, RING - 3]) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + extra, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        for (let deg = 0; deg < 360; deg += 5) {
          const angle = ((deg + s.lng) * Math.PI) / 180;
          const inner = radius + (deg % 30 === 0 ? 5 : RING - 8);
          ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
          ctx.lineTo(cx + Math.cos(angle) * (radius + RING - 3), cy + Math.sin(angle) * (radius + RING - 3));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Sea, engraved: a flat tone with fine horizontal hatching.
      ctx.save();
      ctx.beginPath();
      frontPath(SPHERE);
      ctx.fillStyle = pal.sea;
      ctx.fill();
      ctx.clip();
      ctx.beginPath();
      const top = Math.max(0, cy - radius);
      const bottom = Math.min(height, cy + radius);
      for (let y = Math.floor(top) + 0.5; y < bottom; y += 3) {
        ctx.moveTo(Math.max(0, cx - radius), y);
        ctx.lineTo(Math.min(width, cx + radius), y);
      }
      ctx.strokeStyle = pal.ink;
      ctx.globalAlpha = pal.dark ? 0.07 : 0.08;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // The far side, faintly, as if through glass.
      if (geo) {
        ctx.beginPath();
        backPath(geo);
        ctx.globalAlpha = pal.dark ? 0.14 : 0.12;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Graticule, land and coast.
      ctx.beginPath();
      frontPath(GRATICULE);
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (geo) {
        ctx.beginPath();
        frontPath(geo);
        ctx.fillStyle = pal.land;
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Shading toward the limb, lit from the upper left.
      const lx = cx - radius * 0.3;
      const ly = cy - radius * 0.35;
      const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.45);
      light.addColorStop(0, "rgba(0, 0, 0, 0)");
      light.addColorStop(0.55, "rgba(0, 0, 0, 0)");
      light.addColorStop(1, pal.shade);
      ctx.fillStyle = light;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      // Plants on the near side.
      const centre = [s.lng, s.lat];
      const dotScale = 0.9 + Math.sqrt(s.zoom) * 0.22;
      const pulsePhase = reduced ? 0.5 : (time % 2200) / 2200;
      const onScreen = [];
      for (const dot of all) {
        if (angularDistance(centre, [dot.item.lng, dot.item.lat]) > Math.PI / 2 - 0.02) continue;
        const point = front([dot.item.lng, dot.item.lat]);
        if (!point || point[0] < -10 || point[0] > width + 10 || point[1] < -10 || point[1] > height + 10) continue;
        const r = dot.r * dotScale;
        const color = pal.color(dot.color);
        if (dot.pulse) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], r + 2 + pulsePhase * 12, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.7 * (1 - pulsePhase);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.arc(point[0], point[1], s.hovered === dot ? r * 1.5 : r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = s.hovered === dot ? pal.ink : pal.paper;
        ctx.lineWidth = s.hovered === dot ? 1.5 : 0.8;
        ctx.stroke();
        onScreen.push({ dot, x: point[0], y: point[1], r });
      }
      s.onScreen = onScreen;

      // Rim.
      ctx.beginPath();
      frontPath(SPHERE);
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (readoutRef.current) {
        readoutRef.current.textContent = `${formatCoords(s.lng, s.lat)} · ×${s.zoom.toFixed(1)}`;
      }
    }

    const loop = (time) => {
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;
      if (s.visible && !document.hidden && s.width > 0) {
        step(dt);
        draw(time);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      themeObserver.disconnect();
      viewObserver.disconnect();
      scheme?.removeEventListener?.("change", refreshPalette);
    };
  }, []);

  function local(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hit(point) {
    let best = null;
    let bestDistance = Infinity;
    for (const spot of sim.current.onScreen) {
      const distance = Math.hypot(spot.x - point.x, spot.y - point.y);
      if (distance <= spot.r + 6 && distance < bestDistance) {
        best = spot;
        bestDistance = distance;
      }
    }
    return best;
  }

  function onPointerDown(event) {
    const s = sim.current;
    const point = local(event);
    s.drag = { start: point, last: point, lastTime: performance.now(), moved: false };
    s.target = null;
    s.velocity = 0;
    canvasRef.current.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    const s = sim.current;
    const point = local(event);
    if (s.drag) {
      const dx = point.x - s.drag.last.x;
      const dy = point.y - s.drag.last.y;
      if (Math.hypot(point.x - s.drag.start.x, point.y - s.drag.start.y) > 4) s.drag.moved = true;
      if (!s.drag.moved) return;
      // A full drag across the globe turns it about half a revolution.
      const degreesPerPixel = 180 / (Math.min(s.width, s.height) * s.zoom);
      s.lng -= dx * degreesPerPixel;
      s.lat = clamp(s.lat + dy * degreesPerPixel, -80, 80);
      const now = performance.now();
      const dt = Math.max((now - s.drag.lastTime) / 1000, 0.001);
      s.velocity = (-dx * degreesPerPixel) / dt;
      s.drag.last = point;
      s.drag.lastTime = now;
      s.hovered = null;
      setHover(null);
      return;
    }
    const spot = hit(point);
    if (spot?.dot !== s.hovered) {
      s.hovered = spot?.dot || null;
      setHover(spot ? { dot: spot.dot, left: spot.x, top: spot.y, flip: spot.x > s.width - 260 } : null);
    }
  }

  function onPointerUp(event) {
    const s = sim.current;
    const drag = s.drag;
    s.drag = null;
    if (drag && !drag.moved) {
      s.velocity = 0;
      const spot = hit(local(event));
      if (spot && scene.current.mode === "reactors") onSelectPlant?.(spot.dot.item);
    } else if (performance.now() - (drag?.lastTime || 0) > 80) {
      s.velocity = 0; // held still before letting go: no fling
    }
  }

  function zoomTo(next) {
    const s = sim.current;
    const zoomLevel = clamp(next, 1, MAX_ZOOM);
    s.target = { lng: s.lng, lat: s.lat, zoom: zoomLevel };
    setZoom(zoomLevel);
  }

  function resetView() {
    const s = sim.current;
    s.target = { lng: HOME.lng, lat: HOME.lat, zoom: 1 };
    s.spinning = !prefersReducedMotion();
    setZoom(1);
  }

  const label = `Globe: ${dots.length} ${mode === "reactors" ? "nuclear plants" : "uranium sites"}${filtered ? " matching the current filter" : ""}. Drag to turn it; the list beside it has every entry.`;

  return (
    <div className="np-map np-globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { sim.current.drag = null; }}
        onPointerEnter={() => { sim.current.inside = true; }}
        onPointerLeave={() => {
          const s = sim.current;
          s.inside = false;
          s.hovered = null;
          setHover(null);
        }}
        style={{ cursor: hover ? "pointer" : "grab" }}
      />

      <div className="np-map-controls" role="group" aria-label="Globe zoom">
        <button type="button" onClick={() => zoomTo(zoom * 1.6)} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}>+</button>
        <button type="button" onClick={() => zoomTo(zoom / 1.6)} aria-label="Zoom out" disabled={zoom <= 1}>−</button>
        <button type="button" onClick={resetView}>World</button>
      </div>
      <div className="np-globe-readout np-num" ref={readoutRef} aria-hidden="true" />
      <div className="np-map-hint">Drag to turn · select a {mode === "reactors" ? "plant" : "site"}</div>

      {hover ? (
        <div className={`np-map-tip${hover.flip ? " is-flipped" : ""}`} style={{ left: hover.left, top: hover.top }} role="status">
          <strong>{hover.dot.item.name}</strong>
          <span>{hover.dot.item.country}{hover.dot.item.type ? ` · ${hover.dot.item.type}` : ""}</span>
          {mode === "reactors" ? (
            <span className="np-num">{Number(hover.dot.item.capacity || 0).toLocaleString()} MW · {hover.dot.item.status}</span>
          ) : (
            <span>{hover.dot.item.stage}</span>
          )}
          {mode === "reactors" ? <em>Click for the plant profile</em> : null}
        </div>
      ) : null}
    </div>
  );
}
