import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionLabel } from "./shared.jsx";

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
    <section style={{ padding: "var(--np-section-y) var(--np-section-x)", textAlign: "center", background: "var(--np-surface-dim)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <SectionLabel>Newsletter</SectionLabel>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>
            Stay close to the <em style={{ color: "var(--np-text-muted)" }}>weekly atomic briefing.</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "var(--np-text-muted)", fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>Weekly briefings on reactor developments, policy, and market movements — sourced from World Nuclear News, ANS, IAEA, and more.</motion.p>
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
                style={{ padding: "15px 22px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "var(--np-surface)", color: "var(--np-text)", border: `1px solid ${subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"}`, borderRadius: "10px 0 0 10px", width: 320, outline: "none", borderRight: "none", transition: "border-color 0.2s", opacity: subStatus === "loading" ? 0.6 : 1 }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"}
                onBlur={e => e.currentTarget.style.borderColor = subStatus === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"} />
              <button aria-label="Subscribe to newsletter" onClick={handleSubscribe} disabled={subStatus === "loading"}
                style={{ padding: "15px 32px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, background: "var(--np-text)", color: "var(--np-bg)", border: "none", borderRadius: "0 10px 10px 0", cursor: subStatus === "loading" ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: "0.04em", transition: "all 0.2s", opacity: subStatus === "loading" ? 0.6 : 1 }}
                onMouseEnter={e => { if (subStatus !== "loading") e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { if (subStatus !== "loading") e.currentTarget.style.opacity = "1"; }}>
                {subStatus === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {subStatus === "error" && (
              <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, textAlign: "center" }}>{subErrorMsg}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
