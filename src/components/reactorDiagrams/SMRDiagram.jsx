export default function SMRDiagram({ width = 680, accent = "#5a7d8b" }) {
  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="Small Modular Reactor diagram">
      <defs>
        <linearGradient id="smr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <linearGradient id="smr-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8bfa8" />
          <stop offset="100%" stopColor="#b0a890" />
        </linearGradient>
        <marker id="sarr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>
      <rect width="680" height="280" fill="url(#smr-sky)" rx="8" />

      {/* Ground level */}
      <rect x="0" y="120" width="300" height="160" fill="url(#smr-ground)" />
      <line x1="0" y1="120" x2="300" y2="120" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="15" y="115" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">GRADE LEVEL</text>

      {/* Below-grade containment */}
      <rect x="70" y="130" width="160" height="130" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="6" />
      <text x="150" y="270" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">BELOW-GRADE CONTAINMENT</text>

      {/* Integrated reactor vessel (tall, narrow — everything inside) */}
      <rect x="110" y="138" width="80" height="112" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="8" />
      <ellipse cx="150" cy="138" rx="40" ry="8" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="2" />

      {/* Internal steam generator (top section) */}
      <rect x="118" y="145" width="64" height="28" fill="#b8d0d8" stroke={accent} strokeWidth="1" rx="3" opacity="0.7" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={122 + i * 12} y1="148" x2={122 + i * 12} y2="170" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      ))}
      <text x="150" y="163" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#1e5a7a" fontWeight="600">INT. S.G.</text>

      {/* Internal pressurizer space */}
      <rect x="130" y="177" width="40" height="16" fill="var(--np-containment-bg)" stroke={accent} strokeWidth="1" rx="2" opacity="0.6" />
      <text x="150" y="189" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="6" fill="var(--np-text-muted)">PRESS.</text>

      {/* Fuel rods (bottom) */}
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={119 + i * 10} y="198" width="7" height="42" fill={accent} opacity="0.55" rx="1" />
      ))}
      <text x="150" y="252" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)" fontWeight="600">FUEL CORE</text>

      {/* Internal circulation arrows */}
      <path d="M182,200 Q196,180 182,160" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" markerEnd="url(#sarr)" />
      <path d="M118,160 Q104,180 118,200" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" markerEnd="url(#sarr)" />
      <text x="200" y="180" fontFamily="DM Sans,sans-serif" fontSize="6" fill={accent}>natural</text>
      <text x="200" y="188" fontFamily="DM Sans,sans-serif" fontSize="6" fill={accent}>circulation</text>

      {/* Steam line to surface */}
      <line x1="150" y1="138" x2="150" y2="120" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="150" y1="120" x2="150" y2="80" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="150" y1="80" x2="350" y2="80" stroke="#e0d8c8" strokeWidth="3" markerEnd="url(#sarr)" />
      <text x="250" y="75" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">steam</text>

      {/* Turbine building (above ground, right side) */}
      <rect x="340" y="60" width="200" height="100" fill="#f0ebe0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="440" y="55" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">TURBINE BUILDING</text>

      {/* Turbine */}
      <polygon points="350,85 400,75 400,115 350,108" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="375" y="100" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text)" fontWeight="600">TURB.</text>

      {/* Generator */}
      <rect x="405" y="80" width="48" height="35" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="429" y="101" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="700">GEN</text>
      <line x1="453" y1="97" x2="478" y2="97" stroke="var(--np-text)" strokeWidth="2" />
      <text x="510" y="101" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">⚡ GRID</text>

      {/* Condenser */}
      <rect x="355" y="125" width="95" height="30" fill="#b8d8e8" stroke="var(--np-text)" strokeWidth="1.5" rx="3" />
      <text x="402" y="144" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text)" fontWeight="600">CONDENSER</text>

      {/* Condensate return */}
      <line x1="400" y1="115" x2="430" y2="115" stroke="#e0e8d0" strokeWidth="2" />
      <line x1="430" y1="115" x2="430" y2="125" stroke="#e0e8d0" strokeWidth="2" />
      <line x1="355" y1="140" x2="310" y2="140" stroke="#7ab8d4" strokeWidth="2" />
      <line x1="310" y1="140" x2="310" y2="120" stroke="#7ab8d4" strokeWidth="2" />
      <line x1="310" y1="120" x2="170" y2="120" stroke="#7ab8d4" strokeWidth="2" />
      <line x1="170" y1="120" x2="170" y2="138" stroke="#7ab8d4" strokeWidth="2" markerEnd="url(#sarr)" />

      {/* Passive cooling (air + water tank above containment) */}
      <rect x="60" y="96" width="30" height="24" fill="#b8d8e8" stroke="#4a8eaa" strokeWidth="1" rx="3" opacity="0.7" />
      <text x="75" y="111" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="6" fill="#1e5a7a">PASSIVE</text>
      <text x="75" y="118" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="6" fill="#1e5a7a">COOLING</text>

      {/* Module badge */}
      <rect x="456" y="130" width="75" height="22" fill="rgba(90,125,139,0.15)" stroke={accent} strokeWidth="1" rx="3" />
      <text x="493" y="144" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill={accent} fontWeight="600">MODULAR</text>

      {/* Cooling water */}
      <rect x="460" y="175" width="100" height="30" fill="#7ab8d4" opacity="0.25" stroke="#4a8eaa" strokeWidth="1" rx="3" />
      <text x="510" y="194" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="#1e5a7a">COOLING WATER</text>
      <line x1="450" y1="145" x2="475" y2="145" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />
      <line x1="475" y1="145" x2="475" y2="175" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />

    </svg>
  );
}
