import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function StockModal({ stock, onClose }) {
  const [timeRange, setTimeRange] = useState("3M");

  // Lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!stock) return null;

  const data = stock.history || [];
  const rangeData = timeRange === "1M" ? data.slice(-30) : timeRange === "1W" ? data.slice(-7) : data;
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
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          background: "var(--np-dark-bg)", borderRadius: 20, padding: "36px 40px", maxWidth: 640, width: "100%",
          color: "var(--np-dark-text)", border: "1px solid rgba(212,165,74,0.15)", position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 20, background: "none", border: "none",
          color: "var(--np-dark-text-muted)", fontSize: 28, cursor: "pointer", lineHeight: 1,
        }}>×</button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#d4a54a", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>{stock.sector}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 700, color: "#d4a54a" }}>{stock.ticker}</div>
            <div style={{ fontSize: 14, color: "rgba(245,240,232,0.5)", marginTop: 2 }}>{stock.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700 }}>${stock.price.toFixed(2)}</div>
            <div style={{ color: stock.change >= 0 ? "#4ade80" : "#f87171", fontSize: 14, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
              {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)} ({stock.change >= 0 ? "+" : ""}{stock.pct.toFixed(2)}%) today
            </div>
          </div>
        </div>

        {/* Time range buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["1W", "1M", "3M"].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              background: timeRange === r ? "rgba(212,165,74,0.2)" : "rgba(245,240,232,0.05)",
              border: `1px solid ${timeRange === r ? "rgba(212,165,74,0.4)" : "rgba(245,240,232,0.08)"}`,
              borderRadius: 8, padding: "6px 16px", color: timeRange === r ? "#d4a54a" : "rgba(245,240,232,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono',monospace",
            }}>{r}</button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 13, color: isUp ? "#4ade80" : "#f87171", fontFamily: "'DM Mono',monospace", alignSelf: "center" }}>
            {isUp ? "+" : ""}{rangePct}% ({timeRange})
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 200, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rangeData}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(245,240,232,0.3)" }} axisLine={false} tickLine={false} interval={Math.floor(rangeData.length / 5)} />
              <YAxis domain={[minP * 0.98, maxP * 1.02]} tick={{ fontSize: 10, fill: "rgba(245,240,232,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "#2a241c", border: "1px solid rgba(212,165,74,0.3)", borderRadius: 8, fontSize: 12, color: "#f5f0e8" }}
                       formatter={(v) => [`$${v.toFixed(2)}`, "Price"]} labelStyle={{ color: "#d4a54a" }} />
              <Area type="monotone" dataKey="price" stroke={isUp ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#stockGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Market Cap", val: stock.mktCap },
            { label: "P/E Ratio", val: stock.pe },
            { label: "Sector", val: stock.sector },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(245,240,232,0.04)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.4)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.val}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,240,232,0.6)", margin: 0 }}>{stock.desc}</p>
        <p style={{ fontSize: 10, color: "rgba(245,240,232,0.2)", marginTop: 16 }}>Data is illustrative only. Not financial advice.</p>
      </motion.div>
    </motion.div>
  );
}
