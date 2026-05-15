import { useEffect, useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
} from "./styles.js";

const TYPE_LABELS = {
  price_drop: "Price ≤",
  price_rise: "Price ≥",
  percent_drop: "% drop ≥",
  percent_rise: "% rise ≥",
  entity_event: "Event",
};

function unitFor(type) {
  if (type === "price_drop" || type === "price_rise") return "$";
  if (type === "percent_drop" || type === "percent_rise") return "%";
  return "";
}

function AlertForm({ initialTargetId = "", initialTargetLabel = "", onCancel, onSubmit }) {
  const [alertType, setAlertType] = useState("percent_drop");
  const [targetId, setTargetId] = useState(initialTargetId);
  const [targetLabel, setTargetLabel] = useState(initialTargetLabel);
  const [threshold, setThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEvent = alertType === "entity_event";

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!targetId.trim() || !targetLabel.trim()) {
      setError("Target is required.");
      return;
    }
    if (!isEvent && !Number.isFinite(Number(threshold))) {
      setError("Threshold must be a number.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        alert_type: alertType,
        target_id: targetId.trim(),
        target_label: targetLabel.trim(),
        threshold: isEvent ? null : Number(threshold),
      });
    } catch (err) {
      setError(err?.message || "Failed to create alert.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid var(--np-terminal-border)",
    borderRadius: 3,
    padding: "6px 8px",
    color: "var(--np-terminal-text)",
    fontSize: 12,
    fontFamily: "'DM Mono','SFMono-Regular',Menlo,monospace",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, padding: "10px 12px 12px" }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--np-terminal-muted)" }}>Target</span>
        <input
          value={targetLabel}
          onChange={(e) => setTargetLabel(e.target.value)}
          placeholder="e.g. CCJ — Cameco"
          style={inputStyle}
        />
        <input
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="target_id (ticker / entity id)"
          style={{ ...inputStyle, fontSize: 11, opacity: 0.85 }}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--np-terminal-muted)" }}>Type</span>
        <select value={alertType} onChange={(e) => setAlertType(e.target.value)} style={inputStyle}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      {!isEvent ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--np-terminal-muted)" }}>
            Threshold ({unitFor(alertType)})
          </span>
          <input
            type="number"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={alertType.startsWith("percent_") ? "e.g. 5" : "e.g. 42.50"}
            style={inputStyle}
          />
        </label>
      ) : null}
      {error ? (
        <div style={{ fontSize: 11, color: "var(--np-terminal-red)" }}>{error}</div>
      ) : null}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} className="np-terminal-button" style={{
          background: "transparent", border: "1px solid var(--np-terminal-border)", color: "var(--np-terminal-muted)",
          padding: "5px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer",
        }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="np-terminal-button" style={{
          background: "var(--np-terminal-amber)", border: "none", color: "#111",
          padding: "5px 10px", borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: "pointer",
          opacity: submitting ? 0.6 : 1,
        }}>
          {submitting ? "Saving…" : "Save alert"}
        </button>
      </div>
    </form>
  );
}

export default function AlertsPanel() {
  const { alerts = [], alertsLoading, alertsError, createAlert, deleteAlert, refreshAlerts } = useTerminal();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    refreshAlerts?.();
  }, [refreshAlerts]);

  const sortedAlerts = useMemo(() => [...alerts].sort((a, b) => {
    const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  }), [alerts]);

  return (
    <TerminalPanel
      panelId="terminal-panel-alerts"
      title="Alerts"
      subtitle="Price + event triggers — fire by email."
      actions={[
        <span key="count" style={terminalTagStyle({ tone: "amber", compact: true })}>
          {sortedAlerts.length} active
        </span>,
        <button
          key="add"
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="np-terminal-button"
          style={{
            background: "transparent",
            border: "1px solid var(--np-terminal-border)",
            color: "var(--np-terminal-amber)",
            padding: "3px 8px",
            borderRadius: 3,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {formOpen ? "Close" : "+ Add"}
        </button>,
      ]}
    >
      {formOpen ? (
        <AlertForm
          onCancel={() => setFormOpen(false)}
          onSubmit={async (payload) => {
            await createAlert(payload);
            setFormOpen(false);
          }}
        />
      ) : null}

      <div style={{ display: "grid", gap: 6 }}>
        {alertsError ? (
          <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--np-terminal-red)" }}>{alertsError}</div>
        ) : null}
        {sortedAlerts.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11.5, lineHeight: 1.55, ...terminalMutedStyle() }}>
            {alertsLoading ? "Loading alerts…" : "No alerts yet — add one to get an email when prices or events fire."}
          </div>
        ) : (
          <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(240), padding: "0 10px" }}>
            {sortedAlerts.map((row) => (
              <div
                key={row.id}
                className="np-terminal-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto 22px",
                  gap: 10,
                  alignItems: "center",
                  borderTop: "1px solid var(--np-terminal-border)",
                  padding: "6px 0",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--np-terminal-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.target_label}>
                    {row.target_label}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--np-terminal-muted)", fontFamily: "'DM Mono',monospace" }}>
                    {TYPE_LABELS[row.alert_type] || row.alert_type}
                    {row.threshold != null ? ` ${row.threshold}${unitFor(row.alert_type)}` : ""}
                    {row.fire_count ? ` · fired ${row.fire_count}×` : ""}
                  </div>
                </div>
                <span style={terminalTagStyle({ tone: row.active ? "success" : "muted", compact: true })}>
                  {row.active ? "on" : "off"}
                </span>
                <button
                  type="button"
                  onClick={() => deleteAlert(row.id)}
                  className="np-terminal-button"
                  style={{
                    appearance: "none",
                    background: "transparent",
                    border: "none",
                    color: "var(--np-terminal-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                    width: 18,
                    height: 18,
                  }}
                  aria-label={`Remove ${row.target_label} alert`}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TerminalPanel>
  );
}
