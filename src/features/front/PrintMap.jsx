import { useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3";
import { STATUS_TEXT_COLORS } from "../../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../../data/supplySites.js";
import { fetchCountries } from "../../services/worldAtlas.js";
import { dotRadius, fitTransform } from "./mapMath.js";

const WIDTH = 960;
const HEIGHT = 500;
const MAX_ZOOM = 8;

const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: "Sphere" });
const path = geoPath(projection);
const SPHERE = path({ type: "Sphere" });
const GRATICULE = path(geoGraticule10());

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function project(item) {
  if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return null;
  return projection([item.lng, item.lat]);
}

// Flat world map in the broadsheet style: paper sea, toned land, ink coast.
// Dots are sized by capacity and colored by status (or mine stage). Zoom is
// by buttons, with drag to pan once zoomed; narrowing the list (search,
// filters, a story's "Map:" link) fits the view to what's left.
export default function PrintMap({ items, mode = "reactors", totalCount, onSelectPlant }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const [countries, setCountries] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCountries().then((geo) => { if (!cancelled) setCountries(geo); });
    return () => { cancelled = true; };
  }, []);

  const dots = useMemo(() => (items || [])
    .map((item) => {
      const point = project(item);
      return point ? { item, x: point[0], y: point[1], r: dotRadius(item, mode) } : null;
    })
    .filter(Boolean)
    // Big plants first so small ones stay visible on top.
    .sort((a, b) => b.r - a.r), [items, mode]);

  const filtered = Number.isFinite(totalCount) && dots.length > 0 && dots.length < totalCount;
  const fitKey = filtered ? dots.map((d) => d.item.name).join("|") : "all";

  useEffect(() => {
    // Fit the view to a narrowed list; show the whole world otherwise.
    setView(filtered ? fitTransform(dots, WIDTH, HEIGHT, MAX_ZOOM) : { k: 1, x: 0, y: 0 });
    setHover(null);
    // fitKey captures the dots that matter for the fit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  function zoomBy(factor) {
    setView((v) => {
      const k = clamp(v.k * factor, 1, MAX_ZOOM);
      if (k === 1) return { k: 1, x: 0, y: 0 };
      // Zoom around the center of the frame.
      const cx = WIDTH / 2;
      const cy = HEIGHT / 2;
      return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
    });
  }

  function toSvg(event) {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function onPointerDown(event) {
    if (view.k === 1) return;
    drag.current = { start: toSvg(event), view };
    svgRef.current.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!drag.current) return;
    const point = toSvg(event);
    const { start, view: from } = drag.current;
    setView({ ...from, x: from.x + point.x - start.x, y: from.y + point.y - start.y });
  }

  function endDrag() {
    drag.current = null;
  }

  const showTip = (dot) => (event) => {
    const box = svgRef.current.parentElement.getBoundingClientRect();
    const left = event.clientX - box.left;
    // Near the right edge the card opens to the left of the pointer.
    setHover({ dot, left, top: event.clientY - box.top, flip: left > box.width - 260 });
  };

  const scaleDot = 1 / Math.sqrt(view.k);
  const label = `World map: ${dots.length} ${mode === "reactors" ? "nuclear plants" : "uranium sites"}${filtered ? " matching the current filter" : ""}`;

  return (
    <div className="np-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        className={view.k > 1 ? "is-zoomed" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => { endDrag(); setHover(null); }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <path d={SPHERE} className="np-map-sea" />
          <path d={GRATICULE} className="np-map-graticule" />
          {countries?.features?.map((feature, i) => (
            <path key={i} d={path(feature)} className="np-map-land" />
          ))}
          <path d={SPHERE} className="np-map-frame" />
          {dots.map((dot) => {
            const color = mode === "reactors"
              ? STATUS_TEXT_COLORS[dot.item.status] || STATUS_TEXT_COLORS.Shutdown
              : SUPPLY_STAGE_COLORS[dot.item.stage] || "var(--np-c-amber)";
            const active = hover?.dot === dot;
            return (
              <circle
                key={`${dot.item.name}-${dot.x}`}
                cx={dot.x}
                cy={dot.y}
                r={dot.r * scaleDot * (active ? 1.5 : 1)}
                fill={color}
                className="np-map-dot"
                onPointerEnter={showTip(dot)}
                onPointerMove={showTip(dot)}
                onClick={() => { if (!drag.current && mode === "reactors") onSelectPlant?.(dot.item); }}
              />
            );
          })}
        </g>
      </svg>

      <div className="np-map-controls" role="group" aria-label="Map zoom">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" disabled={view.k >= MAX_ZOOM}>+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" disabled={view.k <= 1}>−</button>
        <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} disabled={view.k === 1}>World</button>
      </div>
      {view.k > 1 ? <div className="np-map-hint">Drag to pan</div> : null}

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
