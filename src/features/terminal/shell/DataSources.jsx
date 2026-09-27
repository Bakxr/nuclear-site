import { useMemo } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import { getSourceStatus } from "./sourceStatus.js";
import { fmtAgo } from "./format.js";

const STATE_LABEL = { live: "Live", stale: "Delayed", empty: "No data" };
const STATE_TONE = { live: "up", stale: "gold", empty: undefined };

export default function DataSources() {
  const { snapshot } = useTerminal();
  const rows = useMemo(() => getSourceStatus(snapshot), [snapshot]);
  const live = rows.filter((row) => row.state === "live").length;

  return (
    <TerminalPanel
      panelId="terminal-panel-sources"
      title="Data sources"
      count={`${live}/${rows.length} live`}
      subtitle="Every feed behind the terminal, with what it delivered in the current snapshot."
      bodyStyle={{ padding: "6px 0 0" }}
    >
      <table className="npt-table">
        <thead>
          <tr>
            <th>Feed</th>
            <th className="r">Items</th>
            <th className="r">Updated</th>
            <th className="r">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} style={{ cursor: row.url ? "pointer" : "default" }} onClick={row.url ? () => window.open(row.url, "_blank", "noopener,noreferrer") : undefined}>
              <td style={{ whiteSpace: "normal" }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{row.label}</span>
                <span className="npt-subline" style={{ maxWidth: 240 }}>{row.source}{row.baseline ? " · reference" : ""}</span>
              </td>
              <td className="r npt-num npt-muted">{row.count ?? "—"}</td>
              <td className="r npt-num npt-subtle">{fmtAgo(row.updatedAt)}</td>
              <td className="r"><span className="npt-chip" data-tone={STATE_TONE[row.state]}>{STATE_LABEL[row.state]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TerminalPanel>
  );
}
