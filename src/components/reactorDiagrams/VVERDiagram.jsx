export default function VVERDiagram({ width = 680, accent = "#6b8e5a" }) {
  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="VVER Reactor diagram">
      <defs>
        <linearGradient id="vver-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <marker id="varr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>
      <rect width="680" height="280" fill="url(#vver-sky)" rx="8" />

      {/* Double containment */}
      <rect x="48" y="42" width="224" height="175" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1" rx="6" strokeDasharray="5,3" />
      <path d="M55,55 Q55,14 165,12 Q275,14 275,55" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" />
      <rect x="55" y="55" width="220" height="155" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="2" />
      <text x="165" y="222" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text-muted)" fontWeight="600">DOUBLE CONTAINMENT</text>

      {/* Reactor Vessel */}
      <rect x="120" y="78" width="65" height="105" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="6" />
      {/* Hexagonal fuel assemblies */}
      {[
        [139,92],[152,92],[165,92],
        [132,105],[145,105],[158,105],[171,105],
        [139,118],[152,118],[165,118],
      ].map(([cx,cy], i) => (
        <polygon key={i} points={hexPoints(cx, cy, 5)} fill={accent} opacity="0.55" stroke={accent} strokeWidth="0.5" />
      ))}
      <text x="152" y="198" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">REACTOR</text>
      <text x="152" y="208" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">(hex fuel)</text>

      {/* Pressurizer */}
      <rect x="200" y="82" width="28" height="48" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" rx="5" />
      <ellipse cx="214" cy="82" rx="14" ry="5" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="214" y="145" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">PRESS.</text>

      {/* Horizontal Steam Generators (signature VVER feature) */}
      <ellipse cx="85" cy="118" rx="22" ry="12" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <line x1="63" y1="118" x2="107" y2="118" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <line x1="63" y1="112" x2="107" y2="112" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <line x1="63" y1="124" x2="107" y2="124" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <text x="85" y="145" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">HORIZ. S.G.</text>

      {/* Primary loop pipes */}
      <path d="M120,100 Q108,100 107,112" fill="none" stroke={accent} strokeWidth="3" opacity="0.8" markerEnd="url(#varr)" />
      <path d="M85,130 Q95,155 120,155" fill="none" stroke={accent} strokeWidth="3" opacity="0.8" markerEnd="url(#varr)" />

      {/* Steam line */}
      <line x1="85" y1="106" x2="85" y2="55" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="85" y1="55" x2="340" y2="55" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="340" y1="55" x2="340" y2="90" stroke="#e0d8c8" strokeWidth="3" markerEnd="url(#varr)" />
      <text x="212" y="50" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">steam</text>

      {/* Turbine */}
      <polygon points="340,90 400,78 400,128 340,115" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="370" y="108" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">TURBINE</text>

      {/* Generator */}
      <rect x="403" y="85" width="55" height="40" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="430" y="109" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="700">GEN</text>
      <line x1="400" y1="105" x2="403" y2="105" stroke="var(--np-text)" strokeWidth="2" />
      <line x1="458" y1="105" x2="485" y2="105" stroke="var(--np-text)" strokeWidth="2" />
      <text x="500" y="109" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">⚡ GRID</text>

      {/* Condenser */}
      <rect x="340" y="175" width="125" height="50" fill="#b8d8e8" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="402" y="205" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">CONDENSER</text>

      <line x1="400" y1="128" x2="425" y2="128" stroke="#e0e8d0" strokeWidth="3" />
      <line x1="425" y1="128" x2="425" y2="175" stroke="#e0e8d0" strokeWidth="3" />

      {/* Condensate return */}
      <line x1="340" y1="200" x2="295" y2="200" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="295" y1="200" x2="295" y2="128" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="295" y1="128" x2="107" y2="128" stroke="#7ab8d4" strokeWidth="3" markerEnd="url(#varr)" />

      {/* Cooling tower */}
      <path d="M575,240 Q580,180 600,170 Q620,180 625,240 Z" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <ellipse cx="600" cy="240" rx="25" ry="5" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" />
      <path d="M590,170 Q600,152 610,170" fill="none" stroke="#c8e0e8" strokeWidth="2" opacity="0.7" />
      <text x="600" y="260" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">COOLING TOWER</text>
      <line x1="465" y1="225" x2="575" y2="225" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />

    </svg>
  );
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}
