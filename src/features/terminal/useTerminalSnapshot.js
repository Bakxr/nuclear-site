import { useCallback, useEffect, useState } from "react";
import { fetchTerminalSnapshot } from "../../services/terminalAPI.js";

export function useTerminalSnapshot({ accessState, appView, getAccessToken }) {
  const [remoteTerminalSnapshot, setRemoteTerminalSnapshot] = useState(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalError, setTerminalError] = useState("");

  const refreshTerminalSnapshot = useCallback(async () => {
    setTerminalLoading(true);
    setTerminalError("");

    try {
      const accessToken = await getAccessToken();
      const snapshot = await fetchTerminalSnapshot(accessToken);
      setRemoteTerminalSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      setRemoteTerminalSnapshot(null);
      setTerminalError(error?.message || "Could not refresh the terminal snapshot.");
      throw error;
    } finally {
      setTerminalLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (accessState === "active") return;
    setRemoteTerminalSnapshot(null);
    setTerminalLoading(false);
    setTerminalError("");
  }, [accessState]);

  useEffect(() => {
    if (appView !== "terminal" || accessState !== "active") return undefined;

    let cancelled = false;

    async function loadRemoteTerminal() {
      setTerminalLoading(true);
      setTerminalError("");

      try {
        const accessToken = await getAccessToken();
        const snapshot = await fetchTerminalSnapshot(accessToken);
        if (!cancelled) setRemoteTerminalSnapshot(snapshot);
      } catch (error) {
        if (!cancelled) {
          setRemoteTerminalSnapshot(null);
          setTerminalError(error?.message || "Could not load the terminal snapshot.");
        }
      } finally {
        if (!cancelled) setTerminalLoading(false);
      }
    }

    loadRemoteTerminal();
    return () => { cancelled = true; };
  }, [accessState, appView, getAccessToken]);

  return {
    remoteTerminalSnapshot,
    terminalLoading,
    terminalError,
    refreshTerminalSnapshot,
  };
}
