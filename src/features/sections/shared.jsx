import { motion } from "framer-motion";
import { fadeUp, lineGrow } from "./animations.js";

// ─── SECTION LABEL — animated gold line + uppercase text (legacy) ──────
export function SectionLabel({ children, dark = false }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}
    >
      <motion.div
        variants={lineGrow}
        style={{
          height: 1, width: 28, background: "var(--np-accent)",
          flexShrink: 0, transformOrigin: "left",
        }}
      />
      <span style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700,
        color: dark ? "rgba(212,165,74,0.7)" : "var(--np-accent-ink)",
      }}>{children}</span>
    </motion.div>
  );
}

// ─── SECTION HEADER — numbered editorial masthead for every section ────
// Renders a full-width hairline rule, a mono index + small-caps label
// (optional right-aligned meta), an oversized Fraunces title, and a lede.
export function SectionHeader({ index, label, title, lede, meta, dark = false }) {
  return (
    <motion.div
      className={`np-sec-head${dark ? " np-sec-head--dark" : ""}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div className="np-sec-kicker-row" variants={lineGrow}>
        <span className="np-sec-index">{index}</span>
        <span className="np-sec-label">{label}</span>
        {meta ? <span className="np-sec-meta">{meta}</span> : null}
      </motion.div>
      <motion.h2 className="np-sec-title" variants={fadeUp}>
        {title}
      </motion.h2>
      {lede ? (
        <motion.p className="np-sec-lede" variants={fadeUp}>
          {lede}
        </motion.p>
      ) : null}
    </motion.div>
  );
}
