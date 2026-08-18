import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useRef, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { useStream } from '../../context/StreamContext'
import { useStreamStatus } from '../../context/StreamStatusContext'
import { StreamPlayer } from '../StreamPlayer'
import { Discover } from '../Discover'
import { cn } from '../../lib/utils'
import type { StreamSlot } from '@repo/types'

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 560
const RESIZE_HANDLE_WIDTH = 10

function DragPreview({ channel }: { channel: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-[var(--accent)] bg-black/90 shadow-2xl">
      <span className="text-sm font-semibold text-white">{channel}</span>
    </div>
  )
}

function ResizeHandle({ onResizeStart }: { onResizeStart: (startX: number) => void }) {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        onResizeStart(e.clientX)
      }}
      className="group/handle relative flex h-full shrink-0 cursor-col-resize items-center justify-center"
      style={{ width: RESIZE_HANDLE_WIDTH }}
      aria-hidden
    >
      <div className="h-full w-0.5 rounded-full bg-[var(--border-default)] transition-colors group-hover/handle:bg-[var(--accent)] group-active/handle:bg-[var(--accent)]" />
    </div>
  )
}

interface SortablePlayerProps {
  slot: StreamSlot
  isMain: boolean
  isActiveChat: boolean
  isAudioFocus?: boolean
  style?: React.CSSProperties
}

function OfflineBanner({
  channels,
  onRemoveAll,
  onDismiss,
}: {
  channels: string[]
  onRemoveAll: () => void
  onDismiss: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
      <WifiOff size={13} className="shrink-0 text-stone-400" />
      <p className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">
          {channels.length === 1 ? `${channels[0]} is` : `${channels.length} streams are`}
        </span>{' '}
        no longer live
        {channels.length > 1 && (
          <span className="text-[var(--text-muted)]"> — {channels.join(', ')}</span>
        )}
      </p>
      <button
        onClick={onRemoveAll}
        className="shrink-0 rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        Remove {channels.length > 1 ? 'them' : 'it'}
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        title="Dismiss"
        aria-label="Dismiss offline notice"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function SortablePlayer({ slot, isMain, isActiveChat, isAudioFocus, style: extraStyle }: SortablePlayerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id })
  const {
    removeStream,
    setMain,
    audioFocusId,
    toggleNativeMode,
    chatOpen,
    chatChannel,
    setChatChannel,
    setAudioFocus,
    toggleChat,
  } = useStream()
  const { statuses } = useStreamStatus()
  const nativeTwitchMode = slot.nativeMode

  const muted = audioFocusId !== null && slot.id !== audioFocusId

  const onRemove = useCallback(() => removeStream(slot.id), [removeStream, slot.id])
  const onSetMain = useCallback(() => setMain(slot.id), [setMain, slot.id])
  const onNativeModeToggle = useCallback(
    () => toggleNativeMode(slot.id),
    [toggleNativeMode, slot.id]
  )
  const onAudioFocusSelect = useCallback(() => setAudioFocus(slot.id), [setAudioFocus, slot.id])
  const onChatSelect = useCallback(() => {
    if (chatOpen && chatChannel === slot.channel) {
      toggleChat()
    } else {
      setChatChannel(slot.channel)
      setAudioFocus(slot.id)
      if (!chatOpen) toggleChat()
    }
  }, [chatOpen, chatChannel, slot.channel, slot.id, toggleChat, setChatChannel, setAudioFocus])

  const style: React.CSSProperties = isDragging
    ? { opacity: 0, ...extraStyle }
    : { transform: CSS.Transform.toString(transform), transition, ...extraStyle }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-full"
      {...(nativeTwitchMode ? {} : attributes)}
    >
      <StreamPlayer
        id={slot.id}
        channel={slot.channel}
        isMain={isMain}
        isActiveChat={isActiveChat}
        isAudioFocus={isAudioFocus}
        nativeTwitchMode={nativeTwitchMode}
        muted={muted}
        status={statuses[slot.channel]}
        onRemove={onRemove}
        onSetMain={onSetMain}
        onChatSelect={onChatSelect}
        onAudioFocusSelect={onAudioFocusSelect}
        onNativeModeToggle={onNativeModeToggle}
        dragHandleRef={nativeTwitchMode || isMain ? undefined : setActivatorNodeRef}
        dragListeners={
          nativeTwitchMode || isMain ? undefined : (listeners as React.HTMLAttributes<HTMLElement>)
        }
      />
    </div>
  )
}

function getGridCols(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-4'
}

