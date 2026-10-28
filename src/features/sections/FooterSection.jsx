const SOURCES = [
  ["IAEA PRIS", "https://pris.iaea.org/"],
  ["US NRC", "https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status/"],
  ["SEC EDGAR", "https://www.sec.gov/edgar/search/"],
  ["World Nuclear Association", "https://world-nuclear.org/"],
  ["US EIA", "https://www.eia.gov/"],
];

const PAGES = [
  ["Uranium stocks", "/uranium-stocks"],
  ["SMR tracker", "/smr-tracker"],
  ["Reactor outages", "/reactor-outages"],
  ["Learn", "/learn"],
  ["Terminal", "/terminal"],
];

const LEGAL = [
  ["Terms", "/legal/terms.html"],
  ["Privacy", "/legal/privacy.html"],
  ["Refunds", "/legal/refunds.html"],
  ["support@thenuclearpulse.com", "mailto:support@thenuclearpulse.com"],
];

function Column({ title, links, external = false }) {
  return (
    <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      {links.map(([label, href]) => (
        <a key={href} className="np-footer-link" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}</a>
      ))}
    </div>
  );
}

export default function FooterSection() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ marginTop: "var(--np-section-y)", borderTop: "3px double var(--np-rule)", color: "var(--np-text-muted)" }}>
      <div className="np-wrap" style={{ padding: "28px var(--np-section-x) 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "28px 40px" }}>
          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            <button
              type="button"
              aria-label="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "var(--np-font-display)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--np-text)" }}
            >
              Nuclear Pulse
            </button>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Reactors, uranium, markets and the politics of firm power, from primary sources every day.
            </p>
          </div>
          <Column title="Pages" links={PAGES} />
          <Column title="Sources" links={SOURCES} external />
          <Column title="Company" links={LEGAL} />
        </div>
        <div style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid var(--np-hairline)", fontSize: 13 }}>
          © {year} Nuclear Pulse · For information only, not investment advice.
        </div>
      </div>
    </footer>
  );
}
