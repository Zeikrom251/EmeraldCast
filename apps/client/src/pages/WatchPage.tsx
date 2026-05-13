import { Header } from '../components/Header'
import { StreamGrid } from '../components/StreamGrid'
import { ChatPanel } from '../components/ChatPanel'
import { FollowingPanel } from '../components/FollowingPanel'

export function WatchPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <FollowingPanel />
        <div className="flex flex-1 gap-2 overflow-hidden p-2">
          <StreamGrid />
          <ChatPanel />
        </div>
      </main>
    </div>
  )
}
