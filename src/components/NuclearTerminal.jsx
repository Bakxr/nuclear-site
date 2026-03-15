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
  return (
    <TerminalProvider snapshot={snapshot} isMobileViewport={isMobileViewport}>
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #080b11 0%, #0a1018 100%)", color: "#f5f0e8" }}>
        <TerminalCommandBar isMobileViewport={isMobileViewport} onExitTerminal={onExitTerminal} onRefreshData={onRefreshData} />

        <div style={{ maxWidth: 1520, margin: "0 auto", padding: isMobileViewport ? "18px" : "22px 24px 28px", display: "grid", gap: 20 }}>
          <TerminalBlotter isMobileViewport={isMobileViewport} />

          <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.4fr) minmax(340px, 0.8fr)", gap: 20, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 20 }}>
              <MapNexusPanel GlobeComponent={GlobeComponent} isMobileViewport={isMobileViewport} onOpenPlant={onOpenPlant} />
              <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 20 }}>
                <MarketMonitorPanel onOpenStock={onOpenStock} />
                <OperationsPulsePanel />
              </div>
              <PipelinePanel isMobileViewport={isMobileViewport} />
            </div>

            <div style={{ display: "grid", gap: 20 }}>
              <EntityFocusDrawer isMobileViewport={isMobileViewport} />
              <CatalystWirePanel onRefreshData={onRefreshData} />
              <FilingRadarPanel />
              <SourceRadarPanel />
            </div>
          </div>

          <FleetScoreboardPanel isMobileViewport={isMobileViewport} />
        </div>
      </div>
    </TerminalProvider>
  );
}
