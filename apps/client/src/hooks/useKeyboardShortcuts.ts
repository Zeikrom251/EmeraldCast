import { useEffect } from 'react'
import { useStream } from '../context/StreamContext'

export interface Shortcut {
  keys: string
  description: string
}

/** Source of truth for the help overlay, so the list can never drift from the handler. */
export const SHORTCUTS: Shortcut[] = [
  { keys: '1 – 9', description: 'Give audio to the nth stream' },
  { keys: 'M', description: 'Mute every stream' },
  { keys: 'F', description: 'Fullscreen the focused stream' },
  { keys: 'C', description: 'Show or hide chat' },
  { keys: 'U', description: 'Toggle unified chat' },
  { keys: 'T', description: 'Toggle Twitch / EmeraldCast mode' },
  { keys: 'X', description: 'Close the focused stream' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Esc', description: 'Close help or exit fullscreen' },
]

/**
 * Returns true when the keystroke belongs to whatever the user is typing in,
 * so a search box never loses characters to a shortcut.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function toggleFullscreen(streamId: string): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }
  const tile = document.querySelector<HTMLElement>(`[data-stream-id="${CSS.escape(streamId)}"]`)
  void tile?.requestFullscreen?.().catch(() => {
    // Denied (no user gesture, or nested in a restricted iframe) — nothing to do.
  })
}

/**
 * Global single-key shortcuts for driving a multi-view without the mouse.
 *
 * Keys are read from `event.key`, so they follow the user's keyboard layout;
 * chords (Ctrl/Cmd/Alt) are left alone so browser and OS shortcuts keep working.
 */
export function useKeyboardShortcuts(onShowHelp: () => void): void {
  const {
    streams,
    mainId,
    audioFocusId,
    setAudioFocus,
    toggleChat,
    setChatMode,
    chatMode,
    chatOpen,
    toggleAllNativeMode,
    removeStream,
  } = useStream()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const focusedId = audioFocusId ?? mainId ?? streams[0]?.id ?? null

      if (event.key >= '1' && event.key <= '9') {
        const slot = streams[Number(event.key) - 1]
        if (!slot) return
        event.preventDefault()
        setAudioFocus(slot.id)
        return
      }

      switch (event.key.toLowerCase()) {
        case 'm':
          if (streams.length === 0) return
          event.preventDefault()
          setAudioFocus(null)
          break
        case 'f':
          if (!focusedId) return
          event.preventDefault()
          toggleFullscreen(focusedId)
          break
        case 'c':
          if (streams.length === 0) return
          event.preventDefault()
          toggleChat()
          break
        case 'u': {
          if (streams.length === 0) return
          event.preventDefault()
          setChatMode(chatMode === 'unified' ? 'channel' : 'unified')
          // Switching feeds is meaningless while the panel is closed, so open it.
          if (!chatOpen) toggleChat()
          break
        }
        case 't':
          if (streams.length === 0) return
          event.preventDefault()
          toggleAllNativeMode()
          break
        case 'x':
          if (!focusedId) return
          event.preventDefault()
          removeStream(focusedId)
          break
        case '?':
          event.preventDefault()
          onShowHelp()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    streams,
    mainId,
    audioFocusId,
    chatMode,
    chatOpen,
    setAudioFocus,
    toggleChat,
    setChatMode,
    toggleAllNativeMode,
    removeStream,
    onShowHelp,
  ])
}
