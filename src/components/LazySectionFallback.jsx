export default function LazySectionFallback({ height = 320 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: height,
        borderRadius: 16,
        background: "var(--np-surface-dim)",
        border: "1px solid var(--np-border)",
      }}
    />
  );
}
