import ErrorBoundary from "../../components/ErrorBoundary.jsx";
import { inferNewsLocation } from "../../utils/news.js";
import { joinSources } from "../front/pickFront.js";
import { SectionHeader } from "./shared.jsx";

const TAGS = ["All", "Policy", "Industry", "Expansion", "Research", "Markets", "Innovation", "Safety"];
const SORTS = [
  { key: "latest", label: "Latest" },
  { key: "top", label: "Top stories" },
  { key: "source", label: "By source" },
];

// "The wire": every story not already on the front page, as a ruled list.
export default function NewsSection({
  sectionRef,
  news,
  newsLoading,
  newsError,
  newsFilter,
  newsSort,
  newsLimit,
  filteredNews,
  uniqueNewsSources,
  newsLastUpdated,
  excludeUrls,
  setNewsFilter,
  setNewsSort,
  setNewsLimit,
  refreshNews,
  getNewsMapLayer,
  setGlobeLayer,
  setPlantFilter,
  setSearchQuery,
  scrollTo,
}) {
  const items = excludeUrls && newsFilter === "All" ? filteredNews.filter((n) => !excludeUrls.has(n.url)) : filteredNews;
  // Only the curated backup set (live feeds down or still loading): it must
  // never pass for today's news.
  const archive = news.length > 0 && news.every((n) => n._isFallback);
  const updated = newsLastUpdated
    ? `Updated ${newsLastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : "";

  return (
    <ErrorBoundary section="News">
      <section ref={sectionRef} className="np-wrap" style={{ paddingTop: "var(--np-section-y)", scrollMarginTop: 60 }}>
        <SectionHeader
          label="The wire"
          meta={archive ? (newsLoading ? "Loading live feeds…" : "Live feeds unavailable") : [`${news.length} stories`, `${uniqueNewsSources} sources`, updated].filter(Boolean).join(" · ")}
          title={archive && !newsLoading ? "From the archive" : "Everything else today"}
        />
        <div className="np-news-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div role="group" aria-label="Filter by topic" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAGS.map((tag) => (
              <button key={tag} type="button" aria-pressed={newsFilter === tag} onClick={() => { setNewsFilter(tag); setNewsLimit(12); }}
                className={`np-chip${newsFilter === tag ? " is-active" : ""}`}
              >{tag}</button>
            ))}
          </div>
          <div role="group" aria-label="Sort" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {SORTS.map((s) => (
              <button key={s.key} type="button" aria-pressed={newsSort === s.key} onClick={() => { setNewsSort(s.key); setNewsLimit(12); }}
                className={`np-chip np-chip--accent${newsSort === s.key ? " is-active" : ""}`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {(newsError || archive) && !newsLoading ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", marginBottom: 8, borderTop: "1px solid var(--np-hairline)", fontSize: 14, color: "var(--np-text-muted)" }}>
            <span>The live feeds aren't answering right now, so these are earlier stories worth knowing. Today's wire returns when they do.</span>
            <button type="button" className="np-text-link" onClick={refreshNews}>Retry</button>
          </div>
        ) : null}

        {newsLoading && (news.length === 0 || archive) ? (
          <div className="np-wire" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="np-wire-item"><div style={{ height: 48, background: "var(--np-surface-dim)" }} /></div>
            ))}
          </div>
        ) : items.length ? (
          <ul className="np-wire" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.slice(0, newsLimit).map((n) => {
              const location = inferNewsLocation(n);
              return (
                <li key={n.url} className="np-wire-item">
                  <div className="np-kicker" style={{ fontSize: 11 }}>{n.tag}</div>
                  <h3><a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a></h3>
                  <div className="np-wire-meta">
                    <span>{joinSources([n.source, ...(n.related || []).map((r) => r.source)])}</span>
                    <span>{n.date}</span>
                    {location ? (
                      <button type="button" onClick={() => {
                        setGlobeLayer(getNewsMapLayer(n));
                        setPlantFilter("All");
                        setSearchQuery(location);
                        scrollTo("globe");
                      }}>Map: {location}</button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ padding: "24px 0", color: "var(--np-text-muted)", borderTop: "1px solid var(--np-hairline)" }}>No stories in this topic yet.</p>
        )}

        {!newsLoading && items.length > 12 ? (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            {newsLimit < items.length ? (
              <button type="button" onClick={() => setNewsLimit((l) => l + 12)} className="np-btn np-btn--ghost">Show more</button>
            ) : (
              <button type="button" onClick={() => setNewsLimit(12)} className="np-btn np-btn--ghost">Show fewer</button>
            )}
          </div>
        ) : null}
      </section>
    </ErrorBoundary>
  );
}
