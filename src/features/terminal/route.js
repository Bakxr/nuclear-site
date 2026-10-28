const PATHS = { terminal: "/terminal", learn: "/learn" };

export function getAppViewFromLocation(locationLike = globalThis.location) {
  if (!locationLike) return "home";
  const pathname = (locationLike.pathname || "/").replace(/\/+$/, "");
  const search = typeof locationLike.search === "string" ? locationLike.search : "";
  const params = new URLSearchParams(search);

  if (pathname === "/terminal") return "terminal";
  if (pathname === "/learn") return "learn";
  if (params.get("view") === "terminal") return "terminal";
  return "home";
}

export function buildAppPath(view) {
  return PATHS[view] || "/";
}
