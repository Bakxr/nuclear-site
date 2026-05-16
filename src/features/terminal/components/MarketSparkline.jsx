// Tiny inline sparkline for the markets list — pure SVG, no recharts overhead.
// Renders a single-stroke path of `history[].p` (Polymarket Yes-price series),
// colored green/red based on net direction.

function buildPath(points, width, height, pad) {
  if (!points.length) return "";
  const w = width - pad * 2;
  const h = height - pad * 2;
  if (points.length === 1) {
    const y = pad + h * (1 - points[0]);
    return `M ${pad} ${y} L ${pad + w} ${y}`;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  // Avoid a flat-line collapse — give it a tiny vertical band.
  if (max - min < 0.002) {
    const mid = (max + min) / 2;
    min = Math.max(0, mid - 0.01);
    max = Math.min(1, mid + 0.01);
  }
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const segs = points.map((p, i) => {
    const x = pad + stepX * i;
    const y = pad + h * (1 - (p - min) / range);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return segs.join(" ");
}

export default function MarketSparkline({
  history,
  width = 72,
  height = 22,
  stroke,
  pad = 2,
  fill = false,
  ariaLabel = "Yes-price sparkline",
}) {
  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div
        aria-hidden
        style={{
          width,
          height,
          display: "grid",
          placeItems: "center",
          fontSize: 9,
          color: "rgba(237,241,245,0.35)",
          fontFamily: "'DM Mono',monospace",
        }}
      >
        —
      </div>
    );
  }
  const points = history
    .map((row) => Number(row?.p))
    .filter((v) => Number.isFinite(v));
  if (points.length === 0) return null;
  const direction = points[points.length - 1] - points[0];
  const tone = stroke || (direction > 0 ? "#4caf72" : direction < 0 ? "#e25960" : "#7da8c0");
  const id = `spk-${Math.random().toString(36).slice(2, 8)}`;
  const path = buildPath(points, width, height, pad);
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.35" />
              <stop offset="100%" stopColor={tone} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`}
            fill={`url(#${id})`}
            stroke="none"
          />
        </>
      ) : null}
      <path d={path} fill="none" stroke={tone} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
