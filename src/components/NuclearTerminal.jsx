import { Suspense, useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { NUCLEAR_SHARE, STATUS_COLORS } from "../data/constants.js";
import { SUPPLY_STAGE_COLORS } from "../data/supplySites.js";
import { inferNewsLocation } from "../utils/news.js";

function terminalPanelStyle(dark = true) {
  return {
    background: dark ? "rgba(11,15,22,0.92)" : "var(--np-surface)",
    border: "1px solid rgba(212,165,74,0.16)",
    borderRadius: 18,
    boxShadow: dark ? "0 30px 80px rgba(0,0,0,0.28)" : "0 16px 42px rgba(0,0,0,0.08)",
  };
}

function buttonStyle(active) {
  return {
    background: active ? "#f5f0e8" : "rgba(255,255,255,0.04)",
    color: active ? "#14120e" : "rgba(245,240,232,0.64)",
    border: `1px solid ${active ? "rgba(212,165,74,0.45)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  };
}

function getNewsMapLayer(article) {
  const text = `${article?.title || ""} ${article?.curiosityHook || ""} ${article?.whyItMatters || ""} ${article?.tag || ""}`.toLowerCase();
  return /uranium|mine|mining|mill|enrichment|fuel|haleu|conversion|fabrication/.test(text)
    ? "uranium"
    : "reactors";
}

function inferStockMapMode(stock) {
  const text = `${stock?.sector || ""} ${stock?.desc || ""}`.toLowerCase();
  return /uranium|mine|mining|fuel|enrichment|conversion|haleu/.test(text) ? "uranium" : "reactors";
}

function inferStockTheme(stock) {
  const text = `${stock?.sector || ""} ${stock?.desc || ""}`.toLowerCase();
  if (/uranium|mine|mining/.test(text)) return "Uranium";
  if (/fuel|enrichment|haleu|conversion/.test(text)) return "Fuel Cycle";
  if (/utility/.test(text)) return "Utilities";
  if (/smr|reactor|micro/.test(text)) return "Advanced Reactors";
  return "Nuclear";
}

export default function NuclearTerminal({
  GlobeComponent,
  isMobileViewport,
  searchQuery,
  setSearchQuery,
  globeLayer,
  setGlobeLayer,
  filteredPlants,
  filteredSupplySites,
  activeGlobeItems,
  globeCountryFilter,
  setGlobeCountryFilter,
  globeReactorTypeFilter,
  setGlobeReactorTypeFilter,
  globeCountryOptions,
  globeReactorTypeOptions,
  stocks,
  stocksLoading,
  stocksError,
  onRetryStocks,
  filteredNews,
  newsLoading,
  newsError,
  newsLastUpdated,
  onRefreshNews,
  setSelectedPlant,
  setSelectedStock,
  setSelectedCountry,
  onExitTerminal,
}) {
  const [rankingMetric, setRankingMetric] = useState("capacity");
  const [stockSort, setStockSort] = useState("pct");
  const [focusEntity, setFocusEntity] = useState(null);
  const [terminalNewsTag, setTerminalNewsTag] = useState("All");
  const GlobeView = GlobeComponent;

  const stockRows = useMemo(() => {
    const rows = [...stocks];
    if (stockSort === "pct") rows.sort((a, b) => b.pct - a.pct);
    else if (stockSort === "price") rows.sort((a, b) => b.price - a.price);
    else if (stockSort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (stockSort === "theme") rows.sort((a, b) => inferStockTheme(a).localeCompare(inferStockTheme(b)));
    return rows;
  }, [stockSort, stocks]);

  const rankingRows = useMemo(() => {
    const supplyCounts = filteredSupplySites.reduce((acc, site) => {
      acc[site.country] = (acc[site.country] || 0) + 1;
      return acc;
    }, {});

    const rows = NUCLEAR_SHARE.map((country) => ({
      ...country,
      supply: supplyCounts[country.country] || 0,
    }));

    const sorted = [...rows].sort((a, b) => {
      if (rankingMetric === "capacity") return parseFloat(b.capacity) - parseFloat(a.capacity);
      if (rankingMetric === "reactors") return b.reactors - a.reactors;
      if (rankingMetric === "nuclear") return b.nuclear - a.nuclear;
      return b.supply - a.supply;
    });

    return sorted.slice(0, isMobileViewport ? 8 : 12);
  }, [filteredSupplySites, isMobileViewport, rankingMetric]);

  const newsRows = useMemo(() => {
    let rows = terminalNewsTag === "All" ? [...filteredNews] : filteredNews.filter((item) => item.tag === terminalNewsTag);

    if (focusEntity?.type === "stock") {
      const terms = [focusEntity.value.ticker, focusEntity.value.name, inferStockTheme(focusEntity.value)].map((term) => term.toLowerCase());
      const matched = rows.filter((item) => terms.some((term) => `${item.title} ${item.whyItMatters || ""} ${item.curiosityHook || ""}`.toLowerCase().includes(term)));
      if (matched.length) rows = matched;
    } else if (focusEntity?.type === "country") {
      const term = focusEntity.value.country.toLowerCase();
      const matched = rows.filter((item) => `${item.title} ${item.whyItMatters || ""} ${item.curiosityHook || ""}`.toLowerCase().includes(term));
      if (matched.length) rows = matched;
    } else if (focusEntity?.type === "plant") {
      const terms = [focusEntity.value.name, focusEntity.value.country].map((term) => term.toLowerCase());
      const matched = rows.filter((item) => terms.some((term) => `${item.title} ${item.whyItMatters || ""} ${item.curiosityHook || ""}`.toLowerCase().includes(term)));
      if (matched.length) rows = matched;
    }

    return rows.slice(0, isMobileViewport ? 6 : 8);
  }, [filteredNews, focusEntity, isMobileViewport, terminalNewsTag]);

  const focusCard = useMemo(() => {
    if (!focusEntity) {
      return {
        eyebrow: "Live context",
        title: globeLayer === "reactors" ? "Reactor intelligence workspace" : "Fuel-cycle intelligence workspace",
        body: globeLayer === "reactors"
          ? `Track ${filteredPlants.length} reactor sites with linked markets, catalysts, and country rankings.`
          : `Track ${filteredSupplySites.length} uranium and fuel-cycle sites with linked market and news context.`,
      };
    }

    if (focusEntity.type === "stock") {
      return {
        eyebrow: "Market focus",
        title: `${focusEntity.value.ticker} · ${focusEntity.value.name}`,
        body: `${inferStockTheme(focusEntity.value)} exposure. Selecting this row pivots the map and the catalyst feed toward the same theme.`,
      };
    }
    if (focusEntity.type === "plant") {
      return {
        eyebrow: "Plant focus",
        title: `${focusEntity.value.name} · ${focusEntity.value.country}`,
        body: `${focusEntity.value.capacity.toLocaleString("en-US")} MW · ${focusEntity.value.type} · ${focusEntity.value.status}. The rest of the terminal is now narrowed to this geography.`,
      };
    }
    if (focusEntity.type === "country") {
      return {
        eyebrow: "Country focus",
        title: focusEntity.value.country,
        body: `${focusEntity.value.reactors} reactors · ${focusEntity.value.capacity} installed · ${focusEntity.value.nuclear}% nuclear share.`,
      };
    }

    return {
      eyebrow: "Catalyst focus",
      title: focusEntity.value.title,
      body: focusEntity.value.whyItMatters || focusEntity.value.curiosityHook || "Selected story now drives the map and ranking context.",
    };
  }, [filteredPlants.length, filteredSupplySites.length, focusEntity, globeLayer]);

  const terminalNewsTags = ["All", "Policy", "Expansion", "Markets", "Innovation", "Safety"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #080b11 0%, #0a1018 100%)", color: "#f5f0e8" }}>
      <div style={{ borderBottom: "1px solid rgba(212,165,74,0.12)", position: "sticky", top: 0, zIndex: 110, backdropFilter: "blur(20px)", background: "rgba(8,11,17,0.88)" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", padding: isMobileViewport ? "14px 18px" : "16px 24px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={onExitTerminal} style={{ ...buttonStyle(false), color: "#f5f0e8" }}>
            Editorial View
          </button>
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Nuclear Terminal</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobileViewport ? 24 : 30, lineHeight: 1.05 }}>
              Map, markets, catalysts, and national rankings in one workspace.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "10px 14px" }}>
              <span style={{ fontSize: 13, opacity: 0.4 }}>⌘</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Command / country / plant / company"
                style={{ width: isMobileViewport ? 210 : 280, background: "none", border: "none", outline: "none", color: "#f5f0e8", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setGlobeCountryFilter("");
                setGlobeReactorTypeFilter("");
                setFocusEntity(null);
              }}
              style={buttonStyle(false)}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: isMobileViewport ? "18px" : "22px 24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.35fr) minmax(360px, 420px)", gap: 20, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ ...terminalPanelStyle(), padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Map Nexus</div>
                  <div style={{ fontSize: 14, color: "rgba(245,240,232,0.62)" }}>
                    {activeGlobeItems.length} {globeLayer === "reactors" ? "linked reactor sites" : "linked uranium/fuel-cycle sites"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setGlobeLayer("reactors")} style={buttonStyle(globeLayer === "reactors")}>Reactors</button>
                  <button type="button" onClick={() => setGlobeLayer("uranium")} style={buttonStyle(globeLayer === "uranium")}>Uranium</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Country</span>
                  <select value={globeCountryFilter} onChange={(e) => setGlobeCountryFilter(e.target.value)} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#f5f0e8", padding: "10px 12px", fontFamily: "'DM Sans',sans-serif" }}>
                    <option value="">All countries</option>
                    {globeCountryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Reactor type</span>
                  <select value={globeReactorTypeFilter} onChange={(e) => setGlobeReactorTypeFilter(e.target.value)} disabled={globeLayer !== "reactors"} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: globeLayer === "reactors" ? "#f5f0e8" : "rgba(245,240,232,0.35)", padding: "10px 12px", fontFamily: "'DM Sans',sans-serif" }}>
                    <option value="">All reactor types</option>
                    {globeReactorTypeOptions.map((reactorType) => (
                      <option key={reactorType} value={reactorType}>{reactorType}</option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(245,240,232,0.44)" }}>Linked view</span>
                  <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "10px 12px", fontSize: 13, color: "rgba(245,240,232,0.72)" }}>
                    {focusEntity ? focusEntity.type.toUpperCase() : "GLOBAL"} · {searchQuery || "All assets"}
                  </div>
                </div>
              </div>

              <div style={{ height: isMobileViewport ? 360 : 560, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #09131d 65%, #060d15 100%)" }}>
                <Suspense fallback={<div style={{ height: "100%", display: "grid", placeItems: "center", color: "rgba(245,240,232,0.38)" }}>Loading globe…</div>}>
                  <GlobeView
                    onSelectPlant={(plant) => {
                      setSelectedPlant(plant);
                      setGlobeLayer("reactors");
                      setGlobeCountryFilter(plant.country);
                      setFocusEntity({ type: "plant", value: plant });
                    }}
                    plants={activeGlobeItems}
                    mode={globeLayer}
                  />
                </Suspense>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {(globeLayer === "reactors" ? filteredPlants : filteredSupplySites).slice(0, isMobileViewport ? 5 : 6).map((item) => (
                  <button
                    key={item.id || item.name}
                    type="button"
                    onClick={() => {
                      if (globeLayer === "reactors") {
                        setSelectedPlant(item);
                        setFocusEntity({ type: "plant", value: item });
                      } else {
                        setGlobeCountryFilter(item.country);
                        setFocusEntity({ type: "site", value: item });
                      }
                    }}
                    style={{ textAlign: "left", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px", cursor: "pointer", color: "#f5f0e8" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(245,240,232,0.5)" }}>
                          {item.country} · {globeLayer === "reactors" ? item.type : item.stage}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: globeLayer === "reactors" ? (STATUS_COLORS[item.status] || "#d4a54a") : (SUPPLY_STAGE_COLORS[item.stage] || "#d4a54a"), textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                        {globeLayer === "reactors" ? item.status : item.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...terminalPanelStyle(), padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Country scoreboard</div>
                  <div style={{ fontSize: 14, color: "rgba(245,240,232,0.62)" }}>Rank countries by fleet, share, capacity, or supply relevance.</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { key: "capacity", label: "Capacity" },
                    { key: "reactors", label: "Reactors" },
                    { key: "nuclear", label: "Share" },
                    { key: "supply", label: "Supply" },
                  ].map((metric) => (
                    <button key={metric.key} type="button" onClick={() => setRankingMetric(metric.key)} style={buttonStyle(rankingMetric === metric.key)}>
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {rankingRows.map((country, index) => (
                  <button
                    key={country.country}
                    type="button"
                    onClick={() => {
                      setGlobeCountryFilter(country.country);
                      setSelectedCountry(country);
                      setFocusEntity({ type: "country", value: country });
                    }}
                    style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 12, alignItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "11px 12px", color: "#f5f0e8", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(212,165,74,0.8)" }}>{String(index + 1).padStart(2, "0")}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{country.country}</div>
                      <div style={{ fontSize: 11, color: "rgba(245,240,232,0.46)" }}>{country.reactors} reactors · {country.capacity}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#d4a54a" }}>
                      {rankingMetric === "capacity" ? country.capacity : rankingMetric === "reactors" ? `${country.reactors}` : rankingMetric === "nuclear" ? `${country.nuclear}%` : `${country.supply}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ ...terminalPanelStyle(), padding: 18 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 6 }}>{focusCard.eyebrow}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, lineHeight: 1.08, marginBottom: 10 }}>{focusCard.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(245,240,232,0.66)" }}>{focusCard.body}</div>
            </div>

            <div style={{ ...terminalPanelStyle(), padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Market watchlist</div>
                  <div style={{ fontSize: 13, color: "rgba(245,240,232,0.6)" }}>Dense nuclear watchlist with linked market themes.</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { key: "pct", label: "% Move" },
                    { key: "price", label: "Price" },
                    { key: "theme", label: "Theme" },
                    { key: "name", label: "Name" },
                  ].map((sort) => (
                    <button key={sort.key} type="button" onClick={() => setStockSort(sort.key)} style={buttonStyle(stockSort === sort.key)}>
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
              {stocksLoading ? (
                <div style={{ color: "rgba(245,240,232,0.5)" }}>Loading market panel…</div>
              ) : stocksError ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ color: "rgba(245,240,232,0.5)" }}>Market data failed to load.</div>
                  <button type="button" onClick={onRetryStocks} style={buttonStyle(false)}>Retry stocks</button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {stockRows.map((stock) => {
                    const mini = stock.history?.slice(-16) || [];
                    const theme = inferStockTheme(stock);
                    return (
                      <button
                        key={stock.ticker}
                        type="button"
                        onClick={() => {
                          setSelectedStock(stock);
                          setGlobeLayer(inferStockMapMode(stock));
                          setFocusEntity({ type: "stock", value: stock });
                        }}
                        style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) 84px", gap: 12, alignItems: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "10px 12px", color: "#f5f0e8", cursor: "pointer", textAlign: "left" }}
                      >
                        <div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#d4a54a", fontSize: 14 }}>{stock.ticker}</div>
                          <div style={{ fontSize: 10, color: "rgba(245,240,232,0.38)", marginTop: 2 }}>{theme}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                              <div style={{ fontSize: 10.5, color: "rgba(245,240,232,0.42)" }}>{stock.sector}</div>
                            </div>
                            <div style={{ height: 28, width: 92, flexShrink: 0 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mini}>
                                  <Line type="monotone" dataKey="price" stroke={stock.change >= 0 ? "#4ade80" : "#f87171"} strokeWidth={1.7} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700 }}>${stock.price.toFixed(2)}</div>
                          <div style={{ fontSize: 11, color: stock.change >= 0 ? "#4ade80" : "#f87171" }}>
                            {stock.change >= 0 ? "+" : ""}{stock.pct.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...terminalPanelStyle(), padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(212,165,74,0.78)", fontWeight: 700, marginBottom: 4 }}>Catalyst feed</div>
                  <div style={{ fontSize: 13, color: "rgba(245,240,232,0.6)" }}>
                    {newsLastUpdated ? `Updated ${newsLastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Waiting for news sync"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {terminalNewsTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setTerminalNewsTag(tag)} style={buttonStyle(terminalNewsTag === tag)}>
                      {tag}
                    </button>
                  ))}
                  <button type="button" onClick={onRefreshNews} style={buttonStyle(false)}>
                    Refresh
                  </button>
                </div>
              </div>
              {newsLoading ? (
                <div style={{ color: "rgba(245,240,232,0.5)" }}>Loading catalyst feed…</div>
              ) : newsError && newsRows.length === 0 ? (
                <div style={{ color: "rgba(245,240,232,0.5)" }}>Live feeds unavailable. Curated fallback should appear here after refresh.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {newsRows.map((item) => {
                    const inferredLocation = inferNewsLocation(item);
                    return (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => {
                          if (inferredLocation) {
                            setSearchQuery(inferredLocation);
                            setGlobeLayer(getNewsMapLayer(item));
                          }
                          setFocusEntity({ type: "news", value: item });
                        }}
                        style={{ textAlign: "left", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: "12px 13px", color: "#f5f0e8", cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d4a54a", fontWeight: 700 }}>{item.tag}</span>
                          <span style={{ fontSize: 10.5, color: "rgba(245,240,232,0.38)" }}>{item.date}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(245,240,232,0.6)" }}>{item.whyItMatters || item.curiosityHook}</div>
                        <div style={{ marginTop: 8, fontSize: 10.5, color: "rgba(245,240,232,0.38)" }}>
                          {item.source}{inferredLocation ? ` · focus ${inferredLocation}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
