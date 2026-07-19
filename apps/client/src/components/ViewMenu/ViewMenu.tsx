import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, Share2, Check, X, Tv2, Gamepad2 } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { buildShareUrl } from '../../lib/utils'

export function ViewMenu() {
  const { streams, mainId, audioFocusId, nativeModeAll, toggleAllNativeMode, clearStreams } =
    useStream()
  const [open, setOpen] = useState(false)
  const [shared, setShared] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (streams.length === 0) return null

  async function handleShare() {
    const url = buildShareUrl(streams, mainId, audioFocusId)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard blocked (e.g. insecure context) — fall back to a prompt
      window.prompt('Copy this shareable link:', url)
      return
    }
    setShared(true)
    window.setTimeout(() => setShared(false), 2000)
  }

  function handleClear() {
    clearStreams()
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        title="View actions"
        aria-label="View actions"
        aria-expanded={open}
      >
        <SlidersHorizontal size={14} />
        View
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-2xl">
          <button
            onClick={handleShare}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {shared ? (
              <Check size={14} className="text-[var(--accent)]" />
            ) : (
              <Share2 size={14} />
            )}
            {shared ? 'Link copied!' : 'Share view'}
          </button>
          <button
            onClick={toggleAllNativeMode}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {nativeModeAll ? (
              <Gamepad2 size={14} className="text-purple-400" />
            ) : (
              <Tv2 size={14} />
            )}
            {nativeModeAll ? 'Switch to EmeraldCast Mode' : 'Switch to Twitch Mode'}
          </button>
          <button
            onClick={handleClear}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <X size={14} />
            Close all streams
          </button>
        </div>
      )}
    </div>
  )
}
