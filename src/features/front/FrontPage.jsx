import { useMemo } from "react";
import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import NewsletterCapture from "../newsletter/NewsletterCapture.jsx";
import { joinSources, pickFront, tidyExcerpt } from "./pickFront.js";
import { useFrontSignals } from "./useFrontSignals.js";

function signed(value, digits = 2) {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}%`;
}

function Lead({ article }) {
  const sources = [article.source, ...(article.related || []).map((r) => r.source)];
  return (
    <article className="np-lead">
      <div className="np-kicker">Lead · {article.tag}</div>
      <h1><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h1>
      {article.curiosityHook ? <p className="np-lead-dek">{tidyExcerpt(article.curiosityHook)}</p> : null}
      {article.whyItMatters ? (
        <div className="np-why"><b>Why it matters</b><span>{article.whyItMatters}</span></div>
      ) : null}
      <div className="np-credit">
        Reported by{" "}
        <a href={article.url} target="_blank" rel="noopener noreferrer">{article.source}</a>
        {(article.related || []).map((r, i, list) => (
          <span key={r.url}>
            {i === list.length - 1 ? " and " : ", "}
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.source}</a>
          </span>
        ))}
        {sources.length > 1 ? ` · ${new Set(sources).size} sources` : ""} · {article.date}
      </div>
    </article>
  );
}

function LeadSkeleton() {
  return (
    <div className="np-lead" aria-busy="true">
      <div className="np-kicker">Lead</div>
      <div style={{ height: 120, background: "var(--np-surface-dim)" }} />
      <div style={{ height: 60, background: "var(--np-surface-dim)" }} />
    </div>
  );
}

export default function FrontPage({
  sectionRef,
  news,
  newsLoading,
  stocks,
  onOpenStock,
  onShowWire,
  newsletter,
}) {
  const { uranium, fleet } = useFrontSignals();
  const { lead, secondary } = useMemo(() => pickFront(news), [news]);
  const movers = useMemo(
    () => (stocks || []).filter((s) => s.price > 0).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3),
    [stocks],
  );
  const liveCount = (news || []).filter((n) => !n._isFallback).length;
  const sourceCount = new Set((news || []).flatMap((n) => [n.source, ...(n.related || []).map((r) => r.source)])).size;

  return (
    <ErrorBoundary section="Front page">
      <section ref={sectionRef} className="np-front np-wrap" aria-label="Today" style={{ scrollMarginTop: 60 }}>
        <div className="np-front-grid">
          {lead ? <Lead article={lead} /> : newsLoading ? <LeadSkeleton /> : (
            <div className="np-lead"><div className="np-kicker">Live feeds are catching up</div><p className="np-lead-dek">The latest stories will appear here shortly.</p></div>
          )}

          <aside className="np-rail" aria-label="Today in numbers">
            <div className="np-rail-head">Today in numbers</div>
            <div>
              <div className="np-reading-label">Uranium, U₃O₈ per lb</div>
              <div className="np-reading-value">
                <strong>{uranium ? `$${uranium.pricePerLb.toFixed(2)}` : "—"}</strong>
                {uranium && Number.isFinite(uranium.changePct) ? (
                  <span className={`np-num ${uranium.changePct >= 0 ? "np-up" : "np-down"}`}>{signed(uranium.changePct, 1)}</span>
                ) : null}
                <small>{uranium?.source ? "Sprott SPUT NAV" : ""}</small>
              </div>
            </div>
            <div>
              <div className="np-reading-label">US reactors online</div>
              <div className="np-reading-value">
                <strong>{fleet ? <>{fleet.online}<span style={{ fontSize: 24, color: "var(--np-text-faint)" }}>/{fleet.total}</span></> : "—"}</strong>
                {fleet ? <small>fleet avg {fleet.avgPower}% · NRC {fleet.reportDate}</small> : null}
              </div>
            </div>
            {movers.length ? (
              <div>
                <div className="np-reading-label" style={{ marginBottom: 6 }}>Biggest moves today</div>
                {movers.map((s) => (
                  <button key={s.ticker} type="button" className="np-mover" onClick={() => onOpenStock(s)}>
                    <span><b>{s.ticker}</b> <span style={{ color: "var(--np-text-faint)" }}>{s.name}</span></span>
                    <span className={`np-num ${s.pct >= 0 ? "np-up" : "np-down"}`}>{s.pct >= 0 ? "▲" : "▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="np-signup">
              <p className="np-signup-title">The week in nuclear, every Sunday.</p>
              <NewsletterCapture
                surface="front"
                form={newsletter.forms.hero}
                success={newsletter.isSubscribed}
                successMessage="Almost there. Check your inbox and click the link to confirm."
                onEmailChange={(_, value) => newsletter.handleEmailChange("hero", value)}
                onWebsiteChange={(_, value) => newsletter.handleWebsiteChange("hero", value)}
                onSubmit={() => newsletter.handleSubscribe("hero")}
                buttonLabel="Subscribe"
                placeholder="you@company.com"
                note="Free. Unsubscribe anytime."
                inputStyle={{ width: "100%", background: "var(--np-bg)", color: "var(--np-text)", borderColor: "transparent" }}
                buttonStyle={{ background: "var(--np-accent)", color: "var(--np-on-accent)" }}
                successStyle={{ color: "var(--np-bg)" }}
                errorStyle={{ color: "var(--np-bg)" }}
                noteStyle={{ color: "var(--np-bg)", opacity: 0.8 }}
              />
            </div>
          </aside>
        </div>

        {secondary.length ? (
          <div className="np-more" aria-label="More stories">
            {secondary.map((s) => (
              <article key={s.url} className="np-story">
                <div className="np-kicker" style={{ fontSize: 11 }}>{s.tag}</div>
                <h2><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></h2>
                {s.whyItMatters || s.curiosityHook ? <p>{s.whyItMatters || tidyExcerpt(s.curiosityHook)}</p> : null}
                <div className="np-credit">{joinSources([s.source, ...(s.related || []).map((r) => r.source)])} · {s.date}</div>
              </article>
            ))}
          </div>
        ) : null}
        {liveCount > secondary.length + 1 ? (
          <div className="np-front-more-link">
            <button type="button" className="np-text-link" onClick={onShowWire}>
              All {liveCount} stories from {sourceCount} sources →
            </button>
          </div>
        ) : null}
      </section>
    </ErrorBoundary>
  );
}
