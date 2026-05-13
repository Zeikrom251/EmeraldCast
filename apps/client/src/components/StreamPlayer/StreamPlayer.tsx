import { useEffect, useRef, useState } from 'react'
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
  masterMuted: boolean
  masterVolume: number
  onRemove: () => void
  onSetMain?: () => void
  onChatSelect?: () => void
  onAudioFocusSelect?: () => void
  onNativeModeToggle?: () => void
  dragHandleRef?: (el: HTMLElement | null) => void
  dragListeners?: React.HTMLAttributes<HTMLElement>
  isDragActive?: boolean
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
        new (elementId: string, options: Record<string, unknown>): TwitchEmbedInstance
        VIDEO_READY: string
      }
    }
  }
}

const TWITCH_EMBED_SRC = 'https://embed.twitch.tv/embed/v1.js'

export function StreamPlayer({
  id,
  channel,
  isMain = false,
  isActiveChat = false,
  isAudioFocus,
  nativeTwitchMode = false,
  masterMuted,
  masterVolume,
  onRemove,
  onSetMain,
  onChatSelect,
  onAudioFocusSelect,
  onNativeModeToggle,
  dragHandleRef,
  dragListeners,
}: Props) {
  const playerRef = useRef<TwitchPlayerInstance | null>(null)
  const masterMutedRef = useRef(masterMuted)
  const masterVolumeRef = useRef(masterVolume)
  const cleanupRef = useRef<(() => void) | null>(null)
  const applyMuteStateRef = useRef<(() => void) | null>(null)
  const isAudioFocusRef = useRef(isAudioFocus)
  const [pendingUnmute, setPendingUnmute] = useState(false)
  const containerId = `twitch-embed-${id}`

  useEffect(() => {
    function createEmbed() {
      if (!window.Twitch?.Embed) return

      const embed = new window.Twitch.Embed(containerId, {
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
        if (playerRef.current) return
        playerRef.current = embed.getPlayer()
        playerRef.current.setVolume(masterVolumeRef.current / 100)
        applyMuteStateRef.current?.()
        const unregister = registerPlayer(id, {
          play: () => playerRef.current?.play(),
          isPaused: () => playerRef.current?.isPaused() ?? false,
        })
        const prevCleanup = cleanupRef.current
        cleanupRef.current = () => {
          prevCleanup?.()
          unregister()
        }
      })
    }

    if (window.Twitch?.Embed) {
      createEmbed()
      return
    }

    if (!document.querySelector(`script[src="${TWITCH_EMBED_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = TWITCH_EMBED_SRC
      script.onload = createEmbed
      document.body.appendChild(script)
    } else {
      const interval = setInterval(() => {
        if (window.Twitch?.Embed) {
          clearInterval(interval)
          createEmbed()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [channel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    masterMutedRef.current = masterMuted

    applyMuteStateRef.current = () => {
      if (masterMutedRef.current) {
        cleanupRef.current?.()
        cleanupRef.current = null
        setPendingUnmute(false)
        playerRef.current?.setMuted(true)
      } else if (hasInteracted()) {
        setPendingUnmute(false)
        playerRef.current?.setMuted(false)
      } else {
        setPendingUnmute(true)
        cleanupRef.current?.()
        cleanupRef.current = onceInteracted(() => {
          if (!masterMutedRef.current) playerRef.current?.setMuted(false)
          setPendingUnmute(false)
        })
      }
    }

    if (playerRef.current) {
      applyMuteStateRef.current()
    }
  }, [masterMuted])

  useEffect(() => {
    isAudioFocusRef.current = isAudioFocus
  }, [isAudioFocus])

  useEffect(() => {
    masterVolumeRef.current = masterVolume
    playerRef.current?.setVolume(masterVolume / 100)
  }, [masterVolume])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  function handleOverlayClick() {
    if (!onAudioFocusSelect) return
    if (isAudioFocusRef.current) return
    onAudioFocusSelect()
  }

  const ringClass = nativeTwitchMode
    ? 'ring-2 ring-purple-500'
    : isAudioFocus === true
      ? 'ring-2 ring-green-500'
      : isActiveChat
        ? 'ring-1 ring-[var(--accent)]/50'
        : ''

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-black',
        ringClass
      )}
    >
      {onNativeModeToggle && (
        <div className="absolute right-2 top-2 z-30">
          <button
            onClick={onNativeModeToggle}
            className={cn(
              'rounded-md p-1.5 shadow-md transition-colors hover:text-white',
              nativeTwitchMode
                ? 'bg-purple-600 text-white hover:bg-purple-500'
                : 'bg-black/70 text-white/80 hover:bg-black/90'
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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2 pr-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            {dragHandleRef && (
              <div
                ref={dragHandleRef}
                {...dragListeners}
                className="pointer-events-auto touch-none cursor-grab rounded bg-black/70 p-1 text-white/70 transition-colors hover:text-white active:cursor-grabbing"
                title="Drag to reorder"
                aria-label="Drag handle"
              >
                <GripVertical size={14} />
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {onSetMain && (
              <button
                onClick={onSetMain}
                className={cn(
                  'pointer-events-auto rounded-md bg-black/70 p-1.5 text-white/80 hover:bg-black/90 hover:text-white',
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
                  'pointer-events-auto rounded-md bg-black/70 p-1.5 text-white/80 hover:bg-black/90 hover:text-white',
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
              className="pointer-events-auto rounded-md bg-black/70 p-1.5 text-white/80 hover:bg-red-600 hover:text-white"
              title="Remove stream"
              aria-label="Remove stream"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {nativeTwitchMode && (
        <div className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-purple-700/80 px-1.5 py-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
            Twitch Mode
          </span>
        </div>
      )}

      {!nativeTwitchMode && (isAudioFocus !== undefined || pendingUnmute) && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-30">
          {pendingUnmute && !masterMuted ? (
            <div className="flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5">
              <Volume2 size={11} className="text-yellow-400" />
              <span className="text-[9px] font-medium text-yellow-300">Click to enable sound</span>
            </div>
          ) : masterMuted ? (
            <div className="rounded-full bg-black/70 p-1">
              <VolumeX size={11} className="text-white/70" />
            </div>
          ) : isAudioFocus ? (
            <div className="rounded-full bg-green-600/90 p-1">
              <Volume2 size={11} className="text-white" />
            </div>
          ) : (
            <div className="rounded-full bg-black/60 p-1">
              <VolumeX size={11} className="text-white/40" />
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
        id={containerId}
        className="h-full w-full"
        style={nativeTwitchMode ? undefined : { pointerEvents: 'none' }}
      />
    </div>
  )
}