export function StreamGrid() {
  const { streams, mainId, chatChannel, audioFocusId, reorderStreams, removeStream } = useStream()
  const { offlineChannels } = useStreamStatus()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [dismissedOffline, setDismissedOffline] = useState<string[]>([])
  const gridRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Forget dismissals for channels that came back online (or were removed), so a
  // second outage is announced again.
  useEffect(() => {
    setDismissedOffline((prev) => {
      const next = prev.filter((ch) => offlineChannels.includes(ch))
      return next.length === prev.length ? prev : next
    })
  }, [offlineChannels])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    try {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIdx = streams.findIndex((s) => s.id === active.id)
        const newIdx = streams.findIndex((s) => s.id === over.id)
        reorderStreams(arrayMove(streams, oldIdx, newIdx))
      }
    } finally {
      setActiveId(null)
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Resizes by mutating the grid template directly so the players do not
  // re-render on every mouse move; state is committed once on mouse up.
  function startSidebarResize(startX: number) {
    const startWidth = sidebarWidth
    let width = startWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(e: MouseEvent) {
      // handle is left of sidebar → dragging left increases width
      width = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + (startX - e.clientX)))
      if (gridRef.current) {
        gridRef.current.style.gridTemplateColumns = `1fr ${RESIZE_HANDLE_WIDTH}px ${width}px`
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSidebarWidth(width)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (streams.length === 0) {
    return <Discover />
  }

  const activeSlot = activeId ? streams.find((s) => s.id === activeId) : null

  const effectiveMainId = mainId && streams.some((s) => s.id === mainId) ? mainId : null
  const mainSlot = effectiveMainId ? (streams.find((s) => s.id === effectiveMainId) ?? null) : null
  const sideSlots = effectiveMainId ? streams.filter((s) => s.id !== effectiveMainId) : streams

  const isSidebarMode = effectiveMainId !== null && mainSlot !== null && sideSlots.length > 0
  const sideRowCount = Math.max(sideSlots.length, 1)
  const activeChatChannel =
    chatChannel && streams.some((s) => s.channel === chatChannel)
      ? chatChannel
      : isSidebarMode
        ? mainSlot!.channel
        : null

  // A channel that goes offline and comes back should be announced again, so the
  // dismissal is remembered per channel rather than as a single global flag.
  const announcedOffline = offlineChannels.filter((ch) => !dismissedOffline.includes(ch))

  function removeOfflineStreams() {
    for (const slot of streams.filter((s) => announcedOffline.includes(s.channel))) {
      removeStream(slot.id)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        {announcedOffline.length > 0 && (
          <OfflineBanner
            channels={announcedOffline}
            onRemoveAll={removeOfflineStreams}
            onDismiss={() => setDismissedOffline(offlineChannels)}
          />
        )}
        <SortableContext
          items={(isSidebarMode ? sideSlots : streams).map((s) => s.id)}
          strategy={isSidebarMode ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <div
            ref={gridRef}
            className={cn(
              'flex-1 overflow-hidden grid',
              !isSidebarMode && cn('gap-2', getGridCols(streams.length))
            )}
            style={
              isSidebarMode
                ? {
                    gridTemplateColumns: `1fr ${RESIZE_HANDLE_WIDTH}px ${sidebarWidth}px`,
                    gridTemplateRows: `repeat(${sideRowCount}, minmax(0, 1fr))`,
                    rowGap: '0.5rem',
                  }
                : { gridAutoRows: 'minmax(0, 1fr)' }
            }
          >
            {isSidebarMode && (
              <div
                className="h-full"
                style={{ gridColumn: 2, gridRow: `1 / span ${sideRowCount}` }}
              >
                <ResizeHandle onResizeStart={startSidebarResize} />
              </div>
            )}
            {streams.map((slot) => {
              const isMain = isSidebarMode && slot.id === effectiveMainId
              const sideIndex = isSidebarMode ? sideSlots.findIndex((s) => s.id === slot.id) : -1
              return (
                <SortablePlayer
                  key={slot.channel}
                  slot={slot}
                  isMain={isMain}
                  isActiveChat={activeChatChannel === slot.channel}
                  isAudioFocus={streams.length > 1 ? audioFocusId === slot.id : undefined}
                  style={
                    isSidebarMode
                      ? isMain
                        ? { gridColumn: 1, gridRow: `1 / span ${sideRowCount}` }
                        : { gridColumn: 3, gridRow: sideIndex + 1 }
                      : undefined
                  }
                />
              )
            })}
          </div>
        </SortableContext>
      </div>
      <DragOverlay>{activeSlot ? <DragPreview channel={activeSlot.channel} /> : null}</DragOverlay>
    </DndContext>
  )
}
