import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { terminalButtonStyle, terminalDataRowStyle, terminalScrollAreaStyle } from "./styles.js";

export default function MarketMonitorPanel({ onOpenStock }) {
  const { marketRows, state, setMarketSort, selectEntity, toggleWatch, watchedSet } = useTerminal();
  const actions = [
    { key: "pct", label: "% move" },
    { key: "price", label: "Price" },
    { key: "theme", label: "Theme" },
    { key: "name", label: "Name" },
  ];

  return (
    <TerminalPanel
      title="Market monitor"
      subtitle="Delayed nuclear watchlist linked to fleets, fuel-cycle exposures, and current catalyst focus."
      actions={actions.map((sort) => (
        <button key={sort.key} type="button" onClick={() => setMarketSort(sort.key)} style={terminalButtonStyle(state.marketSort === sort.key)}>
          {sort.label}
        </button>
      ))}
    >
      <div style={terminalScrollAreaStyle(360)}>
        {marketRows.slice(0, 12).map((stock) => {
          const mini = stock.history?.slice(-16) || [];
          const targetId = stock.company?.id || stock.id;
          return (
            <div key={stock.id} style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 92px auto", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} style={{ background: "none", border: "none", color: "#f5f0e8", textAlign: "left", cursor: "pointer", padding: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#d4a54a", fontSize: 14 }}>{stock.ticker}</div>
                <div style={{ fontSize: 10, color: "rgba(245,240,232,0.38)", marginTop: 2 }}>{stock.theme}</div>
              </button>
              <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} style={{ background: "none", border: "none", color: "#f5f0e8", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                <div style={{ fontSize: 10.5, color: "rgba(245,240,232,0.42)" }}>{stock.sector}</div>
              </button>
              <div style={{ height: 28, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mini}>
                    <Line type="monotone" dataKey="price" stroke={stock.change >= 0 ? "#4ade80" : "#f87171"} strokeWidth={1.7} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700 }}>${(stock.price || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: stock.change >= 0 ? "#4ade80" : "#f87171" }}>
                    {stock.change >= 0 ? "+" : ""}{(stock.pct || 0).toFixed(2)}%
                  </div>
                </div>
                <button type="button" onClick={() => toggleWatch(targetId)} style={{ ...terminalButtonStyle(false), padding: "7px 10px" }}>
                  {watchedSet.has(targetId) ? "Starred" : "Star"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </TerminalPanel>
  );
}
