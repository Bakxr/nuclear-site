// Keep in step with what the terminal actually ships (see TerminalAccessPage FEATURES).
const PRO_MODULES = [
  {
    label: "Equity board",
    detail: "Nearly 40 nuclear names — miners to utilities — with real price history and 52-week ranges.",
  },
  {
    label: "Event odds",
    detail: "Polymarket and Kalshi odds on enrichment, deals and policy, cleaned and deduplicated.",
  },
  {
    label: "Insider flow",
    detail: "Form 4 open-market buys and sells, parsed straight from SEC filings.",
  },
  {
    label: "Unit status",
    detail: "Daily NRC power levels for US reactors — derates and outages first.",
  },
  {
    label: "Regulatory wire",
    detail: "NRC licensing notices, 8-K material events and sector news in one tape.",
  },
  {
    label: "Alerts & brief",
    detail: "Price and event alerts by email, plus a morning brief built from your watchlist.",
  },
];

const PRO_PLANS = [
  {
    name: "Monthly",
    price: "$19",
    cadence: "/month",
    detail: "Flexible access for active readers, operators, and investors.",
    badge: "",
  },
  {
    name: "Annual",
    price: "$190",
    cadence: "/year",
    detail: "Two months free for readers who expect to live in the feed.",
    badge: "Best value",
  },
];

export default function ProSection({ isMobileViewport, onOpenTerminal }) {
  return (
    <section style={{ padding: "0 var(--np-section-x) var(--np-section-y)", background: "var(--np-bg)" }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
        <div
          style={{
            borderTop: "1px solid var(--np-hairline)",
            borderBottom: "1px solid var(--np-hairline)",
            padding: isMobileViewport ? "36px 0" : "clamp(40px, 5vw, 64px) 0",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--np-accent-ink)" }}>
            Nuclear Pulse PRO
          </div>
          <div
            style={{
              fontFamily: "var(--np-font-display)",
              fontSize: "clamp(28px,3.4vw,48px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.06,
              marginTop: 14,
              textWrap: "balance",
              maxWidth: "22ch",
            }}
          >
            The terminal for people who <em style={{ fontStyle: "italic", fontWeight: 350, color: "var(--np-accent-ink)" }}>trade the buildout.</em>
          </div>
          <div style={{ fontSize: 15, color: "var(--np-text-muted)", lineHeight: 1.7, marginTop: 14, maxWidth: "62ch" }}>
            The free site tells you the story. PRO gives you the tape: filings, catalysts, operations
            signals, and market context in one workspace, refreshed through the trading day.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
            {PRO_MODULES.map((mod) => (
              <div
                key={mod.label}
                style={{
                  border: "1px solid var(--np-hairline)",
                  borderRadius: 12,
                  padding: "18px 18px 16px",
                  background: "var(--np-surface)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--np-accent-ink)" }}>
                  {mod.label}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--np-text)", marginTop: 8 }}>
                  {mod.detail}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 14,
              marginTop: 14,
            }}
          >
            {PRO_PLANS.map((plan) => (
              <button
                key={plan.name}
                type="button"
                onClick={onOpenTerminal}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  border: plan.badge ? "1px solid var(--np-accent-ink)" : "1px solid var(--np-hairline)",
                  borderRadius: 12,
                  padding: "20px 22px",
                  background: plan.badge ? "rgba(130,96,23,0.06)" : "transparent",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--np-text)" }}>{plan.name}</div>
                  {plan.badge ? (
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--np-accent-ink)" }}>
                      {plan.badge}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontFamily: "var(--np-font-display)", fontSize: 34, marginTop: 6, color: "var(--np-text)" }}>
                  {plan.price}
                  <span style={{ fontSize: 14, color: "var(--np-text-muted)" }}>{plan.cadence}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--np-text-muted)", marginTop: 6 }}>
                  {plan.detail}
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 26 }}>
            <button
              type="button"
              onClick={onOpenTerminal}
              style={{
                background: "#d4a54a",
                color: "#14120e",
                border: "none",
                borderRadius: 8,
                padding: "14px 30px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Start 7-day free trial
            </button>
            <div style={{ fontSize: 12.5, color: "var(--np-text-muted)" }}>
              Free for 7 days · Cancel anytime · Secure Stripe checkout
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
