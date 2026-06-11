import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "./animations.js";

export default function NewsletterSection({
  subStatus,
  subEmail,
  subWebsite,
  subErrorMsg,
  setSubEmail,
  setSubWebsite,
  handleSubscribe,
}) {
  return (
    <section style={{ padding: "var(--np-section-y) var(--np-section-x)", textAlign: "center", background: "var(--np-bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 28 }}>
            <span style={{ height: 1, width: 36, background: "var(--np-hairline)" }} />
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, color: "var(--np-accent-ink)" }}>
              The Weekly Briefing
            </span>
            <span style={{ height: 1, width: 36, background: "var(--np-hairline)" }} />
          </motion.div>
          <motion.h2 variants={fadeUp} style={{
            fontFamily: "var(--np-font-display)",
            fontSize: "clamp(34px, 4.6vw, 64px)",
            fontWeight: 400,
            letterSpacing: "-0.025em",
            margin: "0 0 16px",
            lineHeight: 1.05,
            color: "var(--np-text)",
            textWrap: "balance",
          }}>
            Stay close to the <em style={{ fontStyle: "italic", fontWeight: 350, color: "var(--np-accent-ink)" }}>atomic signal.</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15.5, marginBottom: 40, lineHeight: 1.7, maxWidth: "52ch", marginLeft: "auto", marginRight: "auto" }}>
            One sharp weekly email on reactor developments, policy, and market movements —
            sourced from World Nuclear News, ANS, IAEA, and more.
          </motion.p>
        </motion.div>
        {subStatus === "success" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 15, color: "#4ade80", fontWeight: 600, padding: "18px 0" }}>
            You're subscribed! First issue lands this Sunday.
          </motion.div>
        ) : (
          <div>
            <div className="np-newsletter-row" style={{ display: "flex", justifyContent: "center" }}>
              <input
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                value={subWebsite}
                onChange={e => setSubWebsite(e.target.value)}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <input type="email" aria-label="Email address" placeholder="Enter your email"
                value={subEmail}
                onChange={e => setSubEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                disabled={subStatus === "loading"}
                className="np-input"
                style={{ borderRadius: "6px 0 0 6px", width: 340, borderRight: "none", borderColor: subStatus === "error" ? "rgba(248,113,113,0.6)" : undefined, opacity: subStatus === "loading" ? 0.6 : 1 }} />
              <button aria-label="Subscribe to newsletter" onClick={handleSubscribe} disabled={subStatus === "loading"}
                className="np-btn np-btn--primary"
                style={{ borderRadius: "0 6px 6px 0", transform: "none", cursor: subStatus === "loading" ? "not-allowed" : "pointer", opacity: subStatus === "loading" ? 0.6 : 1 }}>
                {subStatus === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {subStatus === "error" && (
              <p style={{ fontSize: 13, color: "#f87171", marginTop: 12, textAlign: "center" }}>{subErrorMsg}</p>
            )}
            <p style={{ fontSize: 12, color: "var(--np-text-faint)", marginTop: 14 }}>
              Weekly. Free. No spam. Unsubscribe anytime.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
