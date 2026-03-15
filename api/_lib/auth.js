import { getMembershipForUser } from "./billing.js";
import { getSupabaseAuthClient } from "./supabase.js";

function unauthorized(res, message = "Authentication required.") {
  res.status(401).json({ error: message });
  return null;
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== "string") return "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

export async function requireAuthenticatedUser(req, res) {
  const token = getBearerToken(req);
  if (!token) return unauthorized(res);

  try {
    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return unauthorized(res);
    }

    return {
      user: data.user,
      accessToken: token,
    };
  } catch (error) {
    console.error("[auth]", error?.message || error);
    res.status(500).json({ error: "Server configuration is incomplete." });
    return null;
  }
}

export async function requireTerminalAccess(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return null;

  try {
    const membership = await getMembershipForUser(auth.user.id);
    if (!membership?.terminal_access) {
      res.status(403).json({ error: "Terminal access required." });
      return null;
    }

    return {
      ...auth,
      membership,
    };
  } catch (error) {
    console.error("[auth/terminal]", error?.message || error);
    res.status(500).json({ error: "Failed to verify terminal access." });
    return null;
  }
}
