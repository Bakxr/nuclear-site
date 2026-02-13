export default function PWRDiagram({ width = 680, accent = "#d4a54a" }) {
  const s = width / 680;
  const sc = (v) => Math.round(v * s);

  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="Pressurized Water Reactor diagram">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ab8d4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#4a8eaa" stopOpacity="0.9" />
        </linearGradient>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>

      <rect width="680" height="280" fill="url(#sky)" rx="8" />

      {/* === CONTAINMENT DOME === */}
      <ellipse cx="170" cy="55" rx="100" ry="18" fill="none" stroke="var(--np-text)" strokeWidth="2" opacity="0.3" />
      <path d="M70,55 Q70,10 170,8 Q270,10 270,55" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" />
      <rect x="70" y="55" width="200" height="155" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="2" rx="2" />
      <text x="170" y="225" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text-muted)" fontWeight="600">CONTAINMENT</text>

      {/* === REACTOR VESSEL === */}
      <rect x="115" y="80" width="60" height="100" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <rect x="120" y="85" width="50" height="25" fill={accent} opacity="0.35" rx="2" />
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={122 + i * 9} y={86} width="6" height="22" fill={accent} opacity="0.7" rx="1" />
      ))}
      <text x="145" y="200" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)" fontWeight="600">REACTOR</text>
      <text x="145" y="210" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">VESSEL</text>

      {/* === PRESSURIZER === */}
      <rect x="215" y="82" width="32" height="55" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" rx="6" />
      <ellipse cx="231" cy="82" rx="16" ry="6" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="231" y="153" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">PRESS.</text>

      {/* Primary loop pipes */}
      <path d="M175,105 Q210,105 215,110" fill="none" stroke={accent} strokeWidth="5" opacity="0.8" markerEnd="url(#arr)" />
      <path d="M247,130 Q260,155 245,175 Q215,190 175,180" fill="none" stroke={accent} strokeWidth="5" opacity="0.8" />

      {/* === STEAM GENERATOR === */}
      <rect x="95" y="82" width="20" height="80" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" rx="3" />
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1="99" y1={90 + i * 10} x2="111" y2={90 + i * 10} stroke={accent} strokeWidth="1.5" opacity="0.6" />
      ))}
      <text x="105" y="176" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">S.G.</text>

      {/* Primary return */}
      <path d="M115,155 Q100,165 95,155" fill="none" stroke={accent} strokeWidth="5" opacity="0.8" />

      {/* === TURBINE === */}
      <polygon points="340,100 400,85 400,135 340,120" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="370" y="118" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">HP</text>
      <polygon points="405,88 460,78 460,145 405,132" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" />
      <text x="432" y="115" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">LP</text>
      <text x="400" y="160" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">TURBINE</text>

      {/* Steam line from SG to turbine */}
      <line x1="105" y1="82" x2="105" y2="60" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="105" y1="60" x2="340" y2="60" stroke="#e0d8c8" strokeWidth="3" />
      <line x1="340" y1="60" x2="340" y2="100" stroke="#e0d8c8" strokeWidth="3" markerEnd="url(#arr)" />
      <text x="222" y="56" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">steam</text>

      {/* === GENERATOR === */}
      <rect x="462" y="90" width="55" height="42" fill="#bbb3a0" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      <text x="489" y="115" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="700">GEN</text>
      <line x1="460" y1="111" x2="462" y2="111" stroke="var(--np-text)" strokeWidth="2" />
      {/* Power output */}
      <line x1="517" y1="111" x2="545" y2="111" stroke="var(--np-text)" strokeWidth="2" />
      <text x="560" y="115" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">⚡ GRID</text>

      {/* === CONDENSER === */}
      <rect x="340" y="185" width="125" height="50" fill="#b8d8e8" stroke="var(--np-text)" strokeWidth="1.5" rx="4" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={352 + i * 21} y1="185" x2={352 + i * 21} y2="235" stroke="#7ab8d4" strokeWidth="1.5" opacity="0.7" />
      ))}
      <text x="402" y="214" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" fill="var(--np-text)" fontWeight="600">CONDENSER</text>

      {/* Condensate return */}
      <line x1="460" y1="132" x2="460" y2="185" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="460" y1="185" x2="465" y2="185" stroke="#7ab8d4" strokeWidth="3" markerEnd="url(#arr)" />

      {/* Return to SG */}
      <line x1="340" y1="210" x2="280" y2="210" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="280" y1="210" x2="280" y2="140" stroke="#7ab8d4" strokeWidth="3" />
      <line x1="280" y1="140" x2="115" y2="140" stroke="#7ab8d4" strokeWidth="3" markerEnd="url(#arr)" />

      {/* === COOLING TOWER === */}
      <path d="M585,240 Q590,180 610,170 Q630,180 635,240 Z" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" />
      <ellipse cx="610" cy="240" rx="25" ry="5" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" />
      <path d="M600,170 Q610,155 620,170" fill="none" stroke="#c8e0e8" strokeWidth="2" opacity="0.7" />
      <path d="M598,167 Q610,148 622,167" fill="none" stroke="#c8e0e8" strokeWidth="2" opacity="0.5" />
      <text x="610" y="258" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">COOLING</text>
      <text x="610" y="268" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill="var(--np-text-muted)">TOWER</text>

      {/* Cooling water */}
      <line x1="465" y1="235" x2="585" y2="235" stroke="#7ab8d4" strokeWidth="2" strokeDasharray="4,3" opacity="0.7" />

    </svg>
  );
}
