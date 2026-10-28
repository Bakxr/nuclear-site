import { useEffect, useState } from "react";
import { fetchNewsPayload } from "../../services/newsAPI.js";

// Uranium and the NRC fleet snapshot ride along with /api/news; this shares
// that request (fetchNewsPayload dedupes and caches it).
export function useFrontSignals() {
  const [signals, setSignals] = useState({ uranium: null, fleet: null });
  useEffect(() => {
    let cancelled = false;
    fetchNewsPayload().then((payload) => {
      if (!cancelled && payload) setSignals({ uranium: payload.uranium || null, fleet: payload.fleet || null });
    });
    return () => { cancelled = true; };
  }, []);
  return signals;
}
