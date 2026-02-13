export default function BWRDiagram({ width = 680, accent = "#c4935a" }) {
  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="Boiling Water Reactor diagram">
      <defs>
        <linearGradient id="bwr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <marker id="barr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>
      <rect width="680" height="280" fill="url(#bwr-sky)" rx="8" />

      {/* Containment */}
      <path d="M60,60 Q60,10 165,8 Q270,10 270,60" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" />
      <rect x="60" y="60" width="210" height="150" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="2" />
      <text x="165" y="222" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text-muted)" fontWeight="600">CONTAINMENT</text>

      {/* Reactor Vessel — taller, single loop */}
      <rect x="105" y="75" width="80" height="115" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="6" />
      {/* Fuel rods */}
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={112 + i * 11} y="90" width="7" height="45" fill={accent} opacity="0.65" rx="1" />
      ))}
      {/* Steam bubbles */}
      <circle cx="120" cy="78" r="3" fill="white" opacity="0.7" />
      <circle cx="135" cy="75" r="2.5" fill="white" opacity="0.6" />
      <circle cx="150" cy="77" r="3" fill="white" opacity="0.7" />
      <circle cx="165" cy="74" r="2" fill="white" opacity="0.5" />
      <circle cx="178" cy="78" r="3" fill="white" opacity="0.6" />
      <text x="145" y="205" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">REACTOR</text>
      <text x="145" y="215" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">VESSEL</text>

      {/* Suppression pool */}
      <rect x="65" y="170" width="200" height="30" fill="#7ab8d4" opacity="0.5" stroke="#4a8eaa" strokeWidth="1.5" rx="3" />
      <text x="165" y="190" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="#1e5a7a" fontWeight="600">SUPPRESSION POOL</text>

      {/* Steam directly to turbine (single loop) */}
      <line x1="145" y1="75" x2="145" y2="50" stroke="#e0e8d0" strokeWidth="4" />
      <line x1="145" y1="50" x2="330" y2="50" stroke="#e0e8d0" strokeWidth="4" />
      <line x1="330" y1="50" x2="330" y2="88" stroke="#e0e8d0" strokeWidth="4" markerEnd="url(#barr)" />
      <text x="237" y="44" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">steam (direct)</text>

      {/* Turbine */}
      <polygon points="330,88 395,75 395,128 330,115" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="362" y="106" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">TURBINE</text>
      <text x="362" y="145" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">HP / LP</text>

      {/* Generator */}
      <rect x="398" y="83" width="55" height="40" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="425" y="107" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="700">GEN</text>
      <line x1="395" y1="103" x2="398" y2="103" stroke="var(--np-text)" strokeWidth="2" />
      <line x1="453" y1="103" x2="480" y2="103" stroke="var(--np-text)" strokeWidth="2" />
      <text x="495" y="107" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">⚡ GRID</text>

      {/* Condenser */}
      <rect x="330" y="175" width="125" height="50" fill="#b8d8e8" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={344 + i * 21} y1="175" x2={344 + i * 21} y2="225" stroke="#7ab8d4" strokeWidth="1.5" opacity="0.7" />
      ))}
      <text x="392" y="205" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">CONDENSER</text>

      {/* Exhaust steam to condenser */}
      <line x1="395" y1="128" x2="430" y2="128" stroke="#e0e8d0" strokeWidth="3" />
      <line x1="430" y1="128" x2="430" y2="175" stroke="#e0e8d0" strokeWidth="3" markerEnd="url(#barr)" />

      {/* Condensate back to reactor */}
      <line x1="330" y1="200" x2="290" y2="200" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="290" y1="200" x2="290" y2="145" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="290" y1="145" x2="185" y2="145" stroke="#7ab8d4" strokeWidth="3" markerEnd="url(#barr)" />

      {/* Cooling tower */}
      <path d="M575,240 Q580,180 600,170 Q620,180 625,240 Z" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <ellipse cx="600" cy="240" rx="25" ry="5" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" />
      <path d="M590,170 Q600,152 610,170" fill="none" stroke="#c8e0e8" strokeWidth="2" opacity="0.7" />
      <text x="600" y="260" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">COOLING TOWER</text>
      <line x1="455" y1="225" x2="575" y2="225" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />

    </svg>
  );
}
