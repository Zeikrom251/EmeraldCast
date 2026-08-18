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
  Tv2,
  Gamepad2,
  Eye,
  Clock,
  WifiOff,
} from 'lucide-react'
import type { StreamStatus } from '@repo/types'
import { cn, formatUptime, formatViewerCount } from '../../lib/utils'

interface Props {
  id: string
  channel: string
  isMain?: boolean
  isActiveChat?: boolean
  isAudioFocus?: boolean
  nativeTwitchMode?: boolean
  muted: boolean
  /** Latest polled live state; undefined until the first poll returns. */
  status?: StreamStatus
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
  addEventListener: (event: string, callback: () => void) => void
  removeEventListener?: (event: string, callback: () => void) => void
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
      Player?: {
        PLAY: string
        PAUSE: string
        PLAYING: string
        PLAYBACK_BLOCKED: string
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
  status,
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
  const nativeModeRef = useRef(nativeTwitchMode)
  const hoveredRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [pendingUnmute, setPendingUnmute] = useState(false)
  mutedRef.current = muted
  nativeModeRef.current = nativeTwitchMode

  // Creates the embed exactly once per channel; the cleanup tears the iframe
  // down so remounts and HMR updates can never leave a second, uncontrollable
  // player behind in the same container.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let startupTimer: number | undefined
    let keepAliveTimer: number | undefined
    let listenerPlayer: TwitchPlayerInstance | undefined
    const listeners: Array<[string, () => void]> = []

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
          const player = embed.getPlayer()
          playerRef.current = player
          player.setVolume(DEFAULT_VOLUME)

          // Twitch refuses to *auto*play whenever it can't confirm the embed is
          // fully visible (it reports "minimum requirements for autoplay were
          // not met: style visibility"). An explicit play() call overrides that
          // gate, but the player's isPaused() reports false optimistically right
          // after load even while playback is actually blocked, so it can't be
          // trusted as a guard for the initial start — we just re-issue play()
          // unconditionally a handful of times across the first few seconds
          // (a no-op once it is actually playing).
          const kick = () => {
            if (cancelled) return
            try {
              player.play()
            } catch {
              // player not ready for this call yet; a later tick retries
            }
          }

          let plays = 0
          startupTimer = window.setInterval(() => {
            kick()
            if (cancelled || (plays += 1) >= 12) {
              window.clearInterval(startupTimer)
              startupTimer = undefined
            }
          }, 400)

          // Persistent keep-alive. Beyond the initial autoplay gate, the stream
          // can get paused later by things outside our control: a pre-roll ad
          // ending, a rebuffer, or Twitch's visibility observer reacting to the
          // hover controls overlapping the iframe. In EmeraldCast mode the user
          // cannot pause deliberately (the iframe is pointer-events:none), so any
          // pause is unintended and we resume it — but we skip while the tile is
          // hovered, because the controls are on top of the video then and
          // fighting that just rebuffers; the stream resumes the instant the
          // pointer leaves.
          const resume = () => {
            if (cancelled || nativeModeRef.current || hoveredRef.current) return
            try {
              if (playerRef.current?.isPaused()) playerRef.current.play()
            } catch {
              // ignore; the next tick retries
            }
          }
          keepAliveTimer = window.setInterval(resume, 1500)

          const wire = (event: string | undefined, handler: () => void) => {
            if (!event) return
            try {
              listenerPlayer = player
              listeners.push([event, handler])
              player.addEventListener(event, handler)
            } catch {
              // embed build without this event constant — safe to skip
            }
          }
          wire(window.Twitch?.Player?.PLAYBACK_BLOCKED, kick)
          wire(window.Twitch?.Player?.PAUSE, resume)

          kick()
          setReady(true)
        })
      })
      .catch(() => {
        // embed script unavailable — the container simply stays empty
      })

    return () => {
      cancelled = true
      if (startupTimer !== undefined) window.clearInterval(startupTimer)
      if (keepAliveTimer !== undefined) window.clearInterval(keepAliveTimer)
      if (listenerPlayer) {
        for (const [event, handler] of listeners) {
          listenerPlayer.removeEventListener?.(event, handler)
        }
      }
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

  const isOffline = status?.isLive === false
  // Recomputed per render, which the status poll triggers every minute — the
  // same granularity the label is displayed at, so no extra timer is needed.
  const uptime = status?.isLive ? formatUptime(status.startedAt) : null

  function handleOverlayClick() {
    if (!onAudioFocusSelect || isAudioFocus) return
    onAudioFocusSelect()
  }

  // The selection frame is drawn as an `outline` on the iframe container rather
  // than as an element layered on top of it. Twitch's player refuses to play —
  // even via an explicit play() call — whenever any full-rect element covers the
  // iframe's box (a transparent-centred border div still counts), so an overlay
  // frame silently blocked autoplay. An outline paints over the edges without
  // being an occluding box, so playback starts and the frame stays visible.
  const frameOutline: React.CSSProperties = isOffline
    ? { outline: '2px solid rgb(120 113 108)', outlineOffset: '-2px' }
    : nativeTwitchMode
    ? { outline: '2px solid rgb(168 85 247)', outlineOffset: '-2px' }
    : isAudioFocus === true
      ? { outline: '2px solid var(--accent)', outlineOffset: '-2px' }
      : isActiveChat
        ? { outline: '2px solid color-mix(in srgb, var(--accent) 40%, transparent)', outlineOffset: '-2px' }
        : { outline: '1px solid var(--border-subtle)', outlineOffset: '-1px' }

  return (
    <div
      // Lets the fullscreen shortcut find this tile without threading a ref
      // through the sortable wrapper.
      data-stream-id={id}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-black"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
    >
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
            {status?.isLive && (
              <span className="flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
                <span className="flex items-center gap-1">
                  <Eye size={10} className="text-red-400" />
                  {formatViewerCount(status.viewerCount)}
                </span>
                {uptime && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {uptime}
                  </span>
                )}
              </span>
            )}
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

      {/* The only badge shown at rest rather than on hover: it marks a tile whose
          broadcast has ended, so there is no playback left for it to occlude. It
          is kept small and in the corner for the same reason the others are
          hover-gated — Twitch blocks playback under a full-rect overlay. */}
      {isOffline && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1 backdrop-blur-md">
          <WifiOff size={11} className="text-stone-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-300">
            Offline
          </span>
        </div>
      )}

      {/* Persistent state (native mode, audio focus) is shown via the container
          outline; these badges only appear on hover so they never occlude the
          iframe at rest (an opacity-0 element is not treated as an occluder). */}
      {nativeTwitchMode && (
        <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1 rounded-lg bg-purple-600/90 px-2 py-1 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
          <Gamepad2 size={11} className="text-white" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
            Twitch Mode
          </span>
        </div>
      )}

      {!nativeTwitchMode && (isAudioFocus !== undefined || pendingUnmute) && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
          ) : null}
        </div>
      )}

      {/* Click-to-focus catcher. It sits BELOW the iframe in the stacking order
          (z-0 vs the container's z-[1]) so it never visually covers the player —
          browsers pause / refuse to play an iframe they consider occluded by an
          overlay. Clicks still reach it because the iframe container is
          pointer-events:none, so pointer events fall straight through to here. */}
      {!nativeTwitchMode && (
        <div
          className={cn(
            'absolute inset-0 z-0',
            onAudioFocusSelect && !isAudioFocus && 'cursor-pointer'
          )}
          onClick={handleOverlayClick}
        />
      )}

      <div
        ref={containerRef}
        className="relative z-[1] h-full w-full rounded-xl transition-[outline-color] duration-200"
        style={nativeTwitchMode ? frameOutline : { ...frameOutline, pointerEvents: 'none' }}
      />
    </div>
  )
})
