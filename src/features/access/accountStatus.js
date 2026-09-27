export function formatAccessDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// One-line, human-readable plan status for account menus.
export function describePlan(membership) {
  if (!membership?.subscription_status) return "";
  const plan = membership.plan_interval === "year" ? "Annual plan" : membership.plan_interval === "month" ? "Monthly plan" : "Pro plan";
  const end = formatAccessDate(membership.current_period_end);
  const status = membership.subscription_status;
  if (!membership.terminal_access) return status === "canceled" ? "Subscription ended" : "No active plan";
  if (membership.cancel_at_period_end) return end ? `${plan} · access until ${end}` : plan;
  if (status === "trialing") return end ? `Free trial · ends ${end}` : "Free trial";
  if (status === "past_due") return "Payment failed · update your card";
  return end ? `${plan} · renews ${end}` : plan;
}

export function truncateEmail(email, max = 28) {
  const value = String(email || "").trim();
  if (!value || value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function getAccountStatusMeta({ accessState, isConfigured, membershipLoading, membership, user }) {
  if (!isConfigured) {
    return {
      title: "Account",
      detail: "Auth offline",
      accent: "#f87171",
    };
  }

  if (accessState === "loading" || membershipLoading) {
    return {
      title: user?.email ? truncateEmail(user.email, 22) : "Account",
      detail: "Checking access",
      accent: "#b3a489",
    };
  }

  if (!user) {
    return {
      title: "Account",
      detail: "Sign in",
      accent: "rgba(212,165,74,0.72)",
    };
  }

  if (membership?.terminal_access) {
    return {
      title: truncateEmail(user.email, 22),
      detail: "Terminal active",
      accent: "#4ade80",
    };
  }

  return {
    title: truncateEmail(user.email, 22),
    detail: "Signed in",
    accent: "#d4a54a",
  };
}
