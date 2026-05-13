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
import { useState } from 'react'
import { useStream } from '../../context/StreamContext'
import { StreamPlayer } from '../StreamPlayer'
import { cn } from '../../lib/utils'
import type { StreamSlot } from '@repo/types'

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
      className="group/handle relative flex shrink-0 cursor-col-resize items-center justify-center"
      style={{ width: 10 }}
      aria-hidden
    >
      <div className="h-full w-0.5 rounded-full bg-[var(--border-default)] transition-colors group-hover/handle:bg-[var(--accent)] group-active/handle:bg-[var(--accent)]" />
    </div>
  )
}

interface SortablePlayerProps {
  slot: StreamSlot
  isMain: boolean
  isAnyDragging: boolean
  isActiveChat?: boolean
  isAudioFocus?: boolean
  onChatSelect?: () => void
  onAudioFocusSelect?: () => void
  className?: string
  style?: React.CSSProperties
}

function SortablePlayer({
  slot,
  isMain,
  isAnyDragging,
  isActiveChat,
  isAudioFocus,
  onChatSelect,
  onAudioFocusSelect,
  className,
  style: extraStyle,
}: SortablePlayerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id })
  const { removeStream, setMain, masterMuted, masterVolume, audioFocusId, toggleNativeMode } =
    useStream()
  const nativeTwitchMode = slot.nativeMode

  const effectiveMuted = masterMuted || (audioFocusId !== null && slot.id !== audioFocusId)

  const style: React.CSSProperties = isDragging
    ? { opacity: 0, ...extraStyle }
    : { transform: CSS.Transform.toString(transform), transition, ...extraStyle }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('h-full', className)}
      {...(nativeTwitchMode ? {} : attributes)}
    >
      <StreamPlayer
        id={slot.id}
        channel={slot.channel}
        isMain={isMain}
        isActiveChat={isActiveChat}
        isAudioFocus={isAudioFocus}
        nativeTwitchMode={nativeTwitchMode}
        masterMuted={effectiveMuted}
        masterVolume={masterVolume}
        onRemove={() => removeStream(slot.id)}
        onSetMain={() => setMain(slot.id)}
        onChatSelect={onChatSelect}
        onAudioFocusSelect={onAudioFocusSelect}
        onNativeModeToggle={() => toggleNativeMode(slot.id)}
        dragHandleRef={nativeTwitchMode || isMain ? undefined : setActivatorNodeRef}
        dragListeners={
          nativeTwitchMode || isMain ? undefined : (listeners as React.HTMLAttributes<HTMLElement>)
        }
        isDragActive={isAnyDragging}
      />
    </div>
  )
}

function getGridCols(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-4'
}

export function StreamGrid() {
  const {
    streams,
    mainId,
    chatChannel,
    chatOpen,
    audioFocusId,
    setChatChannel,
    setAudioFocus,
    toggleChat,
    reorderStreams,
  } = useStream()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(256)

  function handleChatSelect(slot: StreamSlot) {
    if (chatOpen && chatChannel === slot.channel) {
      toggleChat()
    } else {
      setChatChannel(slot.channel)
      setAudioFocus(slot.id)
      if (!chatOpen) toggleChat()
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  function startSidebarResize(startX: number) {
    const startWidth = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(e: MouseEvent) {
      // handle is left of sidebar → dragging left increases width
      const next = Math.max(160, Math.min(560, startWidth + (startX - e.clientX)))
      setSidebarWidth(next)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-medium text-[var(--text-primary)]">No streams yet</p>
        <p className="text-sm text-[var(--text-muted)]">
          Search for a Twitch channel above to get started.
        </p>
      </div>
    )
  }

  const isAnyDragging = activeId !== null
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={isSidebarMode ? sideSlots.map((s) => s.id) : streams.map((s) => s.id)}
        strategy={isSidebarMode ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <div
          className={cn(
            'flex-1 overflow-hidden grid',
            !isSidebarMode && cn('gap-2', getGridCols(streams.length))
          )}
          style={
            isSidebarMode
              ? {
                  gridTemplateColumns: `1fr 10px ${sidebarWidth}px`,
                  gridTemplateRows: `repeat(${sideRowCount}, minmax(0, 1fr))`,
                  rowGap: '0.5rem',
                }
              : { gridAutoRows: 'minmax(0, 1fr)' }
          }
        >
          {isSidebarMode && (
            <div className="h-full" style={{ gridColumn: 2, gridRow: `1 / span ${sideRowCount}` }}>
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
                isAnyDragging={isAnyDragging}
                isActiveChat={activeChatChannel === slot.channel}
                isAudioFocus={streams.length > 1 ? audioFocusId === slot.id : undefined}
                onChatSelect={() => handleChatSelect(slot)}
                onAudioFocusSelect={() => setAudioFocus(slot.id)}
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
      <DragOverlay>{activeSlot ? <DragPreview channel={activeSlot.channel} /> : null}</DragOverlay>
    </DndContext>
  )
}
