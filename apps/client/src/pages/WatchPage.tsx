import { useCallback, useState } from 'react'
import { Header } from '../components/Header'
import { Home } from '../components/Home'
import { StreamGrid } from '../components/StreamGrid'
import { ChatPanel } from '../components/ChatPanel'
import { CommandPalette } from '../components/CommandPalette'
import { BrowseModal } from '../components/Browse'
import { ShortcutsOverlay } from '../components/ShortcutsOverlay'
import { useStream } from '../context/StreamContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { cn } from '../lib/utils'

export function WatchPage() {
  const { streams } = useStream()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)

  const toggleShortcuts = useCallback(() => setShortcutsOpen((open) => !open), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const toggleBrowse = useCallback(() => setBrowseOpen((open) => !open), [])
  const closeBrowse = useCallback(() => setBrowseOpen(false), [])

  useKeyboardShortcuts(toggleShortcuts, togglePalette, toggleBrowse)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header
        onOpenPalette={togglePalette}
        onShowShortcuts={toggleShortcuts}
        browseOpen={browseOpen}
        onToggleBrowse={toggleBrowse}
      />
      <main
        className={cn(
          'flex flex-1 gap-2 overflow-hidden',
          streams.length > 0 && 'p-2'
        )}
      >
        {streams.length === 0 ? (
          <Home onShowShortcuts={toggleShortcuts} onBrowse={toggleBrowse} />
        ) : (
          <>
            <StreamGrid />
            <ChatPanel />
          </>
        )}
      </main>
      {browseOpen && <BrowseModal onClose={closeBrowse} />}
      {paletteOpen && (
        <CommandPalette
          onClose={closePalette}
          onShowShortcuts={toggleShortcuts}
          onBrowse={toggleBrowse}
        />
      )}
      <ShortcutsOverlay open={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  )
}
