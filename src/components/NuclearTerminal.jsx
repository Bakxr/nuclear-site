import { TerminalProvider } from "../features/terminal/context.jsx";
import TerminalCommandBar from "../features/terminal/components/TerminalCommandBar.jsx";
import TerminalBlotter from "../features/terminal/components/TerminalBlotter.jsx";
import MapNexusPanel from "../features/terminal/components/MapNexusPanel.jsx";
import FleetScoreboardPanel from "../features/terminal/components/FleetScoreboardPanel.jsx";
import MarketMonitorPanel from "../features/terminal/components/MarketMonitorPanel.jsx";
import CatalystWirePanel from "../features/terminal/components/CatalystWirePanel.jsx";
import PipelinePanel from "../features/terminal/components/PipelinePanel.jsx";
import EntityFocusDrawer from "../features/terminal/components/EntityFocusDrawer.jsx";
import OperationsPulsePanel from "../features/terminal/components/OperationsPulsePanel.jsx";
import FilingRadarPanel from "../features/terminal/components/FilingRadarPanel.jsx";
import SourceRadarPanel from "../features/terminal/components/SourceRadarPanel.jsx";

export default function NuclearTerminal({
  GlobeComponent,
  isMobileViewport,
  snapshot,
  onOpenPlant,
  onOpenStock,
  onExitTerminal,
  onRefreshData,
}) {
  const workspaceStyle = isMobileViewport
    ? {
        display: "grid",
        gap: 14,
      }
    : {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.92fr)",
        gridTemplateAreas: `
          "map focus"
          "map wire"
          "market pipeline"
          "ops filings"
          "scoreboard sources"
        `,
        gap: 16,
        alignItems: "start",
      };

  return (
    <TerminalProvider snapshot={snapshot} isMobileViewport={isMobileViewport}>
      <div className="np-terminal-shell">
        <TerminalCommandBar isMobileViewport={isMobileViewport} onExitTerminal={onExitTerminal} onRefreshData={onRefreshData} />

        <div className="np-terminal-content" style={{ maxWidth: 1540, margin: "0 auto", padding: isMobileViewport ? "14px 14px 18px" : "16px 20px 28px", display: "grid", gap: 16 }}>
          <TerminalBlotter isMobileViewport={isMobileViewport} />

          <div style={workspaceStyle}>
            <div style={isMobileViewport ? undefined : { gridArea: "map" }}>
              <MapNexusPanel GlobeComponent={GlobeComponent} isMobileViewport={isMobileViewport} onOpenPlant={onOpenPlant} />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "focus" }}>
              <EntityFocusDrawer isMobileViewport={isMobileViewport} />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "wire" }}>
              <CatalystWirePanel onRefreshData={onRefreshData} />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "market" }}>
              <MarketMonitorPanel onOpenStock={onOpenStock} />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "ops" }}>
              <OperationsPulsePanel />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "pipeline" }}>
              <PipelinePanel isMobileViewport={isMobileViewport} />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "filings" }}>
              <FilingRadarPanel />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "sources" }}>
              <SourceRadarPanel />
            </div>
            <div style={isMobileViewport ? undefined : { gridArea: "scoreboard" }}>
              <FleetScoreboardPanel isMobileViewport={isMobileViewport} />
            </div>
          </div>
        </div>
      </div>
    </TerminalProvider>
  );
}
