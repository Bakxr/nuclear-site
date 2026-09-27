/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";

// Shared drawing kit for the reactor schematics. Everything is sized for a
// 1000×560 viewBox and themed through the site's CSS variables, so the same
// drawing works in light and dark mode.

export const VIEW_W = 1000;
export const VIEW_H = 560;
export const GROUND_Y = 470;

// Fluid colours — shared with the 3D models' legend so both views agree.
export const FLUID = {
  hot: { color: "#e5673a", label: "Primary coolant (hot)" },
  cold: { color: "#e0a84e", label: "Primary coolant (returning)" },
  steam: { color: "#9fabb9", label: "Steam" },
  feed: { color: "#5aa7d8", label: "Feedwater / condensate" },
  cooling: { color: "#3fb8a8", label: "Cooling water" },
  water: { color: "#e0a84e", label: "Reactor water (recirculating)" },
  helium: { color: "#b48cf0", label: "Helium coolant (hot)" },
  heliumCold: { color: "#7d6ab0", label: "Helium (returning)" },
  heavy: { color: "#7fa2ff", label: "Heavy water moderator" },
};

const PartContext = createContext({ active: null, setActive: () => {} });
export const PartProvider = PartContext.Provider;

// Interactive component group. Hover/focus/tap sets it active; the wrapper
// shows its description. Non-active parts dim while one is active.
export function Part({ id, children }) {
  const { active, setActive } = useContext(PartContext);
  const state = active == null ? "idle" : active === id ? "on" : "off";
  return (
    <g
      className="npx-part"
      data-state={state}
      tabIndex={0}
      role="button"
      aria-label={id}
      onMouseEnter={() => setActive(id)}
      onFocus={() => setActive(id)}
      onClick={(event) => {
        event.stopPropagation();
        setActive(id);
      }}
    >
      {children}
    </g>
  );
}

// A fluid line: a solid base stroke plus an animated dashed overlay that
// travels in the direction the path is drawn.
export function Flow({ d, fluid, width = 7, speed = 1 }) {
  const color = FLUID[fluid]?.color || fluid;
  return (
    <g className="npx-flow-group" pointerEvents="none">
      <path d={d} fill="none" stroke={color} strokeOpacity="0.32" strokeWidth={width + 4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={d}
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth={Math.max(1.5, width * 0.32)}
        strokeLinecap="round"
        className="npx-flow"
        style={{ animationDuration: `${1.6 / speed}s` }}
      />
    </g>
  );
}

// Text label with a leader line to (tx, ty).
export function Label({ x, y, tx, ty, children, anchor = "start", sub }) {
  return (
    <g className="npx-label" pointerEvents="none">
      {tx != null ? <path d={`M${tx} ${ty} L${x} ${y}`} className="npx-leader" /> : null}
      {tx != null ? <circle cx={tx} cy={ty} r="2.6" className="npx-leader-dot" /> : null}
      <text x={x + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0)} y={y + 4} textAnchor={anchor} className="npx-label-text">
        {children}
      </text>
      {sub ? (
        <text x={x + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0)} y={y + 18} textAnchor={anchor} className="npx-label-sub">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

// Rounded capsule (vessels, steam generators).
export function Capsule({ x, y, w, h, className = "npx-shell" }) {
  const r = w / 2;
  return <path d={`M${x} ${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} L${x + w} ${y + h - r} A${r} ${r} 0 0 1 ${x} ${y + h - r} Z`} className={className} />;
}

// Containment building: vertical walls with a hemispherical dome.
export function Containment({ x, w, top, label = "Containment building" }) {
  // Elliptical dome: apex at `top`, walls start `ry` below it.
  const rx = w / 2;
  const ry = rx * 0.5;
  const d = `M${x} ${GROUND_Y} L${x} ${top + ry} A${rx} ${ry} 0 0 1 ${x + w} ${top + ry} L${x + w} ${GROUND_Y}`;
  return (
    <Part id="containment">
      <path d={`${d} Z`} className="npx-containment-fill" />
      <path d={d} className="npx-containment" />
      <text x={x + 14} y={GROUND_Y + 22} className="npx-caption">{label.toUpperCase()}</text>
    </Part>
  );
}

// Fuel core: a block of fuel rods with a hot glow.
export function Core({ x, y, w, h, rods = 7, glow = "#ffb04a" }) {
  const gap = w / rods;
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="4" fill={glow} opacity="0.18" className="npx-core-glow" />
      {Array.from({ length: rods }, (_, i) => (
        <rect key={i} x={x + i * gap + gap * 0.2} y={y} width={gap * 0.6} height={h} rx="1.5" fill={glow} opacity="0.92" />
      ))}
    </g>
  );
}

// Control rods (vertical bars). Position them above the core (PWR) or below
// it (BWR) via `y`.
export function ControlRods({ x, y, w, length, count = 4 }) {
  const gap = w / count;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x + gap * (i + 0.5) - 2} y={y} width="4" height={length} rx="1" className="npx-rod" />
      ))}
    </g>
  );
}

export function Pump({ cx, cy, r = 14 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="npx-machine" />
      <path d={`M${cx - r * 0.55} ${cy + r * 0.45} L${cx} ${cy - r * 0.55} L${cx + r * 0.55} ${cy + r * 0.45}`} className="npx-machine-mark" />
    </g>
  );
}

