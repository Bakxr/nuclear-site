export default function OtherDiagram({ width = 680, accent = "#7a6b8b" }) {
  return (
    <svg viewBox="0 0 680 280" width={width} height={Math.round(width * 280 / 680)} style={{ display: "block", maxWidth: "100%", height: "auto" }} aria-label="Advanced reactor designs diagram">
      <defs>
        <linearGradient id="oth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#ede8dc" />
        </linearGradient>
        <marker id="oarr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>
      <rect width="680" height="280" fill="url(#oth-sky)" rx="8" />

      {/* ===== AGR (left panel) ===== */}
      <rect x="20" y="48" width="200" height="195" fill="rgba(122,107,139,0.06)" stroke="var(--np-text)" strokeWidth="1" rx="8" />
      <text x="120" y="68" textAnchor="middle" fontFamily="Playfair Display,serif" fontSize="11" fill="var(--np-text)" fontWeight="600">AGR</text>
      <text x="120" y="80" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Advanced Gas-Cooled</text>

      {/* AGR reactor vessel */}
      <rect x="60" y="90" width="60" height="70" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" rx="5" />
      {/* Graphite moderator blocks */}
      {[0,1,2].map(r => [0,1,2].map(c => (
        <rect key={`${r}${c}`} x={66 + c * 16} y={96 + r * 18} width="12" height="14" fill="#a09080" opacity="0.6" rx="1" />
      )))}
      <text x="90" y="174" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)" fontWeight="600">GRAPHITE MOD.</text>

      {/* CO2 gas coolant loop */}
      <path d="M120,115 Q145,115 155,100 Q165,85 180,90 Q180,130 165,140 Q145,145 120,140" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.7" markerEnd="url(#oarr)" />
      <text x="170" y="120" fontFamily="DM Sans,sans-serif" fontSize="7" fill={accent} fontWeight="600">CO₂</text>

      {/* Steam generator */}
      <rect x="155" y="88" width="20" height="55" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" rx="3" />
      <text x="165" y="155" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">S.G.</text>

      <text x="120" y="200" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Gas-cooled, graphite-moderated</text>
      <text x="120" y="212" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Used in UK (Torness, Heysham)</text>
      <text x="120" y="228" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill={accent} fontWeight="600">600°C outlet temp</text>

      {/* ===== FBR (center panel) ===== */}
      <rect x="240" y="48" width="200" height="195" fill="rgba(122,107,139,0.06)" stroke="var(--np-text)" strokeWidth="1" rx="8" />
      <text x="340" y="68" textAnchor="middle" fontFamily="Playfair Display,serif" fontSize="11" fill="var(--np-text)" fontWeight="600">Fast Breeder (FBR)</text>
      <text x="340" y="80" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Liquid Metal Cooled</text>

      {/* FBR reactor vessel */}
      <rect x="290" y="90" width="60" height="70" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" rx="5" />
      {/* Fuel + blanket zones */}
      <rect x="298" y="96" width="44" height="30" fill="#d4a54a" opacity="0.45" rx="2" />
      <text x="320" y="115" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)" fontWeight="600">FUEL</text>
      <rect x="298" y="130" width="44" height="22" fill="#a09080" opacity="0.4" rx="2" />
      <text x="320" y="145" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">BLANKET</text>

      {/* Sodium coolant loops */}
      <path d="M350,110 Q370,110 380,95 Q390,85 400,90" fill="none" stroke="#e06030" strokeWidth="2.5" opacity="0.7" />
      <path d="M400,140 Q390,150 370,145 Q355,142 350,140" fill="none" stroke="#e06030" strokeWidth="2.5" opacity="0.7" markerEnd="url(#oarr)" />
      <text x="390" y="120" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#e06030" fontWeight="600">Na</text>

      {/* IHX */}
      <rect x="370" y="88" width="16" height="55" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" rx="3" />
      <text x="378" y="155" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">IHX</text>

      <text x="340" y="200" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Breeds more fuel than consumed</text>
      <text x="340" y="212" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">BN-800 (Russia), Monju (Japan)</text>
      <text x="340" y="228" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill={accent} fontWeight="600">Sodium cooled · No moderator</text>

      {/* ===== HTGR (right panel) ===== */}
      <rect x="460" y="48" width="200" height="195" fill="rgba(122,107,139,0.06)" stroke="var(--np-text)" strokeWidth="1" rx="8" />
      <text x="560" y="68" textAnchor="middle" fontFamily="Playfair Display,serif" fontSize="11" fill="var(--np-text)" fontWeight="600">HTGR</text>
      <text x="560" y="80" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">High-Temperature Gas</text>

      {/* HTGR vessel */}
      <rect x="510" y="90" width="60" height="70" fill="var(--np-containment-bg)" stroke="var(--np-text)" strokeWidth="1.5" rx="5" />
      {/* TRISO fuel pebbles */}
      {[
        [525,103],[540,100],[555,103],
        [530,115],[545,112],[560,115],
        [525,127],[540,124],[555,127],
        [530,138],[545,136],[560,138],
      ].map(([cx,cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="#a09080" opacity="0.6" stroke="var(--np-text)" strokeWidth="0.5" />
      ))}
      <text x="540" y="174" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)" fontWeight="600">TRISO PEBBLES</text>

      {/* Helium coolant */}
      <path d="M570,115 Q590,110 600,100 Q610,95 620,100" fill="none" stroke="#60a060" strokeWidth="2.5" opacity="0.7" />
      <path d="M620,140 Q610,150 590,145 Q575,142 570,140" fill="none" stroke="#60a060" strokeWidth="2.5" opacity="0.7" markerEnd="url(#oarr)" />
      <text x="610" y="123" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#60a060" fontWeight="600">He</text>

      <rect x="593" y="98" width="16" height="45" fill="#c8bfa8" stroke="var(--np-text)" strokeWidth="1" rx="3" />
      <text x="601" y="155" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="var(--np-text-muted)">S.G.</text>

      <text x="560" y="200" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">Very high temps for industry</text>
      <text x="560" y="212" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="8" fill="var(--np-text-muted)">HTR-PM (China), X-energy (US)</text>
      <text x="560" y="228" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="9" fill={accent} fontWeight="600">750°C+ · Helium cooled</text>

    </svg>
  );
}
