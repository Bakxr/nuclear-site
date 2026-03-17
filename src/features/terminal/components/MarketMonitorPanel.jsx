import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import {
  terminalButtonStyle,
  terminalDataRowStyle,
  terminalMutedStyle,
  terminalScrollAreaStyle,
  terminalTableHeaderStyle,
  terminalTagStyle,
  terminalValueStyle,
} from "./styles.js";

export default function MarketMonitorPanel({ onOpenStock, isMobileViewport = false }) {
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
      subtitle="Delayed nuclear watchlist linked to fleets, fuel-cycle exposures, and live catalyst focus."
      actions={actions.map((sort) => (
        <button key={sort.key} type="button" onClick={() => setMarketSort(sort.key)} className="np-terminal-button" style={terminalButtonStyle(state.marketSort === sort.key, { compact: true })}>
          {sort.label}
        </button>
      ))}
    >
      <div style={{ display: "grid", gap: 6 }}>
        {!isMobileViewport ? (
          <div style={{ display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 72px 88px auto", gap: 10, padding: "0 10px 6px", borderBottom: "1px solid rgba(51,66,86,0.92)" }}>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Ticker</div>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Name</div>
            <div style={terminalTableHeaderStyle("left", "cyan")}>Trend</div>
            <div style={terminalTableHeaderStyle("right", "cyan")}>Px / %</div>
            <div style={terminalTableHeaderStyle("right", "cyan")}>Watch</div>
          </div>
        ) : null}

        <div className="np-terminal-scroll" style={{ ...terminalScrollAreaStyle(320), padding: "0 10px" }}>
          {marketRows.slice(0, 12).map((stock) => {
            const mini = stock.history?.slice(-16) || [];
            const targetId = stock.company?.id || stock.id;
            const moveTone = stock.change >= 0 ? "success" : "danger";

            return (
              <div
                key={stock.id}
                className="np-terminal-row np-terminal-row--interactive"
                style={{
                  ...terminalDataRowStyle(),
                  display: "grid",
                  gridTemplateColumns: isMobileViewport ? "72px minmax(0,1fr) auto" : "70px minmax(0,1fr) 72px 88px auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                  <div style={{ ...terminalValueStyle({ tone: "amber", size: 13 }), fontWeight: 700 }}>{stock.ticker}</div>
                  <div style={{ fontSize: 9.5, marginTop: 3, ...terminalMutedStyle() }}>{stock.theme}</div>
                </button>

                <button type="button" onClick={() => { selectEntity(stock.company || stock); onOpenStock?.(stock); }} className="np-terminal-button" style={{ background: "transparent", border: "none", color: "var(--np-terminal-text)", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>
                  <div style={{ fontSize: 10, marginTop: 3, ...terminalMutedStyle() }}>{stock.sector}</div>
                </button>

                {!isMobileViewport ? (
                  <div style={{ height: 24, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mini}>
                        <Line type="monotone" dataKey="price" stroke={stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)"} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}

                <div style={{ display: "grid", justifyItems: isMobileViewport ? "start" : "end", gap: 4 }}>
                  <div style={{ ...terminalValueStyle({ size: 12 }), fontWeight: 700 }}>${(stock.price || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: stock.change >= 0 ? "var(--np-terminal-green)" : "var(--np-terminal-red)" }}>
                    {stock.change >= 0 ? "+" : ""}{(stock.pct || 0).toFixed(2)}%
                  </div>
                </div>

                <button type="button" onClick={() => toggleWatch(targetId)} className="np-terminal-button" style={terminalButtonStyle(false, { compact: true, tone: moveTone === "success" ? "cyan" : "default" })}>
                  {watchedSet.has(targetId) ? "Starred" : "Star"}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 10.5, ...terminalMutedStyle() }}>
            Sort locked to {state.marketSort}. Data remains tied to the selected terminal context.
          </div>
          <span style={terminalTagStyle({ tone: "cyan", compact: true })}>{marketRows.length} tracked</span>
        </div>
      </div>
    </TerminalPanel>
  );
}