// Turbine (HP → LP expanding casing) + shaft to the generator.
export function Turbine({ x, y, w = 190, h = 70 }) {
  const mid = y + h / 2;
  return (
    <g>
      <path d={`M${x} ${mid - h * 0.22} L${x + w * 0.35} ${mid - h * 0.32} L${x + w * 0.35} ${mid + h * 0.32} L${x} ${mid + h * 0.22} Z`} className="npx-machine" />
      <path d={`M${x + w * 0.38} ${mid - h * 0.38} L${x + w} ${mid - h * 0.5} L${x + w} ${mid + h * 0.5} L${x + w * 0.38} ${mid + h * 0.38} Z`} className="npx-machine" />
      {[0.5, 0.62, 0.74, 0.86].map((f) => (
        <path key={f} d={`M${x + w * f} ${mid - h * (0.4 + f * 0.1)} L${x + w * f} ${mid + h * (0.4 + f * 0.1)}`} className="npx-machine-mark" />
      ))}
    </g>
  );
}

export function Generator({ x, y, w = 90, h = 50 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" className="npx-machine" />
      <path d={`M${x + 18} ${y + h / 2} q8 -12 16 0 t16 0 t16 0 t16 0`} className="npx-machine-mark" fill="none" />
    </g>
  );
}

export function Condenser({ x, y, w = 180, h = 58 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" className="npx-machine" />
      {[0.3, 0.5, 0.7].map((f) => (
        <path key={f} d={`M${x + 14} ${y + h * f} L${x + w - 14} ${y + h * f}`} stroke={FLUID.cooling.color} strokeOpacity="0.7" strokeWidth="2.2" strokeDasharray="6 5" />
      ))}
    </g>
  );
}

export function CoolingTower({ x, y, w = 110, h = 150 }) {
  const top = y;
  const bottom = y + h;
  const waist = y + h * 0.62;
  const d = `M${x} ${bottom} C${x + w * 0.2} ${waist + 10} ${x + w * 0.22} ${waist - 10} ${x + w * 0.16} ${top} L${x + w * 0.84} ${top} C${x + w * 0.78} ${waist - 10} ${x + w * 0.8} ${waist + 10} ${x + w} ${bottom} Z`;
  return (
    <g>
      <path d={d} className="npx-tower" />
      <g className="npx-vapor">
        <ellipse cx={x + w * 0.42} cy={top - 18} rx={w * 0.22} ry="13" />
        <ellipse cx={x + w * 0.6} cy={top - 34} rx={w * 0.2} ry="12" />
        <ellipse cx={x + w * 0.46} cy={top - 50} rx={w * 0.15} ry="10" />
      </g>
    </g>
  );
}

export function Ground() {
  return <path d={`M0 ${GROUND_Y} L${VIEW_W} ${GROUND_Y}`} className="npx-ground" />;
}

// Shared "balance of plant": turbine, generator, condenser, feed pump and a
// cooling tower, with the turbine→condenser and cooling loops drawn.
// Callers draw the steam line into (steamIn) and feedwater from (feedOut).
export const PLANT = {
  steamIn: [600, 214],
  feedOut: [560, 392],
};

export function BalanceOfPlant({ steamFluid = "steam" }) {
  return (
    <g>
      <Part id="turbine">
        <Turbine x={600} y={180} />
      </Part>
      <Part id="generator">
        <path d="M790 215 L822 215" className="npx-shaft" />
        <Generator x={822} y={190} />
      </Part>
      <Part id="condenser">
        <Flow d="M745 262 L745 300" fluid={steamFluid} width={6} />
        <Condenser x={610} y={300} />
        <Flow d="M650 358 L650 392 L574 392" fluid="feed" />
      </Part>
      <Part id="feedpump">
        <Pump cx={560} cy={392} />
      </Part>
      <Part id="cooling">
        {/* Warm water up to the tower's spray level; cooled water back from the basin. */}
        <Flow d="M790 318 L884 318 L884 396" fluid="cooling" width={6} />
        <Flow d="M872 456 L826 456 L826 342 L790 342" fluid="cooling" width={6} speed={0.9} />
        <CoolingTower x={850} y={318} />
      </Part>
    </g>
  );
}

// Parts shared by every design's balance of plant.
export const PLANT_PARTS = {
  turbine: { label: "Turbine", description: "Steam expands through high- and low-pressure stages, spinning the turbine shaft at 1,500–3,600 rpm." },
  generator: { label: "Generator", description: "The turbine drives the generator, turning rotation into grid electricity — typically 1,000–1,600 MW for a large unit." },
  condenser: { label: "Condenser", description: "Exhaust steam is cooled back to water over thousands of tubes carrying cooling water, creating the vacuum that pulls steam through the turbine." },
  feedpump: { label: "Feedwater pump", description: "Pumps the condensed water back to the steam supply at high pressure, closing the steam cycle." },
  cooling: { label: "Cooling tower", description: "Rejects waste heat to the atmosphere. The plume is water vapour — cooling water never touches the reactor coolant." },
  containment: { label: "Containment building", description: "A steel-lined, reinforced-concrete structure around the reactor systems, designed to hold in radioactive material even in severe accidents." },
};
