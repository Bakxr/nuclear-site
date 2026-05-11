import { lazy, Suspense } from "react";
import LazySectionFallback from "../../components/LazySectionFallback.jsx";
import TerminalAccessPage from "../access/TerminalAccessPage.jsx";
import TerminalGateState from "./TerminalGateState.jsx";

const NuclearTerminal = lazy(() => import("../../components/NuclearTerminal.jsx"));

export default function TerminalRouteView({
  GlobeComponent,
  accessState,
  isMobileViewport,
  terminalSnapshot,
  terminalLoading,
  terminalError,
  onExitTerminal,
  onOpenPlant,
  onOpenStock,
  onRefreshData,
}) {
  if (accessState === "loading") {
    return (
      <TerminalGateState
        title="Checking your access."
        message="Restoring your account session and terminal permissions."
        secondaryLabel="Editorial view"
        onSecondary={onExitTerminal}
      />
    );
  }

  if (accessState !== "active") {
    return <TerminalAccessPage isMobileViewport={isMobileViewport} onExitTerminal={onExitTerminal} />;
  }

  if (!terminalSnapshot) {
    return (
      <TerminalGateState
        title={terminalLoading ? "Loading the terminal." : "Terminal snapshot unavailable."}
        message={terminalLoading
          ? "Secure terminal data is loading for your account."
          : terminalError || "We could not load the latest secure terminal snapshot for this account."}
        actionLabel={terminalLoading ? "" : "Retry"}
        onAction={terminalLoading ? undefined : onRefreshData}
        secondaryLabel="Editorial view"
        onSecondary={onExitTerminal}
      />
    );
  }

  return (
    <Suspense fallback={<LazySectionFallback height={720} />}>
      <NuclearTerminal
        GlobeComponent={GlobeComponent}
        isMobileViewport={isMobileViewport}
        snapshot={terminalSnapshot}
        onOpenPlant={onOpenPlant}
        onOpenStock={onOpenStock}
        onExitTerminal={onExitTerminal}
        onRefreshData={onRefreshData}
      />
    </Suspense>
  );
}
