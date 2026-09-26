export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="8" fill="var(--accent)" />
      <g transform="translate(6 6)" fill="var(--accent-ink)">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fillOpacity=".55" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fillOpacity=".55" />
        <path d="M10 9.2v5.6c0 .4.4.6.7.4l4.2-2.8c.3-.2.3-.6 0-.8l-4.2-2.8c-.3-.2-.7 0-.7.4z" />
      </g>
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
        EmeraldCast
      </span>
    </span>
  )
}
