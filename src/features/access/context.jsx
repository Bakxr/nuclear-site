/* eslint-disable react-refresh/only-export-components */
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabaseClient.js";

const AccessContext = createContext(null);
const DEFAULT_AUTH_REDIRECT_URL = "https://atomic-energy.vercel.app/";

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function getOtpEmailRedirectUrl() {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT_URL;

  const origin = window.location.origin?.replace(/\/+$/, "") || DEFAULT_AUTH_REDIRECT_URL.replace(/\/+$/, "");
  const pathname = window.location.pathname || "/";
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${safePath}`;
}

export function AccessProvider({ children }) {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [membership, setMembership] = useState(null);
  const [authReady, setAuthReady] = useState(() => !supabase);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      startTransition(() => {
        setSession(data.session || null);
        if (!data.session) {
          setMembership(null);
          setMembershipError("");
          setMembershipLoading(false);
        }
        setAuthReady(true);
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      startTransition(() => {
        setSession(nextSession || null);
        if (!nextSession) {
          setMembership(null);
          setMembershipError("");
          setMembershipLoading(false);
        }
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) return undefined;

    let active = true;

    async function loadMembership() {
      setMembershipLoading(true);
      setMembershipError("");

      const { data, error } = await supabase
        .from("billing_memberships")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setMembership(null);
        setMembershipError(error.message || "Could not load account access.");
        setMembershipLoading(false);
        return;
      }

      setMembership(data || null);
      setMembershipLoading(false);
    }

    loadMembership();
    return () => {
      active = false;
    };
  }, [session, supabase]);

  const accessState = useMemo(() => {
    if (!authReady) return "loading";
    if (!session?.user) return "logged_out";
    if (membershipLoading) return "loading";
    return membership?.terminal_access ? "active" : "inactive";
  }, [authReady, membership, membershipLoading, session]);

  const sendOtp = useCallback(async (email) => {
    if (!supabase) throw new Error("Supabase browser auth is not configured.");
    const normalisedEmail = email.toLowerCase().trim();
    await postJson("/api/auth/request-otp", { email: normalisedEmail });
    const { error } = await supabase.auth.signInWithOtp({
      email: normalisedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getOtpEmailRedirectUrl(),
      },
    });

    if (error) {
      throw new Error(error.message || "Could not send the login code.");
    }

    return normalisedEmail;
  }, [supabase]);

  const verifyOtp = useCallback(async (email, token) => {
    if (!supabase) throw new Error("Supabase browser auth is not configured.");
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: token.trim(),
      type: "email",
    });

    if (error) {
      throw new Error(error.message || "Invalid login code.");
    }

    setSession(data.session || null);
    return data.session || null;
  }, [supabase]);

  const refreshMembership = useCallback(async () => {
    if (!supabase || !session?.user) {
      setMembership(null);
      return null;
    }

    setMembershipLoading(true);
    const { data, error } = await supabase
      .from("billing_memberships")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      setMembershipLoading(false);
      setMembershipError(error.message || "Could not refresh account access.");
      throw new Error(error.message || "Could not refresh account access.");
    }

    setMembership(data || null);
    setMembershipLoading(false);
    setMembershipError("");
    return data || null;
  }, [session, supabase]);

  const getAccessToken = useCallback(async () => {
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMembership(null);
  }, [supabase]);

  const value = {
    accessState,
    authReady,
    isConfigured: Boolean(supabase),
    membership,
    membershipError,
    membershipLoading,
    session,
    user: session?.user || null,
    sendOtp,
    verifyOtp,
    refreshMembership,
    getAccessToken,
    signOut,
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useTerminalAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useTerminalAccess must be used within an AccessProvider.");
  }

  return context;
}
