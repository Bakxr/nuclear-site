import { TerminalProvider } from "../features/terminal/context.jsx";
import TerminalCommandBar from "../features/terminal/components/TerminalCommandBar.jsx";
import MapNexusPanel from "../features/terminal/components/MapNexusPanel.jsx";
import FleetScoreboardPanel from "../features/terminal/components/FleetScoreboardPanel.jsx";
import MarketMonitorPanel from "../features/terminal/components/MarketMonitorPanel.jsx";
import CatalystWirePanel from "../features/terminal/components/CatalystWirePanel.jsx";
import PipelinePanel from "../features/terminal/components/PipelinePanel.jsx";
import EntityFocusDrawer from "../features/terminal/components/EntityFocusDrawer.jsx";

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
          <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "minmax(0, 1.3fr) minmax(360px, 430px)", gap: 20, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 20 }}>
              <MapNexusPanel GlobeComponent={GlobeComponent} isMobileViewport={isMobileViewport} onOpenPlant={onOpenPlant} />
              <FleetScoreboardPanel />
            </div>

            <div style={{ display: "grid", gap: 20 }}>
              <EntityFocusDrawer isMobileViewport={isMobileViewport} />
              <MarketMonitorPanel onOpenStock={onOpenStock} />
              <CatalystWirePanel onRefreshData={onRefreshData} />
            </div>
          </div>

          <PipelinePanel />
        </div>
      </div>
    </TerminalProvider>
  );
}
