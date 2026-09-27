import { useId } from "react";

// Price sparkline for {price} history series. Draws nothing when there is no
// real history — the terminal never shows a synthetic chart.
export default function Sparkline({ history, width = 84, height = 24, bars, fill = true, tone }) {
  const gradientId = `npt-spk-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const series = (Array.isArray(history) ? history : [])
    .slice(bars ? -(bars + 1) : 0)
    .map((point) => Number(point?.price))
    .filter((value) => Number.isFinite(value));

  if (series.length < 2) {
    return <span className="npt-subtle npt-num" style={{ display: "inline-block", width, textAlign: "center", fontSize: 10 }} aria-hidden="true">—</span>;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const pad = 1.5;
  const step = (width - pad * 2) / (series.length - 1);
  const points = series.map((value, i) => [pad + i * step, pad + (height - pad * 2) * (1 - (value - min) / range)]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = series[series.length - 1] >= series[0];
  const stroke = tone || (up ? "var(--np-terminal-green)" : "var(--np-terminal-red)");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }} aria-hidden="true">
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${points.at(-1)[0].toFixed(1)} ${height} L${pad} ${height} Z`} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
