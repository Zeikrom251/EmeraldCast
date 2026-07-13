import { memo, useEffect, useRef, useState } from 'react'
import { hasInteracted, onceInteracted } from '../../lib/interaction'
import { registerPlayer } from '../../lib/twitchRegistry'
import {
  X,
  GripVertical,
  Expand,
  Shrink,
  MessageSquare,
  Volume2,
  VolumeX,
  Tv2,
  Gamepad2,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  id: string
  channel: string
  isMain?: boolean
  isActiveChat?: boolean
  isAudioFocus?: boolean
  nativeTwitchMode?: boolean
  muted: boolean
  onRemove: () => void
  onSetMain?: () => void
  onChatSelect?: () => void
  onAudioFocusSelect?: () => void
  onNativeModeToggle?: () => void
  dragHandleRef?: (el: HTMLElement | null) => void
  dragListeners?: React.HTMLAttributes<HTMLElement>
}

interface TwitchPlayerInstance {
  setMuted: (muted: boolean) => void
  setVolume: (vol: number) => void
  play: () => void
  isPaused: () => boolean
}

interface TwitchEmbedInstance {
  addEventListener: (event: string, callback: () => void) => void
  getPlayer: () => TwitchPlayerInstance
}

declare global {
  interface Window {
    Twitch?: {
      Embed: {
        new (element: HTMLElement, options: Record<string, unknown>): TwitchEmbedInstance
        VIDEO_READY: string
      }
    }
  }
}

const TWITCH_EMBED_SRC = 'https://embed.twitch.tv/embed/v1.js'
const DEFAULT_VOLUME = 0.5

let embedScriptPromise: Promise<void> | null = null

function loadEmbedScript(): Promise<void> {
  if (window.Twitch?.Embed) return Promise.resolve()
  if (!embedScriptPromise) {
    embedScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TWITCH_EMBED_SRC}"]`
      )
      const script = existing ?? document.createElement('script')
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => {
        embedScriptPromise = null
        reject(new Error('Failed to load Twitch embed script'))
      })
      if (!existing) {
        script.src = TWITCH_EMBED_SRC
        document.body.appendChild(script)
      }
    })
  }
  return embedScriptPromise
}

