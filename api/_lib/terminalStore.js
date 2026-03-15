import { createClient } from "@supabase/supabase-js";

const memoryStore = globalThis.__npTerminalStore ?? new Map();
globalThis.__npTerminalStore = memoryStore;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getTableName() {
  return process.env.TERMINAL_CACHE_TABLE || "terminal_cache";
}

export async function readTerminalCache(key) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from(getTableName())
        .select("key,payload,updated_at")
        .eq("key", key)
        .maybeSingle();

      if (!error && data?.payload) {
        return {
          payload: data.payload,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {
      // Fall through to in-memory cache.
    }
  }

  return memoryStore.get(key) || null;
}

export async function writeTerminalCache(key, payload) {
  const entry = { payload, updatedAt: new Date().toISOString() };
  memoryStore.set(key, entry);

  const client = getSupabaseClient();
  if (!client) return entry;

  try {
    await client
      .from(getTableName())
      .upsert({ key, payload, updated_at: entry.updatedAt }, { onConflict: "key" });
  } catch {
    // The in-memory cache still provides a safe fallback when the table is absent.
  }

  return entry;
}
