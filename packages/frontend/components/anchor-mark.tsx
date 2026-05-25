// Brand mark — geometric anchor in gold by default. Ported from
// design/landing-parts.jsx so the shape stays consistent with the mockups.

interface Props {
  size?: number;
  color?: string;
  className?: string;
}

export function AnchorMark({ size = 28, color = 'var(--gold)', className }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="12" r="5" />
      <line x1="32" y1="17" x2="32" y2="52" />
      <line x1="22" y1="24" x2="42" y2="24" />
      <path d="M14 38 C 14 50, 24 56, 32 56 C 40 56, 50 50, 50 38" />
      <line x1="14" y1="38" x2="10" y2="34" />
      <line x1="50" y1="38" x2="54" y2="34" />
    </svg>
  );
}
