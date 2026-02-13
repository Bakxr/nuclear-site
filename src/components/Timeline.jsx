import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TIMELINE_EVENTS, ERA_COLORS } from "../data/timeline.js";

function TimelineCard({ event, index, isLeft }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const eraColor = ERA_COLORS[event.era] || "#d4a54a";

  return (
    <div
      ref={ref}
      className="np-timeline-item"
      style={{
        display: "flex",
        alignItems: isLeft ? "flex-end" : "flex-start",
        flexDirection: isLeft ? "row" : "row-reverse",
        gap: 24,
        marginBottom: 40,
        position: "relative",
      }}
    >
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        style={{
          flex: "0 0 calc(50% - 32px)",
          background: "var(--np-card-bg)",
          border: "1px solid var(--np-card-border)",
          borderRadius: 14,
          padding: "24px",
          borderTop: `2px solid ${eraColor}`,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{
            fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700,
            color: eraColor, lineHeight: 1,
          }}>{event.year}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
            color: eraColor, background: eraColor + "18", padding: "3px 8px", borderRadius: 4,
          }}>{event.era}</span>
        </div>
        <h4 style={{
          fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 500,
          margin: "0 0 4px", color: "var(--np-text)",
        }}>{event.title}</h4>
        <p style={{ fontSize: 12, color: "var(--np-text-muted)", margin: "0 0 10px", fontWeight: 600 }}>
          {event.subtitle}
        </p>
        <p style={{ fontSize: 13, color: "var(--np-text-muted)", margin: "0 0 12px", lineHeight: 1.6, opacity: 0.85 }}>
          {event.description}
        </p>
        <div style={{
          fontSize: 11, color: eraColor, fontWeight: 600,
          padding: "6px 10px", background: eraColor + "10", borderRadius: 6,
          display: "inline-block",
        }}>
          {event.significance}
        </div>
      </motion.div>

      {/* Center dot + connector */}
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2,
      }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: eraColor, border: "3px solid var(--np-bg)",
            boxShadow: `0 0 0 2px ${eraColor}40`,
          }}
        />
      </div>

      {/* Year label on opposite side */}
      <div style={{
        flex: "0 0 calc(50% - 32px)",
        display: "flex",
        justifyContent: isLeft ? "flex-start" : "flex-end",
        alignItems: "center",
        paddingTop: 8,
      }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 0.4 } : {}}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            fontFamily: "'Playfair Display',serif", fontSize: 48, fontWeight: 700,
            color: "var(--np-text)", lineHeight: 1,
          }}
        >{event.year}</motion.span>
      </div>
    </div>
  );
}

export default function Timeline() {
  return (
    <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
      {/* Center vertical line */}
      <div style={{
        position: "absolute", left: "50%", top: 0, bottom: 0, width: 2,
        background: "linear-gradient(to bottom, transparent, var(--np-text-faint), var(--np-text-faint), transparent)",
        opacity: 0.2, transform: "translateX(-50%)",
      }} />

      {TIMELINE_EVENTS.map((event, i) => (
        <TimelineCard key={event.year} event={event} index={i} isLeft={i % 2 === 0} />
      ))}
    </div>
  );
}
