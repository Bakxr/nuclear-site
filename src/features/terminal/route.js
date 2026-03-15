export function getAppViewFromLocation(locationLike = globalThis.location) {
  if (!locationLike) return "home";
  const pathname = locationLike.pathname || "/";
  const search = typeof locationLike.search === "string" ? locationLike.search : "";
  const params = new URLSearchParams(search);

  if (pathname.replace(/\/+$/, "") === "/terminal") return "terminal";
  if (params.get("view") === "terminal") return "terminal";
  return "home";
}

export function buildAppPath(view) {
  return view === "terminal" ? "/terminal" : "/";
}
