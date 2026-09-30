// Newsletter and terminal numbers for the owner's morning email: how big the
// list is, how fast it's growing, and where new sign-ups come from.

const DAY_MS = 86400000;

export async function getFunnelStats(supabase, { now = Date.now() } = {}) {
  const since30 = new Date(now - 30 * DAY_MS).toISOString();
  const since7 = now - 7 * DAY_MS;

  const [active, recent, members] = await Promise.all([
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("subscribers").select("created_at, source, campaign").gte("created_at", since30).limit(5000),
    supabase.from("billing_memberships").select("user_id", { count: "exact", head: true }).eq("terminal_access", true),
  ]);
  if (active.error || recent.error) return null;

  const rows = recent.data || [];
  const counts = new Map();
  for (const row of rows) {
    const label = row.source ? (row.campaign ? `${row.source} · ${row.campaign}` : row.source) : "unknown (before tracking)";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return {
    subscribers: active.count ?? 0,
    new7: rows.filter((r) => Date.parse(r.created_at) >= since7).length,
    new30: rows.length,
    terminalMembers: members.error ? null : members.count ?? 0,
    topSources: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
  };
}
