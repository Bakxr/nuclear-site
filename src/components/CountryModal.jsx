import { motion } from "framer-motion";
import { useMemo } from "react";
import { COUNTRY_PROFILES } from "../data/countryProfiles.js";
import { NUCLEAR_PLANTS } from "../data/plants.js";
import { NUCLEAR_SHARE, STATUS_COLORS } from "../data/constants.js";

export default function CountryModal({ country, onClose, onSelectPlant }) {
  if (!country) return null;

  const profile = COUNTRY_PROFILES[country];
  const shareData = NUCLEAR_SHARE.find(c => c.country === country);
  const plants = useMemo(
    () => NUCLEAR_PLANTS.filter(p => p.country === country),
    [country]
  );

  if (!profile || !shareData) return null;

  const operatingCount = plants.filter(p => p.status === "Operating").length;
  const totalCapacity = plants.reduce((sum, p) => sum + p.capacity, 0);

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
          background: "var(--np-bg)", borderRadius: 20, maxWidth: 720, width: "100%",
          position: "relative", border: "1px solid rgba(212,165,74,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.15)", overflow: "hidden",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "28px 28px 20px", borderBottom: "1px solid var(--np-border)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 36 }}>{shareData.flag}</span>
              <div>
                <h3 style={{
                  fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 500,
                  margin: 0, color: "var(--np-text)", lineHeight: 1.1,
                }}>{country}</h3>
                <span style={{ fontSize: 12, color: "var(--np-text-muted)", fontWeight: 600 }}>
                  {shareData.nuclear}% nuclear electricity
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--np-surface-dim)", border: "none", borderRadius: "50%",
            width: 36, height: 36, fontSize: 20, cursor: "pointer",
            color: "var(--np-text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "20px 28px 24px", flex: 1 }}>

          {/* 4-stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            {profile.keyFacts.map((fact, i) => (
              <div key={i} style={{
                background: "var(--np-surface-dim)", borderRadius: 10, padding: "12px 14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "var(--np-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{fact.label}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600, color: "var(--np-text)" }}>{fact.value}</div>
              </div>
            ))}
          </div>

          {/* Overview */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-accent)", marginBottom: 8 }}>Overview</h4>
            <p style={{ fontSize: 14, color: "var(--np-text)", lineHeight: 1.65, margin: 0 }}>{profile.summary}</p>
          </div>

          {/* Policy callout */}
          <div style={{
            padding: "16px 18px", borderRadius: 10, marginBottom: 20,
            borderLeft: "3px solid var(--np-accent)", background: "rgba(212,165,74,0.06)",
          }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-accent)", marginBottom: 6 }}>Policy</h4>
            <p style={{ fontSize: 13, color: "var(--np-text)", lineHeight: 1.6, margin: 0 }}>{profile.policy}</p>
          </div>

          {/* Future plans */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-accent)", marginBottom: 8 }}>Future Plans</h4>
            <p style={{ fontSize: 14, color: "var(--np-text)", lineHeight: 1.65, margin: 0 }}>{profile.futurePlans}</p>
          </div>

          {/* Plants list */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--np-accent)", marginBottom: 12 }}>
              Nuclear Plants ({plants.length})
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {plants.map((p, i) => (
                <span
                  key={i}
                  onClick={() => {
                    onClose();
                    setTimeout(() => onSelectPlant(p), 200);
                  }}
                  style={{
                    background: "var(--np-surface-dim)", border: "1px solid var(--np-card-border)",
                    borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                    transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6,
                    color: "var(--np-text)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,165,74,0.3)"; e.currentTarget.style.background = "rgba(212,165,74,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--np-card-border)"; e.currentTarget.style.background = "var(--np-surface-dim)"; }}
                >
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: "var(--np-text-muted)", fontSize: 11 }}>{p.capacity.toLocaleString()} MW</span>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: STATUS_COLORS[p.status] || STATUS_COLORS.Idle,
                  }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
