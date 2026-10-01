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
// Theme tokens (index.css): deeper on light, brighter on dark.
const SMR_STATUS_COLORS = {
  Operational: "var(--np-c-green)",
  Construction: "var(--np-c-amber)",
  Licensed: "var(--np-c-blue)",
  Licensing: "var(--np-c-violet)",
  Design: "var(--np-c-slate)",
};
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export default function SmrSection({ sectionRef }) {
  return (
    <section ref={sectionRef} style={{ padding: "var(--np-section-y) var(--np-section-x)", background: "var(--np-band-bg)", color: "var(--np-band-text)", scrollMarginTop: 80 }}>
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
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--np-band-text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SMR_STATUS_COLORS[s], flexShrink: 0 }} />
                {s} <span style={{ color: "var(--np-band-text-faint)", marginLeft: 2 }}>({SMR_PROJECTS.filter(p => p.status === s).length})</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* SMR programmes as a table: one row per design, sorted by status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }} transition={{ duration: 0.4 }}
          style={{ overflowX: "auto", border: "1px solid var(--np-band-border)", borderRadius: 12, background: "var(--np-band-surface)" }}
        >
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Design", "Country", "Status", "Capacity", "Type", "Target"].map((h, hi) => (
                  <th key={h} scope="col" style={{
                    textAlign: hi >= 3 ? "right" : "left", padding: "12px 16px", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--np-band-text-faint)",
                    borderBottom: "1px solid var(--np-band-border)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...SMR_PROJECTS].sort((a, b) => SMR_STATUS_ORDER.indexOf(a.status) - SMR_STATUS_ORDER.indexOf(b.status) || a.year - b.year).map((project, i, rows) => {
                const cell = { padding: "14px 16px", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--np-band-border)", verticalAlign: "top" };
                const num = { ...cell, textAlign: "right", fontFamily: "'DM Mono',monospace", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "var(--np-band-text)" };
                // Data carries a flag emoji first ("🇨🇦 Canada"); show the name only.
                const countryName = project.country.split(" ").slice(1).join(" ");
                return (
                  <tr key={project.name}>
                    <td style={{ ...cell, maxWidth: 420 }}>
                      <div style={{ fontFamily: "var(--np-font-display)", fontSize: 16, fontWeight: 500, color: "var(--np-band-text)", lineHeight: 1.25 }}>
                        {project.name} <span style={{ fontFamily: "var(--np-font-sans)", fontSize: 12, fontWeight: 400, color: "var(--np-band-text-faint)" }}>· {project.company}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--np-band-text-muted)", lineHeight: 1.5, marginTop: 3 }}>{project.desc}</div>
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "var(--np-band-text-muted)" }}>
                      {countryName}
                    </td>
                    <td style={cell}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: SMR_STATUS_COLORS[project.status],
                        background: tint(SMR_STATUS_COLORS[project.status], 12),
                        padding: "3px 9px", borderRadius: 20,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: SMR_STATUS_COLORS[project.status] }} />
                        {project.status}
                      </span>
                    </td>
                    <td style={num}>{project.capacity} MW</td>
                    <td style={num}>{project.type}</td>
                    <td style={num}>{project.year}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ fontSize: 11, color: "var(--np-band-text-faint)", marginTop: 24, textAlign: "right" }}
        >
          Sources: IAEA, World Nuclear Association, company filings — updated Feb 2026
        </motion.p>
      </div>
    </section>
  );
}
