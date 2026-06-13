/**
 * Brand logo for one of the testnet stock tickers (TSLA/AMZN/NFLX/AMD/PLTR).
 *
 * Served from the SimpleIcons CDN (CC0 SVGs, supports any hex color via URL).
 * This avoids the react-icons/si gap — `SiAmazon` is no longer exported by
 * that package, but the CDN still serves it. Falls back to the ticker text
 * in monospace if the symbol isn't recognised.
 */

const SLUGS: Record<string, string> = {
  TSLA: 'tesla',
  AMZN: 'amazon',
  NFLX: 'netflix',
  AMD: 'amd',
  PLTR: 'palantir',
};

export function StockIcon({
  ticker,
  size = 22,
  colorHex = '081826', // deep-ocean
}: {
  ticker: string;
  size?: number;
  /** 6-digit hex (no #) for the SVG fill; defaults to deep-ocean. */
  colorHex?: string;
}) {
  const slug = SLUGS[ticker.toUpperCase()];
  if (!slug) {
    return (
      <span
        style={{
          color: `#${colorHex}`,
          fontWeight: 700,
          fontSize: size * 0.5,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        {ticker.slice(0, 4)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}/${colorHex}`}
      width={size}
      height={size}
      alt={`${ticker} logo`}
      style={{ display: 'block' }}
    />
  );
}
