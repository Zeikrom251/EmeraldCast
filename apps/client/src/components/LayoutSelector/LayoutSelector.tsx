import { LayoutGrid, Columns2, Maximize } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { cn } from '../../lib/utils'
import type { LayoutType } from '@repo/types'

const layouts: { type: LayoutType; icon: React.ReactNode; label: string }[] = [
  { type: 'grid', icon: <LayoutGrid size={16} />, label: 'Grid' },
  { type: 'main-sidebar', icon: <Columns2 size={16} />, label: 'Main + Sidebar' },
  { type: 'focus', icon: <Maximize size={16} />, label: 'Focus' },
]

export function LayoutSelector() {
  const { layoutType, setLayout } = useStream()

  return (
    <div
      role="radiogroup"
      aria-label="Layout selector"
      className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1"
    >
      {layouts.map(({ type, icon, label }) => (
        <button
          key={type}
          role="radio"
          aria-checked={layoutType === type}
          onClick={() => setLayout(type)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            layoutType === type
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          )}
          title={label}
          aria-label={label}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
