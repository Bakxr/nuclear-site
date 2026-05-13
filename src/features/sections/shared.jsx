import { motion } from "framer-motion";
import { fadeUp, lineGrow } from "./animations.js";

// ─── SECTION LABEL — animated gold line + uppercase text ──────────────
export function SectionLabel({ children, dark = false }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}
    >
      <motion.div
        variants={lineGrow}
        style={{
          height: 1, width: 28, background: "#d4a54a",
          flexShrink: 0, transformOrigin: "left",
        }}
      />
      <span style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700,
        color: dark ? "rgba(212,165,74,0.7)" : "#d4a54a",
      }}>{children}</span>
    </motion.div>
  );
}
