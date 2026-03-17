import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalLabelStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

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
        <button key={sort.key} type="button" onClick={() => setMarketSort(sort.key)} className="np-terminal-button" style={terminalButtonStyle(state.marketSort === sort.key)}>
          {sort.label}
        </button>
      ))}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 92px auto", gap: 12, paddingBottom: 8, borderBottom: "1px solid rgba(97,230,255,0.12)" }}>
          <div style={terminalLabelStyle("cyan")}>Ticker</div>
          <div style={terminalLabelStyle("cyan")}>Name / theme</div>
          <div style={terminalLabelStyle("cyan")}>Trend</div>
          <div style={{ textAlign: "right", ...terminalLabelStyle("cyan") }}>Px / watch</div>
        </div>

        <div className="np-terminal-scroll" style={terminalScrollAreaStyle(360)}>
          {marketRows.slice(0, 12).map((stock) => {
            const mini = stock.history?.slice(-16) || [];
            const targetId = stock.company?.id || stock.id;
            const moveTone = stock.change >= 0 ? "success" : "danger";
            return (
              <div key={stock.id} className="np-terminal-row np-terminal-row--interactive" style={{ ...terminalDataRowStyle(), display: "grid", gridTemplateColumns: "84px minmax(0,1fr) 92px auto", gap: 12, alignItems: "center" }}>
                <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0 }}>
                  <div style={{ ...terminalValueStyle({ tone: "amber", size: 14 }), fontWeight: 700 }}>{stock.ticker}</div>
                  <div style={{ fontSize: 10.5, marginTop: 4, ...terminalMutedStyle() }}>{stock.theme}</div>
                </button>

                <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                  <div style={{ fontSize: 11, marginTop: 4, ...terminalMutedStyle() }}>{stock.sector}</div>
                </button>

                <div style={{ height: 30, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mini}>
                      <Line type="monotone" dataKey="price" stroke={stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)"} strokeWidth={1.7} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...terminalValueStyle({ size: 13 }), fontWeight: 700 }}>${(stock.price || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)" }}>
                      {stock.change >= 0 ? "+" : ""}{(stock.pct || 0).toFixed(2)}%
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleWatch(targetId)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: moveTone === "success" ? "cyan" : "default" })}>
                    {watchedSet.has(targetId) ? "Starred" : "Star"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11.5, ...terminalMutedStyle() }}>
            Sort currently locked to {state.marketSort}. Data stays tied to the selected terminal context.
          </div>
          <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{marketRows.length} tracked</span>
        </div>
      </div>
    </TerminalPanel>
  );
}
