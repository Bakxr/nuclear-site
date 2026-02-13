import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NUCLEAR_SHARE, STATUS_COLORS } from "../data/constants.js";

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(212,165,74,0.3)", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchOverlay({ query, plants, news, stocks, onSelectPlant, onSelectStock, onSelectCountry, onClose, scrollTo }) {
  const [cursor, setCursor] = useState(-1);
  const overlayRef = useRef(null);

  const q = query.trim().toLowerCase();

  const plantResults = useMemo(() => {
    if (!q) return [];
    return plants
      .filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      .slice(0, 5);
  }, [q, plants]);

  const stockResults = useMemo(() => {
    if (!q) return [];
    return stocks
      .filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.sector || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, stocks]);

  const newsResults = useMemo(() => {
    if (!q) return [];
    return news
      .filter(n => n.title.toLowerCase().includes(q) || (n.source || "").toLowerCase().includes(q) || (n.tag || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, news]);

  const countryResults = useMemo(() => {
    if (!q) return [];
    return NUCLEAR_SHARE
      .filter(c => c.country.toLowerCase().includes(q))
      .slice(0, 3);
  }, [q]);

  // Flat list of all results for keyboard navigation
  const allResults = useMemo(() => [
    ...plantResults.map(r => ({ type: "plant", data: r })),
    ...stockResults.map(r => ({ type: "stock", data: r })),
    ...newsResults.map(r => ({ type: "news", data: r })),
    ...countryResults.map(r => ({ type: "country", data: r })),
  ], [plantResults, stockResults, newsResults, countryResults]);

  const totalCount = allResults.length;

  // Reset cursor when results change
  useEffect(() => { setCursor(-1); }, [q]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, totalCount - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
      if (e.key === "Enter" && cursor >= 0) {
        e.preventDefault();
        const item = allResults[cursor];
        if (!item) return;
        handleSelect(item);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cursor, allResults, totalCount]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (cursor >= 0 && overlayRef.current) {
      const el = overlayRef.current.querySelector(`[data-idx="${cursor}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  function handleSelect(item) {
    if (item.type === "plant") { onSelectPlant(item.data); onClose(); }
    if (item.type === "stock") { onSelectStock(item.data); onClose(); }
    if (item.type === "news") { window.open(item.data.url, "_blank", "noopener,noreferrer"); onClose(); }
    if (item.type === "country") { onSelectCountry(item.data.country); onClose(); }
  }

  let globalIdx = 0;

  const sections = [
    { key: "plant", label: "Plants", results: plantResults, icon: "⚡" },
    { key: "stock", label: "Stocks", results: stockResults, icon: "📈" },
    { key: "news",  label: "News",   results: newsResults,  icon: "📰" },
    { key: "country", label: "Countries", results: countryResults, icon: "🌍" },
  ].filter(s => s.results.length > 0);

  if (!q || totalCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      ref={overlayRef}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        width: 480, maxHeight: 520, overflowY: "auto",
        background: "var(--np-surface)", border: "1px solid var(--np-border-strong)",
        borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        zIndex: 200,
      }}
    >
      {sections.map(section => (
        <div key={section.key}>
          {/* Section header */}
          <div style={{
            padding: "10px 16px 6px",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "var(--np-text-faint)",
            borderBottom: "1px solid var(--np-border)",
          }}>
            {section.icon} {section.label}
          </div>

          {section.results.map(result => {
            const myIdx = globalIdx++;
            const isActive = cursor === myIdx;

            if (section.key === "plant") {
              const p = result;
              return (
                <div key={p.name} data-idx={myIdx} onClick={() => handleSelect({ type: "plant", data: p })}
                  style={{
                    padding: "10px 16px", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--np-text)" }}>{highlight(p.name, query)}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{highlight(p.country, query)} · {p.type}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600 }}>{p.capacity.toLocaleString()} MW</div>
                    <div style={{ fontSize: 10, color: STATUS_COLORS[p.status] || STATUS_COLORS.Idle }}>● {p.status}</div>
                  </div>
                </div>
              );
            }

            if (section.key === "stock") {
              const s = result;
              const isUp = (s.pct || 0) >= 0;
              return (
                <div key={s.ticker} data-idx={myIdx} onClick={() => handleSelect({ type: "stock", data: s })}
                  style={{
                    padding: "10px 16px", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14, color: "#d4a54a" }}>{highlight(s.ticker, query)}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{highlight(s.name, query)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    {s.price > 0 && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600 }}>${s.price.toFixed(2)}</div>}
                    {s.pct !== undefined && <div style={{ fontSize: 11, color: isUp ? "#4ade80" : "#f87171" }}>{isUp ? "+" : ""}{s.pct.toFixed(2)}%</div>}
                  </div>
                </div>
              );
            }

            if (section.key === "news") {
              const n = result;
              return (
                <a key={n.url || n.title} data-idx={myIdx} href={n.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => { onClose(); }}
                  style={{
                    padding: "10px 16px", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "flex-start", gap: 10,
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s", textDecoration: "none", color: "inherit",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500, fontSize: 13, color: "var(--np-text)", lineHeight: 1.35,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>{highlight(n.title, query)}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 3 }}>{n.source} · {n.date}</div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#d4a54a", background: "rgba(212,165,74,0.1)",
                    borderRadius: 6, padding: "3px 7px", marginTop: 2,
                  }}>{n.tag}</span>
                </a>
              );
            }

            if (section.key === "country") {
              const c = result;
              return (
                <div key={c.country} data-idx={myIdx} onClick={() => handleSelect({ type: "country", data: c })}
                  style={{
                    padding: "10px 16px", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{c.flag}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{highlight(c.country, query)}</div>
                      <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{c.reactors} reactors · {c.capacity}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#d4a54a" }}>
                    {c.nuclear}%
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid var(--np-border)",
        fontSize: 10, color: "var(--np-text-faint)", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{totalCount} result{totalCount !== 1 ? "s" : ""} across all sections</span>
        <span style={{ opacity: 0.5 }}>↑↓ navigate · ↵ select · esc close</span>
      </div>
    </motion.div>
  );
}
