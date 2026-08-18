import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkPlus, Trash2, Play, X } from 'lucide-react'
import { getCollections, saveCollections, STORAGE_KEYS } from '@repo/utils'
import { useStorageSync } from '../../hooks/useStorageSync'
import { useStream } from '../../context/StreamContext'
import type { StreamCollection } from '@repo/types'

function makeId(): string {
  return crypto.randomUUID()
}

export function CollectionsMenu() {
  const { streams, mainId, loadChannels } = useStream()
  const [open, setOpen] = useState(false)
  const [collections, setCollections] = useState<StreamCollection[]>(() => getCollections())
  const [name, setName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useStorageSync(STORAGE_KEYS.collections, getCollections, setCollections)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function persist(next: StreamCollection[]) {
    setCollections(next)
    saveCollections(next)
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || streams.length === 0) return
    const mainChannel = streams.find((s) => s.id === mainId)?.channel ?? null
    const collection: StreamCollection = {
      id: makeId(),
      name: trimmed,
      channels: streams.map((s) => s.channel),
      main: mainChannel,
    }
    persist([...collections, collection])
    setName('')
  }

  function handleLoad(collection: StreamCollection) {
    loadChannels(collection.channels, collection.main)
    setOpen(false)
  }

  function handleDelete(id: string) {
    persist(collections.filter((c) => c.id !== id))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        title="Saved collections"
        aria-label="Saved collections"
        aria-expanded={open}
      >
        <Bookmark size={14} />
        Collections
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 shadow-2xl backdrop-blur-md">
          {/* Save current view */}
          <div className="border-b border-[var(--border-subtle)] p-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={
                  streams.length === 0 ? 'Add streams to save a view' : 'Name this view…'
                }
                disabled={streams.length === 0}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={!name.trim() || streams.length === 0}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                title="Save current view"
              >
                <BookmarkPlus size={13} />
                Save
              </button>
            </div>
          </div>

          {/* Saved list */}
          <div className="max-h-72 overflow-y-auto p-1">
            {collections.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                No saved collections yet. Build a multi-view and save it above.
              </p>
            ) : (
              collections.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <button
                    onClick={() => handleLoad(c)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title={`Load: ${c.channels.join(', ')}`}
                  >
                    <Play size={12} className="shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-[var(--text-primary)]">
                        {c.name}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--text-muted)]">
                        {c.channels.length} stream{c.channels.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="shrink-0 rounded p-1 text-[var(--text-muted)] opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    title="Delete collection"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {collections.length > 0 && (
            <div className="flex items-center justify-end border-t border-[var(--border-subtle)] px-2.5 py-1.5">
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={11} />
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
