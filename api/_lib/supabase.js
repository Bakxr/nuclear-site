import { createClient } from "@supabase/supabase-js";

const CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

function getUrl() {
  return process.env.SUPABASE_URL?.trim() || "";
}

function getAnonKey() {
  return process.env.SUPABASE_ANON_KEY?.trim() || "";
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_KEY?.trim() || "";
}

export function getSupabaseAuthClient() {
  const url = getUrl();
  const key = getAnonKey();
  if (!url || !key) {
    throw new Error("Supabase auth configuration is incomplete.");
  }

  return createClient(url, key, CLIENT_OPTIONS);
}

export function getSupabaseServiceClient() {
  const url = getUrl();
  const key = getServiceKey();
  if (!url || !key) {
    throw new Error("Supabase service configuration is incomplete.");
  }

  return createClient(url, key, CLIENT_OPTIONS);
}

export function hasSupabaseAuthConfig() {
  return Boolean(getUrl() && getAnonKey());
}

export function hasSupabaseServiceConfig() {
  return Boolean(getUrl() && getServiceKey());
}
