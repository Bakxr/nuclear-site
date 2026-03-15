export async function fetchTerminalSnapshot() {
  const response = await fetch("/api/terminal/snapshot", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Terminal snapshot failed with ${response.status}`);
  }

  return response.json();
}
