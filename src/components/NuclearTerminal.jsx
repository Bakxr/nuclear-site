import { TerminalProvider } from "../features/terminal/context.jsx";
import TerminalShell from "../features/terminal/shell/TerminalShell.jsx";

export default function NuclearTerminal({
  GlobeComponent,
  isMobileViewport,
  snapshot,
  onOpenPlant,
  onExitTerminal,
  onRefreshData,
}) {
  return (
    <TerminalProvider snapshot={snapshot} isMobileViewport={isMobileViewport}>
      <TerminalShell
        GlobeComponent={GlobeComponent}
        onOpenPlant={onOpenPlant}
        onExitTerminal={onExitTerminal}
        onRefreshData={onRefreshData}
      />
    </TerminalProvider>
  );
}