export const StreamPlayer = memo(function StreamPlayer({
  id,
  channel,
  isMain = false,
  isActiveChat = false,
  isAudioFocus,
  nativeTwitchMode = false,
  muted,
  onRemove,
  onSetMain,
  onChatSelect,
  onAudioFocusSelect,
  onNativeModeToggle,
  dragHandleRef,
  dragListeners,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<TwitchPlayerInstance | null>(null)
  const mutedRef = useRef(muted)
  const [ready, setReady] = useState(false)
  const [pendingUnmute, setPendingUnmute] = useState(false)
  mutedRef.current = muted

  // Creates the embed exactly once per channel; the cleanup tears the iframe
  // down so remounts and HMR updates can never leave a second, uncontrollable
  // player behind in the same container.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false

    loadEmbedScript()
      .then(() => {
        if (cancelled || !window.Twitch?.Embed || !container.isConnected) return

        const embed = new window.Twitch.Embed(container, {
          width: '100%',
          height: '100%',
          channel,
          layout: 'video',
          autoplay: true,
          muted: true,
          allowfullscreen: true,
          parent: [window.location.hostname],
        })

        embed.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
          if (cancelled || playerRef.current) return
          playerRef.current = embed.getPlayer()
          playerRef.current.setVolume(DEFAULT_VOLUME)
          setReady(true)
        })
      })
      .catch(() => {
        // embed script unavailable — the container simply stays empty
      })

    return () => {
      cancelled = true
      playerRef.current = null
      setReady(false)
      container.replaceChildren()
    }
  }, [channel])

  // Registers the player for cross-player coordination, independent of any
  // mute-state bookkeeping so unregistration can never be lost.
  useEffect(() => {
    if (!ready) return
    return registerPlayer(id, {
      play: () => playerRef.current?.play(),
      isPaused: () => playerRef.current?.isPaused() ?? false,
    })
  }, [ready, id])

  // Applies the mute state whenever it changes or the player becomes ready.
  // Unmuting before the first user interaction is deferred until one happens,
  // since browsers block autoplaying audio without a gesture.
  useEffect(() => {
    const player = playerRef.current
    if (!ready || !player) return

    if (muted) {
      setPendingUnmute(false)
      player.setMuted(true)
      return
    }
    if (hasInteracted()) {
      setPendingUnmute(false)
      player.setMuted(false)
      return
    }
    setPendingUnmute(true)
    const unsubscribe = onceInteracted(() => {
      if (!mutedRef.current) playerRef.current?.setMuted(false)
      setPendingUnmute(false)
    })
    return unsubscribe
  }, [ready, muted])

  function handleOverlayClick() {
    if (!onAudioFocusSelect || isAudioFocus) return
    onAudioFocusSelect()
  }

  const focusFrame = nativeTwitchMode
    ? 'border-purple-500 shadow-[inset_0_0_12px_rgba(168,85,247,0.35)]'
    : isAudioFocus === true
      ? 'border-[var(--accent)] shadow-[inset_0_0_12px_var(--accent-glow)]'
      : isActiveChat
        ? 'border-[var(--accent)]/40'
        : null

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-black">
      {/* Selection frame drawn inside the card so it can never be clipped by
          the grid container, and above the iframe so it is always visible */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-20 rounded-xl transition-colors duration-200',
          focusFrame ? cn('border-2', focusFrame) : 'border border-[var(--border-subtle)]'
        )}
      />

      {onNativeModeToggle && (
        <div className="absolute right-2 top-2 z-30 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onNativeModeToggle}
            className={cn(
              'rounded-lg p-1.5 backdrop-blur-md transition-colors',
              nativeTwitchMode
                ? 'bg-purple-600/90 text-white hover:bg-purple-500'
                : 'bg-black/60 text-white/80 hover:bg-black/80 hover:text-white'
            )}
            title={nativeTwitchMode ? 'Switch to EmeraldCast mode' : 'Switch to Native Twitch mode'}
            aria-label={
              nativeTwitchMode ? 'Switch to EmeraldCast mode' : 'Switch to Native Twitch mode'
            }
          >
            {nativeTwitchMode ? <Gamepad2 size={14} /> : <Tv2 size={14} />}
          </button>
        </div>
      )}

      {!nativeTwitchMode && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent p-2 pb-6 pr-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            {dragHandleRef && (
              <div
                ref={dragHandleRef}
                {...dragListeners}
                className="pointer-events-auto touch-none cursor-grab rounded-lg bg-black/60 p-1.5 text-white/70 backdrop-blur-md transition-colors hover:text-white active:cursor-grabbing"
                title="Drag to reorder"
                aria-label="Drag handle"
              >
                <GripVertical size={14} />
              </div>
            )}
            <span className="rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
              {channel}
            </span>
          </div>
          <div className="flex gap-1">
            {onSetMain && (
              <button
                onClick={onSetMain}
                className={cn(
                  'pointer-events-auto rounded-lg bg-black/60 p-1.5 text-white/80 backdrop-blur-md transition-colors hover:bg-black/80 hover:text-white',
                  isMain && 'text-[var(--accent)]'
                )}
                title={isMain ? 'Exit main view' : 'Set as main stream'}
                aria-label={isMain ? 'Exit main view' : 'Set as main stream'}
              >
                {isMain ? <Shrink size={14} /> : <Expand size={14} />}
              </button>
            )}
            {onChatSelect && (
              <button
                onClick={onChatSelect}
                className={cn(
                  'pointer-events-auto rounded-lg bg-black/60 p-1.5 text-white/80 backdrop-blur-md transition-colors hover:bg-black/80 hover:text-white',
                  isActiveChat && 'text-[var(--accent)]'
                )}
                title={isActiveChat ? 'Active chat' : 'Switch chat to this stream'}
                aria-label={isActiveChat ? 'Active chat' : 'Switch chat to this stream'}
              >
                <MessageSquare size={14} />
              </button>
            )}
            <button
              onClick={onRemove}
              className="pointer-events-auto rounded-lg bg-black/60 p-1.5 text-white/80 backdrop-blur-md transition-colors hover:bg-red-600/90 hover:text-white"
              title="Remove stream"
              aria-label="Remove stream"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {nativeTwitchMode && (
        <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1 rounded-lg bg-purple-600/90 px-2 py-1 backdrop-blur-md">
          <Gamepad2 size={11} className="text-white" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
            Twitch Mode
          </span>
        </div>
      )}

      {!nativeTwitchMode && (isAudioFocus !== undefined || pendingUnmute) && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-30">
          {pendingUnmute && !muted ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 backdrop-blur-md">
              <Volume2 size={11} className="text-amber-400" />
              <span className="text-[10px] font-medium text-amber-300">
                Click anywhere to enable sound
              </span>
            </div>
          ) : isAudioFocus ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)]/90 px-2 py-1 backdrop-blur-md">
              <Volume2 size={11} className="text-white" />
              <span className="text-[10px] font-semibold text-white">Audio</span>
            </div>
          ) : (
            <div className="rounded-lg bg-black/50 p-1.5 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
              <VolumeX size={11} className="text-white/50" />
            </div>
          )}
        </div>
      )}

      {!nativeTwitchMode && (
        <div
          className={cn(
            'absolute inset-0 z-10',
            onAudioFocusSelect && !isAudioFocus && 'cursor-pointer'
          )}
          onClick={handleOverlayClick}
        />
      )}

      <div
        ref={containerRef}
        className="h-full w-full"
        style={nativeTwitchMode ? undefined : { pointerEvents: 'none' }}
      />
    </div>
  )
})
