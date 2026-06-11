import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "./animations.js";
import { SectionHeader } from "./shared.jsx";

// ─── SMR TRACKER DATA ─────────────────────────────────────────────────
const SMR_PROJECTS = [
  { name: "BWRX-300", company: "GE Hitachi", country: "🇨🇦 Canada", capacity: 300, type: "BWR", status: "Licensing", year: 2029, desc: "First commercial BWRX-300 at Ontario Power Generation's Darlington site." },
  { name: "Xe-100", company: "X-energy", country: "🇺🇸 USA", capacity: 80, type: "HTGR", status: "Design", year: 2030, desc: "Pebble-bed high-temperature gas-cooled reactor. DOE funded. Dow partnership." },
  { name: "Natrium", company: "TerraPower", country: "🇺🇸 USA", capacity: 345, type: "SFR", status: "Construction", year: 2030, desc: "Sodium-cooled fast reactor with molten salt energy storage. Kemmerer, Wyoming." },
  { name: "Kairos KP-FHR", company: "Kairos Power", country: "🇺🇸 USA", capacity: 140, type: "FHR", status: "Licensing", year: 2031, desc: "Fluoride salt-cooled high-temperature reactor. DOE ARDP funded." },
  { name: "SMR-160", company: "Holtec", country: "🇺🇸 USA", capacity: 160, type: "PWR", status: "Design", year: 2032, desc: "Passively safe light water SMR. Gravity-driven cooling, no pumps required." },
  { name: "Rolls-Royce SMR", company: "Rolls-Royce", country: "🇬🇧 UK", capacity: 470, type: "PWR", status: "Licensing", year: 2033, desc: "UK government-backed SMR programme. Factory-built modular design." },
  { name: "NuScale VOYGR", company: "NuScale", country: "🇺🇸 USA", capacity: 77, type: "PWR", status: "Licensed", year: 2029, desc: "First SMR to receive NRC design approval. 12-module plant option." },
  { name: "ARC-100", company: "ARC Clean Energy", country: "🇨🇦 Canada", capacity: 100, type: "SFR", status: "Design", year: 2034, desc: "Sodium-cooled fast reactor. Uses used nuclear fuel as primary fuel source." },
  { name: "HTR-PM", company: "CNNC / Huaneng", country: "🇨🇳 China", capacity: 200, type: "HTGR", status: "Operational", year: 2023, desc: "World's first commercial pebble-bed reactor. Shidao Bay, Shandong." },
  { name: "RITM-200", company: "Rosatom", country: "🇷🇺 Russia", capacity: 50, type: "PWR", status: "Operational", year: 2020, desc: "Powers icebreakers; land-based versions for remote Arctic communities." },
  { name: "ACPR50S", company: "CGN", country: "🇨🇳 China", capacity: 60, type: "PWR", status: "Design", year: 2030, desc: "Offshore floating nuclear power plant for island and remote coastal power." },
  { name: "Thorcon MSR", company: "ThorCon", country: "🇮🇩 Indonesia", capacity: 500, type: "MSR", status: "Design", year: 2033, desc: "Ship-based molten salt reactor. Partnership with Indonesian government." },
];

const SMR_STATUS_ORDER = ["Operational", "Construction", "Licensed", "Licensing", "Design"];
const SMR_STATUS_COLORS = {
  Operational: "#4ade80",
  Construction: "#fbbf24",
  Licensed: "#60a5fa",
  Licensing: "#a78bfa",
  Design: "#94a3b8",
};

export default function SmrSection({ sectionRef }) {
  return (
    <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-dark-bg)", color: "var(--np-dark-text)", scrollMarginTop: 80 }}>
      <div style={{ maxWidth: "var(--np-content-max)", margin: "0 auto" }}>
        <SectionHeader
          dark
          index="05"
          label="Buildout"
          meta={`${SMR_PROJECTS.length} tracked programmes`}
          title={<>Small modular <em>reactors.</em></>}
          lede="The next generation of nuclear — factory-built, faster to deploy, and designed for a decarbonised grid."
        />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={staggerContainer}>
          {/* Status legend */}
          <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 36, marginTop: -16 }}>
            {SMR_STATUS_ORDER.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(245,240,232,0.5)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SMR_STATUS_COLORS[s], flexShrink: 0 }} />
                {s} <span style={{ color: "rgba(245,240,232,0.25)", marginLeft: 2 }}>({SMR_PROJECTS.filter(p => p.status === s).length})</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* SMR cards grid */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={staggerContainer}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
        >
          {[...SMR_PROJECTS].sort((a, b) => SMR_STATUS_ORDER.indexOf(a.status) - SMR_STATUS_ORDER.indexOf(b.status)).map((project) => (
            <motion.div key={project.name} variants={fadeUp} style={{
              background: "rgba(245,240,232,0.04)", border: "1px solid rgba(245,240,232,0.08)",
              borderRadius: 12, padding: "18px 20px",
              borderLeft: `3px solid ${SMR_STATUS_COLORS[project.status]}`,
              transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(245,240,232,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(245,240,232,0.04)"}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--np-font-display)", fontSize: 17, fontWeight: 500, color: "#f5f0e8", lineHeight: 1.2 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(245,240,232,0.4)", marginTop: 2 }}>{project.company} · {project.country}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: SMR_STATUS_COLORS[project.status],
                  background: SMR_STATUS_COLORS[project.status] + "26",
                  border: `1px solid ${SMR_STATUS_COLORS[project.status]}55`,
                  padding: "3px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 8,
                }}>{project.status}</span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: "rgba(245,240,232,0.45)", lineHeight: 1.55, margin: "0 0 14px" }}>{project.desc}</p>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Capacity</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.capacity} MW</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Type</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,240,232,0.3)", marginBottom: 2 }}>Target</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#d4a54a" }}>{project.year}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ fontSize: 11, color: "rgba(245,240,232,0.2)", marginTop: 24, textAlign: "right" }}
        >
          Sources: IAEA, World Nuclear Association, company filings — updated Feb 2026
        </motion.p>
      </div>
    </section>
  );
}
