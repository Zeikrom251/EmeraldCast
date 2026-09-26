import { useState, type ReactNode } from 'react'
import { ArrowRight, Bookmark, Clock, Compass, Keyboard, Plus, Trash2, Volume2 } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { useRecentChannels, useSavedWalls } from '../../hooks/useSavedWalls'
import { useStreamSearch } from '../../hooks/useStreamSearch'
import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts'
import { cn, formatViewerCount, parseChannel } from '../../lib/utils'
import { Kbd } from '../Kbd'

// Decorative stand-ins for video in the hero preview.
const PREVIEW = [
  'linear-gradient(135deg,#1b3b6f,#6b2fa0 60%,#f2545b)',
  'linear-gradient(135deg,#0e4d3a,#1f8a70 60%,#e3c567)',
  'linear-gradient(135deg,#3a1c4a,#b3305b 60%,#ff9f45)',
  'linear-gradient(135deg,#12263a,#1e6091 60%,#76c893)',
]

function Card({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <span className="text-[var(--accent)]">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-xs text-[var(--text-muted)]">{children}</p>
}

export function Home({
  onShowShortcuts,
  onBrowse,
  compact,
}: {
  onShowShortcuts: () => void
  onBrowse: () => void
  /** The browse panel shares the row, so skip the decorative preview. */
  compact: boolean
}) {
  const { addStream, loadChannels } = useStream()
  const { walls, remove } = useSavedWalls()
  const recent = useRecentChannels()
  const [value, setValue] = useState('')
  const login = parseChannel(value)
  const { results } = useStreamSearch(value)

  function handleAdd() {
    if (login) addStream(login)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 py-10 sm:px-8 lg:py-12">
        <div className="flex items-center justify-between gap-12">
          <div className="flex max-w-[620px] flex-col gap-5">
            <span className="flex w-fit items-center gap-2 rounded-full border border-[var(--accent-glow)] bg-[var(--accent-tint)] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Multistream for Twitch · No account needed
            </span>
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-[-0.03em] text-[var(--text-primary)] sm:text-[72px]">
              All your streams.
              <br />
              <span className="text-[var(--accent)]">One screen.</span>
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[27px] text-[var(--text-secondary)]">
              Drop in channels, arrange them in a wall, pick whose audio you hear, and follow every
              chat in a single merged feed. Nothing to sign up for: your walls live in your browser.
            </p>

            <div className="relative max-w-[600px]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAdd()
                }}
                className="flex h-[60px] items-center gap-3 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] pl-5 pr-2 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]"
              >
                <span className="hidden font-mono text-[15px] text-[var(--text-muted)] sm:inline">
                  twitch.tv/
                </span>
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="channel name"
                  aria-label="Channel name or twitch.tv link"
                  className="min-w-0 flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="submit"
                  disabled={!login}
                  className="flex h-11 items-center gap-2 rounded-[10px] bg-[var(--accent)] px-[18px] text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Add stream
                </button>
              </form>
              {value.trim() && results.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
                  {results.slice(0, 5).map((r) => (
                    <li key={r.login}>
                      <button
                        onClick={() => addStream(r.login)}
                        className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--accent-tint)] focus:bg-[var(--accent-tint)] focus:outline-none"
                      >
                        <span className="relative shrink-0">
                          <img
                            src={r.profileImageUrl}
                            alt=""
                            className="h-8 w-8 rounded-full"
                            loading="lazy"
                          />
                          {r.isLive && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-elevated)] bg-[var(--live-dot)]" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                            {r.displayName}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">
                            {r.isLive
                              ? [r.gameName, `${formatViewerCount(r.viewerCount)} viewers`]
                                  .filter(Boolean)
                                  .join(' · ')
                              : 'Offline'}
                          </span>
                        </span>
                        <Plus size={15} className="shrink-0 text-[var(--text-muted)]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {recent.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Jump back in</span>
                {recent.slice(0, 5).map((channel) => (
                  <button
                    key={channel}
                    onClick={() => addStream(channel)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                  >
                    {channel}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onBrowse}
              className="group flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            >
              <Compass size={15} className="text-[var(--accent)]" />
              Not sure what to watch? Browse categories
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div
            className={cn(
              'hidden shrink-0 grid-cols-2 gap-1.5 rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-1.5',
              !compact && 'lg:grid'
            )}
            aria-hidden
          >
            {PREVIEW.map((background, i) => (
              <div
                key={background}
                className={cn(
                  'relative h-[153px] w-[272px] rounded-xl',
                  i === 0 && 'outline outline-2 -outline-offset-2 outline-[var(--accent)]'
                )}
                style={{ background }}
              >
                {i === 0 && (
                  <span className="absolute bottom-2 right-2 rounded-md bg-[var(--accent)] p-1 text-[var(--accent-ink)]">
                    <Volume2 size={12} strokeWidth={2.5} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-3">
          <Card
            icon={<Bookmark size={15} />}
            title="Saved walls"
            action={
              walls.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{walls.length} saved</span>
              )
            }
          >
            {walls.length === 0 ? (
              <Empty>Build a wall, then hit “Save wall” to keep it here.</Empty>
            ) : (
              walls.map((wall) => (
                <div
                  key={wall.id}
                  className="group flex items-center gap-3 rounded-[10px] bg-[var(--bg-elevated)] px-3 py-2.5"
                >
                  <button
                    onClick={() => loadChannels(wall.channels, wall.main)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">
                      {wall.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">
                      {wall.channels.join(' · ')}
                    </span>
                  </button>
                  <button
                    onClick={() => remove(wall.id)}
                    className="rounded p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete ${wall.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => loadChannels(wall.channels, wall.main)}
                    className="text-xs font-medium text-[var(--accent)]"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </Card>

          <Card icon={<Clock size={15} />} title="Recent channels">
            {recent.length === 0 ? (
              <Empty>Channels you watch show up here.</Empty>
            ) : (
              recent.slice(0, 5).map((channel) => (
                <div key={channel} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] font-mono text-[11px] font-medium uppercase text-[var(--text-secondary)]">
                    {channel.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {channel}
                  </span>
                  <button
                    onClick={() => addStream(channel)}
                    className="rounded-lg bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    aria-label={`Add ${channel}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))
            )}
          </Card>

          <Card
            icon={<Keyboard size={15} />}
            title="Shortcuts"
            action={
              <button
                onClick={onShowShortcuts}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                All shortcuts
              </button>
            }
          >
            {SHORTCUTS.slice(0, 4).map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[var(--text-secondary)]">{s.description}</span>
                <Kbd>{s.keys}</Kbd>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
