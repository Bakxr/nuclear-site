import { LineChart, Line, ResponsiveContainer } from "recharts";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { SectionHeader } from "./shared.jsx";

// Sparklines are SVG attributes, which can't read CSS variables everywhere:
// mid-tone greens and reds that read on both themes.
const SPARK_UP = "#2fae63";
const SPARK_DOWN = "#e0524a";

function formatQuotesMeta(loading, lastUpdated) {
  if (loading) return "Finnhub · Updating…";
  if (!lastUpdated) return "Finnhub · 5-minute refresh";
  const mins = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 60000));
  if (mins < 1) return "Finnhub · Updated just now";
  if (mins === 1) return "Finnhub · Updated 1 min ago";
  return `Finnhub · Updated ${mins} min ago`;
}

export default function StocksSection({
  sectionRef,
  stocks,
  stocksLoading,
  stocksLastUpdated,
  stocksError,
  setStocksError,
  setStocksRetry,
  setSelectedStock,
}) {
  return (
    <ErrorBoundary section="Stocks">
      <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x) 40px", background: "var(--np-band-bg)", color: "var(--np-band-text)", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
          <SectionHeader
            dark
            index="04"
            label="Markets"
            meta={formatQuotesMeta(stocksLoading, stocksLastUpdated)}
            title={<>Nuclear stocks, <em>live.</em></>}
            lede="Reactor builders, fuel suppliers, and uranium miners — click any card for detailed charts, metrics, and company context."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
            {stocksLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  background: "var(--np-band-surface)", border: "1px solid var(--np-band-border)",
                  borderRadius: 14, padding: "20px 22px", height: 140,
                  animation: "pulse 1.5s ease-in-out infinite"
                }} />
              ))
            ) : stocksError ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 40px" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{"⚠︎"}</div>
                <p style={{ color: "var(--np-band-text-muted)", fontSize: 15, marginBottom: 24 }}>
                  Market data couldn't load. Check your connection and try again.
                </p>
                <button onClick={() => { setStocksError(false); setStocksRetry(r => r + 1); }}
                  style={{
                    background: "none", border: "1px solid var(--np-accent-ink)", color: "var(--np-accent-ink)",
                    padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#d4a54a"; e.currentTarget.style.color = "#14120e"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--np-accent-ink)"; }}>
                  Retry
                </button>
              </div>
            ) : (
              stocks.map((s, i) => {
                const mini = s.history?.slice(-14) || [];
                return (
                  <div key={i} onClick={() => setSelectedStock(s)} style={{
                    background: "var(--np-band-surface)", border: "1px solid var(--np-band-border)",
                    borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "all 0.25s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--np-band-surface-hover)"; e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"; e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "var(--np-band-shadow)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--np-band-surface)"; e.currentTarget.style.borderColor = "var(--np-band-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: "var(--np-accent-ink)" }}>{s.ticker}</div>
                        <div style={{ fontSize: 11, color: "var(--np-band-text-faint)", marginTop: 2 }}>{s.name}</div>
                      </div>
                      <div style={{
                        background: `color-mix(in srgb, var(${s.change >= 0 ? "--np-up" : "--np-down"}) 12%, transparent)`,
                        color: s.change >= 0 ? "var(--np-up)" : "var(--np-down)", padding: "3px 8px", borderRadius: 16,
                        fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono',monospace",
                      }}>{s.change >= 0 ? "+" : ""}{s.pct.toFixed(2)}%</div>
                    </div>
                    {/* Mini sparkline */}
                    <div style={{ height: 40, margin: "12px 0 4px" }}>
                      <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={mini}>
                          <Line type="monotone" dataKey="price" stroke={s.change >= 0 ? SPARK_UP : SPARK_DOWN} strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--np-font-display)", fontSize: 26, fontWeight: 700 }}>${s.price.toFixed(2)}</span>
                      <span style={{ fontSize: 10, color: "var(--np-band-text-faint)", fontFamily: "'DM Mono',monospace" }}>{s.sector}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p style={{ fontSize: 10, color: "var(--np-band-text-faint)", marginTop: 24, textAlign: "center" }}>Market data for information only — not investment advice. Always do your own research.</p>
        </div>
      </section>
    </ErrorBoundary>
  );
}
