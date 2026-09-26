import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.375rem] items-center justify-center rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-hover)] px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none text-[var(--text-secondary)]">
      {children}
    </kbd>
  )
}
