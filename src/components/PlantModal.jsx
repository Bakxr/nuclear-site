import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { fetchPlantImage, getOSMTiles, normalizeReactorType } from "../services/plantAPI.js";
import { REACTOR_TYPES, STATUS_COLORS } from "../data/constants.js";
import ReactorDiagram from "./reactorDiagrams/index.jsx";
import Reactor3D from "./reactorDiagrams/Reactor3D.jsx";

export default function PlantModal({ plant, onClose }) {
  if (!plant) return null;

  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [reactorView, setReactorView] = useState("3d");

  const normalizedType = useMemo(() => normalizeReactorType(plant.type), [plant.type]);
  const reactorInfo = useMemo(
    () => REACTOR_TYPES.find(r => r.type === normalizedType),
    [normalizedType]
  );
  const annualTWh = useMemo(() => (plant.capacity * 8760 * 0.9 / 1e6).toFixed(1), [plant.capacity]);
  const co2Avoided = useMemo(() => (annualTWh * 0.42).toFixed(1), [annualTWh]);
  const homesPerYear = Math.round(plant.capacity * 8760 * 0.9 / 10000);
  const osmData = useMemo(() => getOSMTiles(plant.lat, plant.lng, 11), [plant.lat, plant.lng]);

  useEffect(() => {
    let cancelled = false;
    setImageLoading(true);
    setImageUrl(null);
    setImgLoaded(false);
    fetchPlantImage(plant.name).then(url => {
      if (!cancelled) {
        setImageUrl(url);
        setImageLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [plant.name]);

  const statusColor = STATUS_COLORS[plant.status] || "#64748b";

  const infoCards = [
    { label: "Net Capacity", val: `${plant.capacity.toLocaleString()} MW` },
    { label: "Reactor Type", val: plant.type },
    { label: "Reactors", val: plant.reactors },
    { label: "Annual Output", val: `~${annualTWh} TWh`, sub: "at 90% capacity factor" },
    { label: "Est. Homes Powered", val: `~${homesPerYear.toLocaleString()}k`, sub: "per year" },
    { label: "CO\u2082 Avoided", val: `~${co2Avoided} Mt`, sub: "vs. gas generation" },
  ];

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(14,12,10,0.7)", backdropFilter: "blur(12px)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          background: "var(--np-bg)", borderRadius: 20, maxWidth: 780, width: "100%",
          position: "relative", border: "1px solid rgba(212,165,74,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.15)", overflow: "hidden",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* === HERO PHOTO === */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#1e1912", flexShrink: 0, overflow: "hidden" }}>
          {/* Loading skeleton */}
          {imageLoading && (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, #2a241c 0%, #3a342a 50%, #2a241c 100%)",
              backgroundSize: "200% 200%",
              animation: "shimmer 1.5s ease infinite",
            }} />
          )}

          {/* Wikipedia image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={plant.name}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s ease",
              }}
            />
          )}

          {/* Fallback gradient when no image */}
          {!imageLoading && !imageUrl && (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, #1e1912 0%, #2a241c 40%, #3a342a 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#d4a54a" strokeWidth="2" />
                <circle cx="32" cy="32" r="6" fill="#d4a54a" />
                <ellipse cx="32" cy="32" rx="18" ry="6" fill="none" stroke="#d4a54a" strokeWidth="1.5" transform="rotate(0 32 32)" />
                <ellipse cx="32" cy="32" rx="18" ry="6" fill="none" stroke="#d4a54a" strokeWidth="1.5" transform="rotate(60 32 32)" />
                <ellipse cx="32" cy="32" rx="18" ry="6" fill="none" stroke="#d4a54a" strokeWidth="1.5" transform="rotate(120 32 32)" />
              </svg>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(transparent, rgba(14,12,10,0.85))",
          }} />

          {/* Plant name overlaid */}
          <div style={{ position: "absolute", bottom: 16, left: 24, right: 60, zIndex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a54a", fontWeight: 700, marginBottom: 4 }}>
              Nuclear Power Station
            </div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 500, margin: 0, color: "#fff", lineHeight: 1.15 }}>
              {plant.name}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{plant.country}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
                borderRadius: 20, fontSize: 11, fontWeight: 600, color: statusColor,
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
                {plant.status}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12, width: 36, height: 36,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            border: "none", borderRadius: "50%", fontSize: 22, cursor: "pointer",
            color: "rgba(255,255,255,0.9)", lineHeight: 1, display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 2,
          }}>
            &times;
          </button>
        </div>

        {/* === SCROLLABLE BODY === */}
        <div className="np-plant-modal-body" style={{ overflowY: "auto", padding: "24px 28px 20px", flex: 1 }}>

          {/* Data grid + Map row */}
          <div className="np-plant-modal-body-grid" style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20, marginBottom: 24 }}>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {infoCards.map((item, i) => (
                <div key={i} style={{ background: "var(--np-surface-dim)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--np-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 600, color: "var(--np-text)" }}>{item.val}</div>
                  {item.sub && <div style={{ fontSize: 10, color: "var(--np-text-faint)", marginTop: 2 }}>{item.sub}</div>}
                </div>
              ))}
            </div>

            {/* Mini map */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--np-border-strong)", position: "relative", background: "var(--np-containment-bg)" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)",
                width: "100%", height: 180,
              }}>
                {osmData.tiles.map((tile, i) => (
                  <img
                    key={i}
                    src={tile.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { e.target.style.visibility = "hidden"; }}
                  />
                ))}
              </div>
              {/* Pin marker */}
              <div style={{
                position: "absolute",
                left: `${(osmData.pinX / 3) * 100}%`,
                top: `${(osmData.pinY / 3) * 100 * (180 / 180)}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
              }}>
                <svg width="18" height="24" viewBox="0 0 18 24">
                  <path d="M9,0 C4,0 0,4 0,9 C0,15 9,24 9,24 C9,24 18,15 18,9 C18,4 14,0 9,0 Z" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="9" cy="9" r="3.5" fill="#fff" />
                </svg>
              </div>
              {/* Coordinates + attribution */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "var(--np-nav-bg)", padding: "5px 8px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--np-text-muted)" }}>
                  {plant.lat.toFixed(2)}&deg;, {plant.lng.toFixed(2)}&deg;
                </span>
                <span style={{ fontSize: 8, color: "var(--np-text-faint)" }}>&copy; OpenStreetMap</span>
              </div>
            </div>
          </div>

          {/* === REACTOR VIEWER === */}
          <div style={{ background: "var(--np-surface-dim)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
            {/* Header + tab switcher */}
            <div className="np-reactor-header" style={{ padding: "16px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 500, margin: "0 0 3px", color: "var(--np-text)" }}>
                  How a <em style={{ color: "var(--np-text-muted)" }}>{normalizedType}</em> Works
                </h4>
                {reactorInfo && <p style={{ fontSize: 13, color: "var(--np-text-muted)", margin: 0, lineHeight: 1.5 }}>{reactorInfo.desc}</p>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 16 }}>
                {[{ key: "3d", label: "3D Model" }, { key: "schematic", label: "Schematic" }].map(tab => (
                  <button key={tab.key} onClick={() => setReactorView(tab.key)} style={{
                    background: reactorView === tab.key ? "var(--np-text)" : "transparent",
                    color: reactorView === tab.key ? "var(--np-bg)" : "var(--np-text-muted)",
                    border: "1px solid " + (reactorView === tab.key ? "var(--np-text)" : "var(--np-border)"),
                    borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                  }}>{tab.label}</button>
                ))}
              </div>
            </div>
            {/* View */}
            {reactorView === "3d"
              ? <Reactor3D type={normalizedType} />
              : <div style={{ padding: "0 20px 16px" }}><ReactorDiagram type={normalizedType} width={680} /></div>
            }
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
            {imageUrl && (
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(plant.name.replace(/\s+/g, "_"))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#d4a54a", textDecoration: "none", fontWeight: 600 }}
              >
                View on Wikipedia &rarr;
              </a>
            )}
            <span style={{ fontSize: 10, color: "var(--np-text-faint)", marginLeft: "auto" }}>Data sourced from IAEA PRIS</span>
          </div>
        </div>

        {/* Shimmer animation */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
}
