// Email capture used on every newsletter surface (hero, inline, footer,
// popup). State lives in useNewsletter; this is presentation only.
export default function NewsletterCapture({
  surface,
  form,
  success,
  successMessage,
  onEmailChange,
  onWebsiteChange,
  onSubmit,
  buttonLabel = "Subscribe",
  placeholder = "Enter your email",
  note,
  align = "left",
  rowStyle,
  inputStyle,
  buttonStyle,
  successStyle,
  errorStyle,
  noteStyle,
}) {
  if (success) {
    return (
      <div style={{
        fontSize: 15,
        color: "var(--np-success)",
        fontWeight: 600,
        padding: "10px 0",
        textAlign: align,
        ...successStyle,
      }}>
        {successMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="np-newsletter-row" style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", ...rowStyle }}>
        <input
          aria-hidden="true"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => onWebsiteChange(surface, e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <input
          type="email"
          aria-label="Email address"
          placeholder={placeholder}
          value={form.email}
          onChange={(e) => onEmailChange(surface, e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(surface)}
          disabled={form.status === "loading"}
          style={{
            padding: "13px 14px",
            fontSize: 15,
            fontFamily: "var(--np-font-sans)",
            background: "var(--np-surface)",
            color: "var(--np-text)",
            border: `1px solid ${form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border-strong)"}`,
            borderRadius: "var(--np-r-sm) 0 0 var(--np-r-sm)",
            width: 320,
            minWidth: 0,
            outline: "none",
            borderRight: "none",
            transition: "border-color 0.2s",
            opacity: form.status === "loading" ? 0.6 : 1,
            ...inputStyle,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--np-accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"; }}
        />
        <button
          aria-label="Subscribe to newsletter"
          onClick={() => onSubmit(surface)}
          disabled={form.status === "loading"}
          style={{
            padding: "13px 18px",
            fontSize: 14,
            fontFamily: "var(--np-font-sans)",
            fontWeight: 700,
            background: "var(--np-text)",
            color: "var(--np-bg)",
            border: "none",
            borderRadius: "0 var(--np-r-sm) var(--np-r-sm) 0",
            whiteSpace: "nowrap",
            cursor: form.status === "loading" ? "not-allowed" : "pointer",
            letterSpacing: "0.01em",
            transition: "all 0.2s",
            opacity: form.status === "loading" ? 0.6 : 1,
            ...buttonStyle,
          }}
          onMouseEnter={(e) => { if (form.status !== "loading") e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { if (form.status !== "loading") e.currentTarget.style.opacity = "1"; }}
        >
          {form.status === "loading" ? "Subscribing…" : buttonLabel}
        </button>
      </div>
      {form.status === "error" && (
        <p role="alert" style={{ fontSize: 13, color: "var(--np-down)", marginTop: 10, textAlign: align, ...errorStyle }}>{form.error}</p>
      )}
      {note ? (
        <p style={{ fontSize: 12, color: "var(--np-text-faint)", marginTop: 10, textAlign: align, lineHeight: 1.6, ...noteStyle }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
