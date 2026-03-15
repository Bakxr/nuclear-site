export async function fetchTerminalSnapshot(accessToken) {
  const response = await fetch("/api/terminal/snapshot", {
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Terminal snapshot failed with ${response.status}`);
  }

  return response.json();
}
