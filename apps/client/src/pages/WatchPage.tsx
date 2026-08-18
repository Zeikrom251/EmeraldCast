import { useCallback, useState } from 'react'
import { Header } from '../components/Header'
import { StreamGrid } from '../components/StreamGrid'
import { ChatPanel } from '../components/ChatPanel'
import { FollowingPanel } from '../components/FollowingPanel'
import { ShortcutsOverlay } from '../components/ShortcutsOverlay'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function WatchPage() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const toggleShortcuts = useCallback(() => setShortcutsOpen((open) => !open), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  useKeyboardShortcuts(toggleShortcuts)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header onShowShortcuts={toggleShortcuts} />
      <main className="flex flex-1 overflow-hidden">
        <FollowingPanel />
        <div className="flex flex-1 gap-2 overflow-hidden p-2">
          <StreamGrid />
          <ChatPanel />
        </div>
      </main>
      <ShortcutsOverlay open={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  )
}
