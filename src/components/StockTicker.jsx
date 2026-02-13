export default function StockTicker({ stocks, onClickStock }) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <div style={{
      overflow: "hidden", background: "rgba(20,18,14,0.97)", padding: "10px 0",
      borderBottom: "1px solid rgba(212,165,74,0.1)",
    }}>
      <div style={{
        display: "flex", gap: 44, animation: "tickerScroll 40s linear infinite",
        whiteSpace: "nowrap", width: "max-content",
      }}>
        {[...stocks, ...stocks].map((s, i) => (
          <span key={i} onClick={() => onClickStock(s)} style={{
            fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: "#f5f0e8", cursor: "pointer",
            transition: "opacity 0.2s", letterSpacing: "0.02em",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontWeight: 700, color: "#d4a54a" }}>{s.ticker}</span>
            {" "}
            <span style={{ opacity: 0.5 }}>${s.price.toFixed(2)}</span>
            {" "}
            <span style={{ color: s.change >= 0 ? "#4ade80" : "#f87171" }}>
              {s.change >= 0 ? "▲" : "▼"}{Math.abs(s.pct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
