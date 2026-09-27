import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { fmtAgo } from "./format.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "sec", label: "SEC" },
];

function toTime(value) {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

// One chronological tape across news, 8-K material events and other SEC
// filings. 8-K filings are represented by their material-event rows (which
// carry the item description), so they're skipped in the filings pass.
function buildWire({ newsRows, materialEventRows, filingRows, companyByTicker }) {
  const items = [];
  for (const article of newsRows) {
    items.push({
      id: article.id,
      kind: "news",
      time: toTime(article.pubDate || article.updatedAt),
      source: article.sourceName,
      tag: article.tag,
      official: article.isOfficial,
      title: article.title,
      lede: article.curiosityHook,
      url: article.url,
      entity: article,
    });
  }
  const eventUrls = new Set();
  for (const event of materialEventRows) {
    eventUrls.add(event.url);
    const company = companyByTicker.get(event.ticker);
    items.push({
      id: event.id,
      kind: "sec",
      time: toTime(`${event.filedAt}T21:00:00Z`),
      source: "SEC 8-K",
      tag: event.ticker,
      title: `${event.companyName}: ${event.summary}`,
      lede: `Item ${event.item}`,
      url: event.url,
      entity: company || null,
    });
  }
  for (const filing of filingRows) {
    if (filing.form === "8-K" || eventUrls.has(filing.url)) continue;
    items.push({
      id: filing.id,
      kind: "sec",
      time: toTime(filing.filingDate),
      source: `SEC ${filing.form}`,
      tag: filing.ticker,
      title: `${filing.companyName} filed ${filing.form}`,
      lede: filing.summary,
      url: filing.url,
      entity: filing,
    });
  }
  return items.sort((a, b) => b.time - a.time);
}

export default function NewsWire({ full = false }) {
  const { snapshot, newsRows, materialEventRows, filingRows, selectEntity, selectedEntity } = useTerminal();
  const [filter, setFilter] = useState("all");

  const items = useMemo(() => {
    const companyByTicker = new Map((snapshot?.entities?.companies || []).map((company) => [company.ticker, company]));
    return buildWire({ newsRows, materialEventRows, filingRows, companyByTicker });
  }, [snapshot, newsRows, materialEventRows, filingRows]);
  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  return (
    <TerminalPanel
      panelId="terminal-panel-wire"
      title="Wire"
      count={visible.length}
      subtitle="News, 8-K material events and SEC filings for the tracked universe, newest first. Filters to the selected entity."
      actions={(
        <div className="npt-seg" role="group" aria-label="Wire filter">
          {FILTERS.map((option) => (
            <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      bodyStyle={{ padding: 0 }}
    >
      {visible.length === 0 ? (
        <div className="npt-empty">
          <strong>Quiet wire</strong>
          {selectedEntity ? "Nothing on the wire for this selection." : "No items in the current window."}
        </div>
      ) : (
        <div className="npt-list">
          {visible.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="npt-row"
              aria-selected={selectedEntity && item.entity?.id === selectedEntity.id ? true : undefined}
              onClick={() => item.entity && selectEntity(item.entity)}
              onKeyDown={(event) => { if (event.key === "Enter" && item.entity) selectEntity(item.entity); }}
            >
              <span className="npt-row-meta">
                <span className="npt-num" style={{ minWidth: 52, color: "var(--np-terminal-muted)" }}>{item.time ? fmtAgo(item.time) : "—"}</span>
                <span className="npt-chip" data-tone={item.kind === "sec" ? "cyan" : item.official ? "up" : "gold"}>{item.tag || item.kind}</span>
                <span>{item.source}</span>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    style={{ marginLeft: "auto", color: "var(--np-terminal-subtle)", textDecoration: "none" }}
                    aria-label="Open source"
                  >
                    ↗
                  </a>
                ) : null}
              </span>
              <span className="npt-row-title">{item.title}</span>
              {full && item.lede ? (
                <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--np-terminal-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.lede}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </TerminalPanel>
  );
}
