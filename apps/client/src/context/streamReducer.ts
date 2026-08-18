import type { StreamSlot } from '@repo/types'
import type { StreamState } from './StreamContext'

export type StreamAction =
  | { type: 'ADD_STREAM'; channel: string }
  | { type: 'ADD_STREAMS'; channels: string[] }
  | { type: 'REMOVE_STREAM'; id: string }
  | { type: 'REORDER_STREAMS'; streams: StreamSlot[] }
  | { type: 'SET_MAIN'; id: string }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_CHAT_CHANNEL'; channel: string | null }
  | { type: 'SET_CHAT_MODE'; mode: 'channel' | 'unified' }
  | { type: 'SET_AUDIO_FOCUS'; id: string | null }
  | { type: 'TOGGLE_ALL_NATIVE_MODE' }
  | { type: 'TOGGLE_NATIVE_MODE'; id: string }
  | { type: 'LOAD_STREAMS'; streams: StreamSlot[] }
  | { type: 'CLEAR_STREAMS' }

export function makeId(): string {
  return crypto.randomUUID()
}

export function makeSlot(channel: string): StreamSlot {
  return { id: makeId(), channel: channel.toLowerCase().trim(), nativeMode: false }
}

export function reducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'ADD_STREAM': {
      const channel = action.channel.toLowerCase().trim()
      if (!channel || state.streams.some((s) => s.channel === channel)) return state
      const id = makeId()
      const streams = [...state.streams, { id, channel, nativeMode: false }]
      const audioFocusId = state.audioFocusId ?? id
      return { ...state, streams, audioFocusId }
    }
    case 'ADD_STREAMS': {
      const existing = new Set(state.streams.map((s) => s.channel))
      const additions: StreamSlot[] = []
      for (const raw of action.channels) {
        const channel = raw.toLowerCase().trim()
        if (!channel || existing.has(channel)) continue
        existing.add(channel)
        additions.push({ id: makeId(), channel, nativeMode: false })
      }
      if (additions.length === 0) return state
      const streams = [...state.streams, ...additions]
      const audioFocusId = state.audioFocusId ?? additions[0].id
      return { ...state, streams, audioFocusId }
    }
    case 'REMOVE_STREAM': {
      const streams = state.streams.filter((s) => s.id !== action.id)
      const removed = state.streams.find((s) => s.id === action.id)
      const mainId = state.mainId === action.id ? null : state.mainId
      const chatChannel = removed?.channel === state.chatChannel ? null : state.chatChannel

      let audioFocusId = state.audioFocusId
      if (audioFocusId === action.id || (audioFocusId === null && streams.length > 0)) {
        if (streams.length === 0) {
          audioFocusId = null
        } else {
          const mainStillExists = mainId !== null && streams.some((s) => s.id === mainId)
          audioFocusId = mainStillExists ? mainId : (streams[0]?.id ?? null)
        }
      }

      return { ...state, streams, mainId, chatChannel, audioFocusId }
    }
    case 'REORDER_STREAMS':
      return { ...state, streams: action.streams }
    case 'SET_MAIN': {
      const isUnsetting = state.mainId === action.id
      return {
        ...state,
        mainId: isUnsetting ? null : action.id,
        chatChannel: null,
        audioFocusId: isUnsetting ? state.audioFocusId : action.id,
      }
    }
    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }
    case 'SET_CHAT_CHANNEL':
      // Picking a specific channel's chat implies leaving the unified feed.
      return { ...state, chatChannel: action.channel, chatMode: 'channel' }
    case 'SET_CHAT_MODE':
      return { ...state, chatMode: action.mode }
    case 'SET_AUDIO_FOCUS':
      return { ...state, audioFocusId: action.id }
    case 'TOGGLE_ALL_NATIVE_MODE': {
      const next = !state.nativeModeAll
      return {
        ...state,
        nativeModeAll: next,
        streams: state.streams.map((s) => ({ ...s, nativeMode: next })),
      }
    }
    case 'TOGGLE_NATIVE_MODE':
      return {
        ...state,
        streams: state.streams.map((s) =>
          s.id === action.id ? { ...s, nativeMode: !s.nativeMode } : s
        ),
      }
    case 'LOAD_STREAMS': {
      const audioFocusId =
        action.streams.length > 0
          ? state.audioFocusId && action.streams.some((s) => s.id === state.audioFocusId)
            ? state.audioFocusId
            : action.streams[0].id
          : null
      const mainId =
        state.mainId && action.streams.some((s) => s.id === state.mainId) ? state.mainId : null
      return {
        ...state,
        streams: action.streams.map((s) => ({ ...s, nativeMode: s.nativeMode ?? false })),
        mainId,
        audioFocusId,
      }
    }
    case 'CLEAR_STREAMS':
      return {
        ...state,
        streams: [],
        mainId: null,
        chatChannel: null,
        audioFocusId: null,
      }
    default:
      return state
  }
}

/**
 * Builds the state the app starts from.
 *
 * A `?streams=` link always wins over the saved session, so opening someone
 * else's share link never silently merges with — or overwrites — what the tab
 * already had. This runs synchronously as the reducer's initialiser rather than
 * in an effect, so the first paint already has the right streams and nothing
 * ever persists an empty list over a real one.
 */
export function createInitialState(
  search: string,
  savedStreams: StreamSlot[],
  chatOpen: boolean
): StreamState {
  const base: StreamState = {
    streams: [],
    mainId: null,
    chatOpen,
    chatChannel: null,
    chatMode: 'channel',
    audioFocusId: null,
    nativeModeAll: false,
  }

  const params = new URLSearchParams(search)
  const shared = params.get('streams')

  if (!shared) {
    if (savedStreams.length === 0) return base
    return reducer(base, { type: 'LOAD_STREAMS', streams: savedStreams })
  }

  const streams = shared
    .split(',')
    .filter(Boolean)
    .map((channel) => makeSlot(channel))

  let next = reducer(base, { type: 'LOAD_STREAMS', streams })

  // Restore the shared layout: which stream is the main view and which has audio.
  const mainChannel = params.get('main')?.toLowerCase().trim()
  const mainSlot = mainChannel ? streams.find((s) => s.channel === mainChannel) : undefined
  if (mainSlot) next = reducer(next, { type: 'SET_MAIN', id: mainSlot.id })

  const audioChannel = params.get('audio')?.toLowerCase().trim()
  const audioSlot = audioChannel ? streams.find((s) => s.channel === audioChannel) : undefined
  if (audioSlot) next = reducer(next, { type: 'SET_AUDIO_FOCUS', id: audioSlot.id })

  return next
}
