import Timeline from "../../components/Timeline.jsx";
import { SectionHeader } from "./shared.jsx";

export default function TimelineSection({ sectionRef }) {
  return (
    <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
        <SectionHeader
          dark
          index="07"
          label="History"
          meta="1942 — today"
          title={<>Eight decades of <em>fission.</em></>}
          lede="From the first chain reaction to the SMR revolution — the milestones that built, broke, and rebuilt the nuclear century."
        />
        <Timeline />
      </div>
    </section>
  );
}
