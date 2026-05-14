// Supabase-backed watchlist service for the terminal.
//
// The terminal keeps `state.watchedIds` as the source of truth in React, and
// this module mirrors changes to Postgres so a user's watchlist follows them
// across devices. All functions degrade gracefully when the Supabase client
// is unavailable or the user is not authenticated — they return empty results
// or no-op rather than throwing so the unauthenticated localStorage-only path
// keeps working.

const TABLE = "terminal_watchlist";

async function getCurrentUserId(supabase) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function loadWatchlist(supabase) {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("entity_id, entity_type, entity_label, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[watchlist] loadWatchlist failed", error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[watchlist] loadWatchlist threw", err);
    return [];
  }
}

export async function addWatchEntry(supabase, { entity_id, entity_type, entity_label }) {
  const userId = await getCurrentUserId(supabase);
  if (!userId || !entity_id) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, entity_id, entity_type, entity_label },
      { onConflict: "user_id,entity_id", ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(error.message || "Failed to add watch entry.");
  }
}

export async function removeWatchEntry(supabase, entity_id) {
  const userId = await getCurrentUserId(supabase);
  if (!userId || !entity_id) return;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("entity_id", entity_id);

  if (error) {
    throw new Error(error.message || "Failed to remove watch entry.");
  }
}

export async function bulkAddWatchEntries(supabase, entries) {
  const userId = await getCurrentUserId(supabase);
  if (!userId || !Array.isArray(entries) || entries.length === 0) return;

  const rows = entries
    .filter((entry) => entry && entry.entity_id)
    .map((entry) => ({
      user_id: userId,
      entity_id: entry.entity_id,
      entity_type: entry.entity_type || "unknown",
      entity_label: entry.entity_label || entry.entity_id,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "user_id,entity_id", ignoreDuplicates: true });

  if (error) {
    console.warn("[watchlist] bulkAddWatchEntries failed", error.message);
  }
}
