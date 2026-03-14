import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
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

export default function SearchOverlay({ query, plants, news, stocks, onSelectPlant, onSelectStock, onSelectCountry, onClose }) {
  const [cursor, setCursor] = useState(-1);
  const overlayRef = useRef(null);

  const q = query.trim().toLowerCase();

  const plantResults = useMemo(() => {
    if (!q) return [];
    return plants
      .filter((plant) => plant.name.toLowerCase().includes(q) || plant.country.toLowerCase().includes(q) || plant.type.toLowerCase().includes(q))
      .slice(0, 5);
  }, [q, plants]);

  const stockResults = useMemo(() => {
    if (!q) return [];
    return stocks
      .filter((stock) => stock.ticker.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q) || (stock.sector || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, stocks]);

  const newsResults = useMemo(() => {
    if (!q) return [];
    return news
      .filter((item) => item.title.toLowerCase().includes(q) || (item.source || "").toLowerCase().includes(q) || (item.tag || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, news]);

  const countryResults = useMemo(() => {
    if (!q) return [];
    return NUCLEAR_SHARE
      .filter((country) => country.country.toLowerCase().includes(q))
      .slice(0, 3);
  }, [q]);

  const allResults = useMemo(() => [
    ...plantResults.map((result) => ({ type: "plant", data: result })),
    ...stockResults.map((result) => ({ type: "stock", data: result })),
    ...newsResults.map((result) => ({ type: "news", data: result })),
    ...countryResults.map((result) => ({ type: "country", data: result })),
  ], [plantResults, stockResults, newsResults, countryResults]);

  const totalCount = allResults.length;

  useEffect(() => {
    setCursor(-1);
  }, [q]);

  const handleSelect = useCallback((item) => {
    if (item.type === "plant") {
      onSelectPlant(item.data);
      onClose();
    }
    if (item.type === "stock") {
      onSelectStock(item.data);
      onClose();
    }
    if (item.type === "news") {
      window.open(item.data.url, "_blank", "noopener,noreferrer");
      onClose();
    }
    if (item.type === "country") {
      onSelectCountry(item.data.country);
      onClose();
    }
  }, [onClose, onSelectCountry, onSelectPlant, onSelectStock]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((current) => Math.min(current + 1, totalCount - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((current) => Math.max(current - 1, -1));
      }
      if (event.key === "Enter" && cursor >= 0) {
        event.preventDefault();
        const item = allResults[cursor];
        if (!item) return;
        handleSelect(item);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allResults, cursor, handleSelect, onClose, totalCount]);

  useEffect(() => {
    if (cursor >= 0 && overlayRef.current) {
      const element = overlayRef.current.querySelector(`[data-idx="${cursor}"]`);
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  let globalIdx = 0;

  const sections = [
    { key: "plant", label: "Plants", results: plantResults, prefix: "Plant" },
    { key: "stock", label: "Stocks", results: stockResults, prefix: "Market" },
    { key: "news", label: "News", results: newsResults, prefix: "News" },
    { key: "country", label: "Countries", results: countryResults, prefix: "Map" },
  ].filter((section) => section.results.length > 0);

  if (!q || totalCount === 0) return null;

  return (
    <motion.div
      aria-label="Search results"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      ref={overlayRef}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "min(480px, calc(100vw - 32px))",
        maxHeight: 520,
        overflowY: "auto",
        background: "var(--np-surface)",
        border: "1px solid var(--np-border-strong)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        zIndex: 200,
      }}
    >
      {sections.map((section) => (
        <div key={section.key}>
          <div
            style={{
              padding: "10px 16px 6px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--np-text-faint)",
              borderBottom: "1px solid var(--np-border)",
            }}
          >
            {section.prefix} {section.label}
          </div>

          {section.results.map((result) => {
            const myIdx = globalIdx++;
            const isActive = cursor === myIdx;

            if (section.key === "plant") {
              const plant = result;
              return (
                <button
                  type="button"
                  key={plant.name}
                  data-idx={myIdx}
                  onClick={() => handleSelect({ type: "plant", data: plant })}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                    width: "100%",
                    border: "none",
                    textAlign: "left",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--np-text)" }}>{highlight(plant.name, query)}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{highlight(plant.country, query)} | {plant.type}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600 }}>{plant.capacity.toLocaleString()} MW</div>
                    <div style={{ fontSize: 10, color: STATUS_COLORS[plant.status] || STATUS_COLORS.Idle }}>* {plant.status}</div>
                  </div>
                </button>
              );
            }

            if (section.key === "stock") {
              const stock = result;
              const isUp = (stock.pct || 0) >= 0;
              return (
                <button
                  type="button"
                  key={stock.ticker}
                  data-idx={myIdx}
                  onClick={() => handleSelect({ type: "stock", data: stock })}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                    width: "100%",
                    border: "none",
                    textAlign: "left",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14, color: "#d4a54a" }}>{highlight(stock.ticker, query)}</div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{highlight(stock.name, query)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    {stock.price > 0 && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600 }}>${stock.price.toFixed(2)}</div>}
                    {stock.pct !== undefined && <div style={{ fontSize: 11, color: isUp ? "#4ade80" : "#f87171" }}>{isUp ? "+" : ""}{stock.pct.toFixed(2)}%</div>}
                  </div>
                </button>
              );
            }

            if (section.key === "news") {
              const item = result;
              return (
                <a
                  key={item.url || item.title}
                  data-idx={myIdx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { onClose(); }}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: "var(--np-text)",
                        lineHeight: 1.35,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {highlight(item.title, query)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 3 }}>{item.source} | {item.date}</div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#d4a54a",
                      background: "rgba(212,165,74,0.1)",
                      borderRadius: 6,
                      padding: "3px 7px",
                      marginTop: 2,
                    }}
                  >
                    {item.tag}
                  </span>
                </a>
              );
            }

            if (section.key === "country") {
              const country = result;
              return (
                <button
                  type="button"
                  key={country.country}
                  data-idx={myIdx}
                  onClick={() => handleSelect({ type: "country", data: country })}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isActive ? "rgba(212,165,74,0.08)" : "transparent",
                    transition: "background 0.1s",
                    width: "100%",
                    border: "none",
                    textAlign: "left",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                  onMouseEnter={() => setCursor(myIdx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{country.flag}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{highlight(country.country, query)}</div>
                      <div style={{ fontSize: 11, color: "var(--np-text-muted)", marginTop: 1 }}>{country.reactors} reactors | {country.capacity}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#d4a54a" }}>
                    {country.nuclear}%
                  </div>
                </button>
              );
            }

            return null;
          })}
        </div>
      ))}

      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid var(--np-border)",
          fontSize: 10,
          color: "var(--np-text-faint)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{totalCount} result{totalCount !== 1 ? "s" : ""} across all sections</span>
        <span style={{ opacity: 0.5 }}>Up/down navigate | Enter select | Esc close</span>
      </div>
    </motion.div>
  );
}
