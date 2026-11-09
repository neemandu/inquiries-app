// Draws an SVG icon file in the current text color, so the design's icon file is used as-is
// while its color can follow state (e.g. active / inactive menu items)
export default function MaskIcon({ src, size, className = '' }: { src: string; size: number; className?: string }) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}
