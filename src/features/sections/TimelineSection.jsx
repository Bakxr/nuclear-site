import { motion } from "framer-motion";
import Timeline from "../../components/Timeline.jsx";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionLabel } from "./shared.jsx";

export default function TimelineSection({ sectionRef }) {
  return (
    <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          <SectionLabel dark>History</SectionLabel>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Nuclear <em style={{ color: "#d4a54a" }}>timeline.</em>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: "rgba(245,240,232,0.4)", fontSize: 15, marginBottom: 48, maxWidth: 600, lineHeight: 1.6 }}>From the first chain reaction to the SMR revolution — eight decades of nuclear milestones.</motion.p>
        </motion.div>
        <Timeline />
      </div>
    </section>
  );
}
