/** Logo "P" de SPAZIO (SVG inline). */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#16637A" />
      <path
        d="M11 9h6.2c3 0 4.8 1.7 4.8 4.3 0 2.7-1.9 4.4-5 4.4h-2.3V23H11V9zm3.7 5.9h1.8c1.1 0 1.8-.6 1.8-1.6s-.7-1.5-1.8-1.5h-1.8v3.1z"
        fill="#fff"
      />
    </svg>
  )
}
