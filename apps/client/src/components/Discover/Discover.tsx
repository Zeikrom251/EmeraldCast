import { useEffect, useState } from 'react'
import { Loader2, Eye, Flame, Gamepad2, Plus } from 'lucide-react'
import axios from 'axios'
import { api } from '../../lib/api'
import { useStream } from '../../context/StreamContext'
import { useCategoryBrowser } from '../../context/CategoryBrowserContext'
import { formatViewerCount } from '../../lib/utils'
import type { DiscoverData } from '@repo/types'

export function Discover() {
  const { addStream } = useStream()
  const { openBrowser } = useCategoryBrowser()
  const [data, setData] = useState<DiscoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    ;(async () => {
      try {
        const res = await api.twitch.discover(controller.signal)
        setData(res)
        setLoading(false)
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(true)
          setLoading(false)
        }
      }
    })()
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        Loading what’s live…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">Couldn’t load discovery</p>
        <p className="max-w-xs text-xs text-[var(--text-muted)]">
          Search for a Twitch channel above, or pick one from your followed list to start watching.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Discover what’s live</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Jump into a top stream or browse a category — or search above to add any channel.
          </p>
        </div>

        {/* Top categories */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-1.5">
            <Gamepad2 size={13} className="text-[var(--accent)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Top categories
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openBrowser(cat)}
                className="group flex flex-col gap-1.5 text-left"
                title={`Browse ${cat.name}`}
              >
                <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--accent)]">
                  <img
                    src={cat.boxArtUrl}
                    alt={cat.name}
                    className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {cat.name}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Top live streams */}
        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <Flame size={13} className="text-orange-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Live now
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.streams.map((s) => (
              <button
                key={s.login}
                onClick={() => addStream(s.login)}
                className="group flex flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-left transition-colors hover:border-[var(--accent)]"
                title={`${s.title} — Add to grid`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img
                    src={s.thumbnailUrl}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
                    Live
                  </span>
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <Eye size={9} />
                    {formatViewerCount(s.viewerCount)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-black">
                      <Plus size={13} />
                      Add
                    </span>
                  </span>
                </div>
                <div className="min-w-0 px-2 py-1.5">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {s.displayName}
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {s.gameName} · {s.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
