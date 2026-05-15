// Client service for the terminal alerts API. Mirrors the shape of the
// watchlist service — every function degrades gracefully when the user
// isn't signed in. The server enforces RLS + terminal_access.

async function getAccessToken(supabase) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

async function request(supabase, path, init = {}) {
  const token = await getAccessToken(supabase);
  if (!token) return null;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export async function listAlerts(supabase) {
  const body = await request(supabase, "/api/alerts", { method: "GET" });
  return body?.alerts || [];
}

export async function createAlert(supabase, alert) {
  const body = await request(supabase, "/api/alerts", {
    method: "POST",
    body: JSON.stringify(alert),
  });
  return body?.alert || null;
}

export async function deleteAlert(supabase, id) {
  await request(supabase, `/api/alerts?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function toggleAlertActive(supabase, id, active) {
  const body = await request(supabase, `/api/alerts?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
  return body?.alert || null;
}
