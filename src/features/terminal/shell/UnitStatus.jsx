import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";

function powerTone(pct) {
  if (pct >= 95) return "up";
  if (pct > 0) return "gold";
  return "down";
}

// NRC daily power reactor status. Exceptions (derated / offline units) lead,
// since a fleet running at 100% is the unremarkable case.
export default function UnitStatus() {
  const { operationsRows, selectEntity, getEntityById } = useTerminal();
  const rows = [...operationsRows].sort((a, b) => (a.powerPct ?? 100) - (b.powerPct ?? 100));
  const exceptions = rows.filter((row) => row.powerPct < 100);

  const select = (signal) => {
    const plant = signal.plantId ? getEntityById(signal.plantId) : null;
    selectEntity(plant || signal);
  };

  return (
    <TerminalPanel
      panelId="terminal-panel-units"
      title="US unit status"
      count={`${exceptions.length} of ${rows.length} below 100%`}
      subtitle="Daily power level by reactor unit from the NRC Power Reactor Status Report."
      bodyStyle={{ padding: "6px 0 0" }}
    >
      {rows.length === 0 ? (
        <div className="npt-empty"><strong>NRC feed unavailable</strong>Unit power levels will appear on the next refresh.</div>
      ) : (
        <table className="npt-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Power</th>
              <th className="r">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((signal) => {
              const tone = powerTone(signal.powerPct);
              return (
                <tr key={signal.id} onClick={() => select(signal)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") select(signal); }}>
                  <td style={{ whiteSpace: "normal" }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{signal.name}</span>
                    <span className="npt-subline" style={{ maxWidth: 220 }}>{signal.status}</span>
                  </td>
                  <td style={{ width: "38%" }}>
                    <span className="npt-meter" style={{ display: "block" }} aria-hidden="true">
                      <i style={{ width: `${Math.max(2, signal.powerPct)}%`, background: `var(--np-terminal-${tone === "up" ? "green" : tone === "gold" ? "amber" : "red"})` }} />
                    </span>
                  </td>
                  <td className={`r npt-num npt-${tone}`}>{signal.powerPct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </TerminalPanel>
  );
}
