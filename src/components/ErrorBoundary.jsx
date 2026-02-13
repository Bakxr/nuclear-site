import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", this.props.section || "section", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const section = this.props.section || "This section";
    const dark = this.props.dark ?? true;

    return (
      <div style={{
        padding: "48px 40px",
        textAlign: "center",
        background: dark ? "rgba(245,240,232,0.03)" : "rgba(20,18,14,0.03)",
        border: `1px solid ${dark ? "rgba(245,240,232,0.08)" : "rgba(20,18,14,0.08)"}`,
        borderRadius: 16,
        margin: "0 40px",
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
        <h3 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 22,
          fontWeight: 600,
          color: dark ? "#f5f0e8" : "#1e1912",
          margin: "0 0 10px",
        }}>
          {section} couldn't load
        </h3>
        <p style={{
          fontSize: 14,
          color: dark ? "rgba(245,240,232,0.45)" : "rgba(30,25,18,0.5)",
          margin: "0 0 24px",
          maxWidth: 380,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.6,
        }}>
          Something went wrong rendering this section. Your other content is unaffected.
        </p>
        <button
          onClick={this.handleRetry}
          style={{
            background: "none",
            border: "1px solid #d4a54a",
            color: "#d4a54a",
            padding: "10px 24px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            letterSpacing: "0.02em",
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#d4a54a"; e.currentTarget.style.color = "#14120e"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#d4a54a"; }}
        >
          Try again
        </button>
      </div>
    );
  }
}
