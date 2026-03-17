async function postJson(url, body, accessToken) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export async function createCheckoutSession(interval, accessToken) {
  return postJson("/api/billing/session", { action: "checkout", interval }, accessToken);
}

export async function createPortalSession(accessToken) {
  return postJson("/api/billing/session", { action: "portal" }, accessToken);
}
