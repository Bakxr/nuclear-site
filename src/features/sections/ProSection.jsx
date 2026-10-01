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

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="var(--np-accent-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

export default function ProSection({ isMobileViewport, onOpenTerminal, preview = null }) {
  return (
    <section style={{ padding: "0 var(--np-section-x) var(--np-section-y)", background: "var(--np-band-bg)", color: "var(--np-band-text)" }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
        <div
          style={{
            borderTop: "1px solid var(--np-band-rule)",
            padding: isMobileViewport ? "36px 0 28px" : "clamp(40px, 5vw, 64px) 0 32px",
            display: "grid",
            gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.45fr) minmax(300px, 1fr)",
            gap: isMobileViewport ? 32 : "clamp(36px, 5vw, 72px)",
            alignItems: "start",
          }}
        >
          {/* Pitch + what's inside */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--np-accent-ink)" }}>
              Nuclear Pulse PRO
            </div>
            <div
              style={{
                fontFamily: "var(--np-font-display)",
                fontSize: "clamp(28px,3.4vw,46px)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.06,
                marginTop: 14,
                textWrap: "balance",
                maxWidth: "20ch",
              }}
            >
              The terminal for people who <em style={{ fontStyle: "italic", fontWeight: 350, color: "var(--np-accent-ink)" }}>trade the buildout.</em>
            </div>
            <div style={{ fontSize: 15, color: "var(--np-text-muted)", lineHeight: 1.7, marginTop: 14, maxWidth: "58ch" }}>
              The free site tells you the story. PRO gives you the tape: filings, catalysts, operations
              signals, and market context in one workspace, refreshed through the trading day.
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "28px 0 0",
                display: "grid",
                gridTemplateColumns: isMobileViewport ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                columnGap: 24,
                rowGap: 12,
                borderTop: "1px solid var(--np-band-rule)",
                paddingTop: 20,
              }}
            >
              {PRO_MODULES.map((mod) => (
                <li key={mod.label} title={mod.detail} style={{ display: "flex", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--np-band-text)" }}>
                  <Check />
                  {mod.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing panel */}
          <div
            style={{
              border: "1px solid var(--np-hairline)",
              borderRadius: 14,
              background: "var(--np-surface)",
              padding: "24px 22px 20px",
              position: isMobileViewport ? "static" : "sticky",
              top: 96,
            }}
          >
            <div style={{ fontFamily: "var(--np-font-display)", fontSize: 22, color: "var(--np-text)", lineHeight: 1.2 }}>
              Try it free for 7 days
            </div>
            <div style={{ fontSize: 13, color: "var(--np-text-muted)", marginTop: 6 }}>Then pick a plan. Cancel anytime.</div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {PRO_PLANS.map((plan) => (
                <button
                  key={plan.name}
                  type="button"
                  onClick={onOpenTerminal}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    border: plan.badge ? "1px solid var(--np-accent-ink)" : "1px solid var(--np-hairline)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    background: plan.badge ? "color-mix(in srgb, var(--np-accent) 8%, transparent)" : "transparent",
                    fontFamily: "inherit",
                    color: "var(--np-text)",
                  }}
                >
                  <span>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{plan.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: plan.badge ? "var(--np-accent-ink)" : "var(--np-text-muted)", marginTop: 2, fontWeight: plan.badge ? 700 : 400 }}>
                      {plan.badge ? "2 months free" : "Flexible, month to month"}
                    </span>
                  </span>
                  <span style={{ fontFamily: "var(--np-font-display)", fontSize: 26, whiteSpace: "nowrap" }}>
                    {plan.price}
                    <span style={{ fontSize: 13, color: "var(--np-text-muted)" }}>{plan.cadence}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenTerminal}
              style={{
                width: "100%",
                marginTop: 16,
                background: "#d4a54a",
                color: "#14120e",
                border: "none",
                borderRadius: 8,
                padding: "14px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Start 7-day free trial
            </button>
            <div style={{ fontSize: 12, color: "var(--np-text-faint)", marginTop: 10, textAlign: "center" }}>
              Secure Stripe checkout · No charge for 7 days
            </div>
          </div>
        </div>
        {preview}
      </div>
    </section>
  );
}
