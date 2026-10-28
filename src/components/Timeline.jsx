import { TIMELINE_EVENTS, ERA_COLORS } from "../data/timeline.js";

// A ruled chronology: year in the margin, the entry beside it. One column
// that reads the same on every screen size.
export default function Timeline() {
  return (
    <ol className="np-chronology">
      {TIMELINE_EVENTS.map((event) => {
        const eraColor = ERA_COLORS[event.era] || "var(--np-c-gold)";
        return (
          <li key={event.year}>
            <div className="np-chronology-year">{event.year}</div>
            <div className="np-chronology-entry">
              <div className="np-chronology-era" style={{ color: eraColor }}>{event.era}</div>
              <h3>{event.title}</h3>
              <p className="np-chronology-sub">{event.subtitle}</p>
              <p>{event.description}</p>
              <p className="np-chronology-why"><b>Why it mattered:</b> {event.significance}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
