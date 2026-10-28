import { useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useDialog from "../hooks/useDialog.js";

export default function StockModal({ stock, onClose }) {
  const dialogRef = useDialog(!!stock, onClose);
  const [timeRange, setTimeRange] = useState("3M");

  if (!stock) return null;

  const data = stock.history || [];
  // Daily trading bars: ~5 per week, ~21 per month.
  const TRADING_DAYS = { "1W": 5, "1M": 21, "3M": 63 };
  const rangeData = TRADING_DAYS[timeRange] ? data.slice(-(TRADING_DAYS[timeRange] + 1)) : data;
  const startP = rangeData[0]?.price || 0;
  const endP = rangeData[rangeData.length - 1]?.price || 0;
  const minP = rangeData.length ? Math.min(...rangeData.map(d => d.price)) : 0;
  const maxP = rangeData.length ? Math.max(...rangeData.map(d => d.price)) : 0;
  const rangePct = startP ? ((endP - startP) / startP * 100).toFixed(2) : "0.00";
  const isUp = endP >= startP;

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(14,12,10,0.7)", backdropFilter: "blur(12px)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          background: "var(--np-bg)", borderRadius: "var(--np-r-md)", borderTop: "3px double var(--np-rule)", padding: "36px 40px", maxWidth: 640, width: "100%",
          color: "var(--np-text)", border: "1px solid rgba(var(--np-accent-rgb), 0.15)", position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <button aria-label="Close stock details" onClick={onClose} style={{
          position: "absolute", top: 16, right: 20, background: "none", border: "none",
          color: "var(--np-text-muted)", fontSize: 28, cursor: "pointer", lineHeight: 1,
        }}>×</button>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, paddingRight: 36 }}>
          <div>
            <div style={{ fontFamily: "var(--np-font-mono)", fontSize: 12, color: "var(--np-accent-ink)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{stock.sector}</div>
            <div id="stock-modal-title" style={{ fontFamily: "var(--np-font-mono)", fontSize: 28, fontWeight: 700, color: "var(--np-text)" }}>{stock.ticker}</div>
            <div style={{ fontSize: 14, color: "var(--np-text-muted)", marginTop: 2 }}>{stock.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--np-font-display)", fontSize: 36, fontWeight: 500 }}>${stock.price.toFixed(2)}</div>
            <div style={{ color: stock.change >= 0 ? "var(--np-up)" : "var(--np-down)", fontSize: 14, fontFamily: "var(--np-font-mono)", marginTop: 2 }}>
              {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)} ({stock.change >= 0 ? "+" : ""}{stock.pct.toFixed(2)}%) today
            </div>
          </div>
        </div>

        {/* Time range buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["1W", "1M", "3M", "6M"].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              background: timeRange === r ? "rgba(var(--np-accent-rgb), 0.2)" : "var(--np-surface-dim)",
              border: `1px solid ${timeRange === r ? "rgba(var(--np-accent-rgb), 0.4)" : "var(--np-border)"}`,
              borderRadius: 8, padding: "6px 16px", color: timeRange === r ? "var(--np-accent)" : "var(--np-text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--np-font-mono)",
            }}>{r}</button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 13, color: isUp ? "var(--np-up)" : "var(--np-down)", fontFamily: "var(--np-font-mono)", alignSelf: "center" }}>
            {isUp ? "+" : ""}{rangePct}% ({timeRange})
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 200, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rangeData}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? "var(--np-up)" : "var(--np-down)"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isUp ? "var(--np-up)" : "var(--np-down)"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--np-text-faint)" }} axisLine={false} tickLine={false} interval={Math.floor(rangeData.length / 5)} />
              <YAxis domain={[minP * 0.98, maxP * 1.02]} tick={{ fontSize: 10, fill: "var(--np-text-faint)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "var(--np-surface)", border: "1px solid rgba(var(--np-accent-rgb), 0.3)", borderRadius: 8, fontSize: 12, color: "var(--np-text)" }}
                       formatter={(v) => [`$${v.toFixed(2)}`, "Price"]} labelStyle={{ color: "var(--np-accent)" }} />
              <Area type="monotone" dataKey="price" stroke={isUp ? "var(--np-up)" : "var(--np-down)"} strokeWidth={2} fill="url(#stockGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          {/* Only facts we actually have: no blank tiles. */}
          {[
            { label: "Market cap", val: stock.mktCap },
            { label: "P/E ratio", val: stock.pe },
            { label: "Sector", val: stock.sector },
          ].filter((item) => item.val !== undefined && item.val !== null && item.val !== "").map((item, i) => (
            <div key={i} style={{ background: "var(--np-surface-dim)", borderRadius: "var(--np-r-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--np-text-faint)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.val}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--np-text-muted)", margin: 0 }}>{stock.desc}</p>
        <p style={{ fontSize: 10, color: "var(--np-text-faint)", marginTop: 16 }}>Prices via Finnhub; daily history via Yahoo Finance. For information only — not investment advice.</p>
      </motion.div>
    </motion.div>
  );
}
