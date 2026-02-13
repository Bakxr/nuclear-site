export default function PHWRDiagram({ width = 680, accent = "#8b7355" }) {
  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="Pressurized Heavy Water Reactor diagram">
      <defs>
        <linearGradient id="phwr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <marker id="parr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>
      <rect width="680" height="280" fill="url(#phwr-sky)" rx="8" />

      {/* Containment */}
      <path d="M50,55 Q50,10 170,8 Q290,10 290,55" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" />
      <rect x="50" y="55" width="240" height="155" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="2" />
      <text x="170" y="225" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text-muted)" fontWeight="600">CONTAINMENT</text>

      {/* Calandria (horizontal cylindrical vessel) */}
      <ellipse cx="120" cy="130" rx="12" ry="55" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <rect x="120" y="75" width="120" height="110" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <ellipse cx="240" cy="130" rx="12" ry="55" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />

      {/* Pressure tubes (horizontal fuel channels) */}
      {[0,1,2,3,4,5,6].map(i => (
        <g key={i}>
          <line x1="120" y1={87 + i * 14} x2="240" y2={87 + i * 14} stroke={accent} strokeWidth="4" opacity="0.6" />
          <circle cx={140 + (i % 3) * 25} cy={87 + i * 14} r="3" fill={accent} opacity="0.9" />
        </g>
      ))}

      <text x="180" y="200" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">CALANDRIA</text>
      <text x="180" y="210" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">(heavy water moderator)</text>

      {/* Fueling machine (right side) */}
      <rect x="250" y="118" width="30" height="24" fill="#c0b8a4" stroke="var(--np-text)" strokeWidth="1.5" rx="3" />
      <text x="265" y="134" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">FUEL</text>
      <text x="265" y="143" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="6" fill="var(--np-text-muted)">MACHINE</text>
      {/* Arrow showing online refueling */}
      <line x1="253" y1="130" x2="245" y2="130" stroke={accent} strokeWidth="2" markerEnd="url(#parr)" />

      {/* Steam Generator */}
      <rect x="70" y="72" width="28" height="80" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1="74" y1={80 + i * 12} x2="94" y2={80 + i * 12} stroke={accent} strokeWidth="1.5" opacity="0.5" />
      ))}
      <text x="84" y="165" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">S.G.</text>

      {/* Primary loop: calandria → SG → calandria */}
      <path d="M120,100 Q100,100 98,95" fill="none" stroke={accent} strokeWidth="3" opacity="0.8" />
      <path d="M84,152 Q100,160 120,155" fill="none" stroke={accent} strokeWidth="3" opacity="0.8" markerEnd="url(#parr)" />

      {/* Steam line to turbine */}
      <line x1="84" y1="72" x2="84" y2="55" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="84" y1="55" x2="350" y2="55" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="350" y1="55" x2="350" y2="90" stroke="#e0d8c8" strokeWidth="3" markerEnd="url(#parr)" />
      <text x="217" y="50" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">steam</text>

      {/* Turbine */}
      <polygon points="350,90 415,78 415,128 350,115" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="382" y="108" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">TURBINE</text>

      {/* Generator */}
      <rect x="418" y="85" width="55" height="40" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="445" y="109" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="700">GEN</text>
      <line x1="415" y1="105" x2="418" y2="105" stroke="var(--np-text)" strokeWidth="2" />
      <line x1="473" y1="105" x2="500" y2="105" stroke="var(--np-text)" strokeWidth="2" />
      <text x="515" y="109" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">⚡ GRID</text>

      {/* Condenser */}
      <rect x="350" y="175" width="125" height="50" fill="#b8d8e8" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="412" y="205" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">CONDENSER</text>

      {/* Exhaust to condenser */}
      <line x1="415" y1="128" x2="440" y2="128" stroke="#e0e8d0" strokeWidth="3" />
      <line x1="440" y1="128" x2="440" y2="175" stroke="#e0e8d0" strokeWidth="3" />

      {/* Condensate return */}
      <line x1="350" y1="200" x2="305" y2="200" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="305" y1="200" x2="305" y2="150" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="305" y1="150" x2="98" y2="150" stroke="#7ab8d4" strokeWidth="3" markerEnd="url(#parr)" />

      {/* Cooling tower */}
      <path d="M585,240 Q590,180 610,170 Q630,180 635,240 Z" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <ellipse cx="610" cy="240" rx="25" ry="5" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" />
      <path d="M600,170 Q610,152 620,170" fill="none" stroke="#c8e0e8" strokeWidth="2" opacity="0.7" />
      <text x="610" y="260" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">COOLING TOWER</text>
      <line x1="475" y1="225" x2="585" y2="225" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />

    </svg>
  );
}
