// External-link arrow drawn as SVG. The "↗" character renders as a color
// emoji on iPhones, so it isn't used as text anywhere on the site.
export default function ExtArrow({ size = "0.85em" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "-0.08em", flexShrink: 0 }}
    >
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  );
}
