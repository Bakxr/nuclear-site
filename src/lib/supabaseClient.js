import { useEffect, useState } from "react";

// supabase-js (auth + realtime + storage + postgrest) is roughly a third of the
// entry bundle, and anonymous readers of the editorial page never need it up
// front. It's loaded with a dynamic import right after first render instead.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isBrowserSupabaseConfigured = Boolean(url && anonKey);

let clientPromise = null;
let resolvedClient = null;

export function loadBrowserSupabaseClient() {
  if (!isBrowserSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => {
        resolvedClient = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        return resolvedClient;
      })
      .catch((error) => {
        // Allow a retry (e.g. chunk failed on a flaky connection).
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

// Returns the shared client, or null until it has loaded (or if unconfigured).
export function useBrowserSupabaseClient() {
  const [client, setClient] = useState(resolvedClient);

  useEffect(() => {
    if (client || !isBrowserSupabaseConfigured) return undefined;
    let active = true;
    loadBrowserSupabaseClient()
      .then((loaded) => {
        if (active) setClient(loaded);
      })
      .catch((error) => console.warn("[supabase] client failed to load", error));
    return () => {
      active = false;
    };
  }, [client]);

  return client;
}
