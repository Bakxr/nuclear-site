import { LineChart, Line, ResponsiveContainer } from "recharts";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { SectionHeader } from "./shared.jsx";

export default function StocksSection({
  sectionRef,
  stocks,
  stocksLoading,
  stocksError,
  setStocksError,
  setStocksRetry,
  setSelectedStock,
}) {
  return (
    <ErrorBoundary section="Stocks" dark={true}>
      <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x) 40px", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
          <SectionHeader
            dark
            index="04"
            label="Markets"
            meta="Finnhub · 5-minute refresh"
            title={<>Nuclear stocks, <em>live.</em></>}
            lede="Reactor builders, fuel suppliers, and uranium miners — click any card for detailed charts, metrics, and company context."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
            {stocksLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  background: "rgba(245,240,232,0.035)", border: "1px solid rgba(245,240,232,0.06)",
                  borderRadius: 14, padding: "20px 22px", height: 140,
                  animation: "pulse 1.5s ease-in-out infinite"
                }} />
              ))
            ) : stocksError ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 40px" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>⚠</div>
                <p style={{ color: "rgba(245,240,232,0.5)", fontSize: 15, marginBottom: 24 }}>
                  Market data couldn't load. Check your connection and try again.
                </p>
                <button onClick={() => { setStocksError(false); setStocksRetry(r => r + 1); }}
                  style={{
                    background: "none", border: "1px solid #d4a54a", color: "#d4a54a",
                    padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#d4a54a"; e.currentTarget.style.color = "#14120e"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#d4a54a"; }}>
                  Retry
                </button>
              </div>
            ) : (
              stocks.map((s, i) => {
                const mini = s.history?.slice(-14) || [];
                return (
                  <div key={i} onClick={() => setSelectedStock(s)} style={{
                    background: "rgba(245,240,232,0.035)", border: "1px solid rgba(245,240,232,0.06)",
                    borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "all 0.25s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,240,232,0.07)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.3)"; e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 48px rgba(0,0,0,0.28)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,240,232,0.035)"; e.currentTarget.style.borderColor = "rgba(245,240,232,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: "#d4a54a" }}>{s.ticker}</div>
                        <div style={{ fontSize: 11, color: "rgba(245,240,232,0.35)", marginTop: 2 }}>{s.name}</div>
                      </div>
                      <div style={{
                        background: s.change >= 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                        color: s.change >= 0 ? "#4ade80" : "#f87171", padding: "3px 8px", borderRadius: 16,
                        fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono',monospace",
                      }}>{s.change >= 0 ? "+" : ""}{s.pct.toFixed(2)}%</div>
                    </div>
                    {/* Mini sparkline */}
                    <div style={{ height: 40, margin: "12px 0 4px" }}>
                      <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={mini}>
                          <Line type="monotone" dataKey="price" stroke={s.change >= 0 ? "#4ade80" : "#f87171"} strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--np-font-display)", fontSize: 26, fontWeight: 700 }}>${s.price.toFixed(2)}</span>
                      <span style={{ fontSize: 10, color: "rgba(245,240,232,0.3)", fontFamily: "'DM Mono',monospace" }}>{s.sector}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p style={{ fontSize: 10, color: "rgba(245,240,232,0.2)", marginTop: 24, textAlign: "center" }}>Data is illustrative. Not financial advice. Always do your own research.</p>
        </div>
      </section>
    </ErrorBoundary>
  );
}
