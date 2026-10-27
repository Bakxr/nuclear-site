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
            padding: "15px 20px",
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
            background: "var(--np-surface)",
            color: "var(--np-text)",
            border: `1px solid ${form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border-strong)"}`,
            borderRadius: "6px 0 0 6px",
            width: 320,
            outline: "none",
            borderRight: "none",
            transition: "border-color 0.2s",
            opacity: form.status === "loading" ? 0.6 : 1,
            ...inputStyle,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,165,74,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = form.status === "error" ? "rgba(248,113,113,0.5)" : "var(--np-border)"; }}
        />
        <button
          aria-label="Subscribe to newsletter"
          onClick={() => onSubmit(surface)}
          disabled={form.status === "loading"}
          style={{
            padding: "15px 30px",
            fontSize: 12,
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700,
            background: "var(--np-text)",
            color: "var(--np-bg)",
            border: "none",
            borderRadius: "0 6px 6px 0",
            cursor: form.status === "loading" ? "not-allowed" : "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
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
        <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, textAlign: align, ...errorStyle }}>{form.error}</p>
      )}
      {note ? (
        <p style={{ fontSize: 12, color: "var(--np-text-faint)", marginTop: 10, textAlign: align, lineHeight: 1.6 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
