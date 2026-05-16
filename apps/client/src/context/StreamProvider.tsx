import { useReducer, useEffect, useCallback, type ReactNode } from 'react'
import type { StreamSlot, LayoutType } from '@repo/types'
import { getActiveStreams, saveActiveStreams } from '@repo/utils'
import { StreamContext, type StreamState } from './StreamContext'

type StreamAction =
  | { type: 'ADD_STREAM'; channel: string }
  | { type: 'REMOVE_STREAM'; id: string }
  | { type: 'REORDER_STREAMS'; streams: StreamSlot[] }
  | { type: 'SET_MAIN'; id: string }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_CHAT_CHANNEL'; channel: string | null }
  | { type: 'SET_AUDIO_FOCUS'; id: string | null }
  | { type: 'TOGGLE_MUTE_ALL' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'TOGGLE_ALL_NATIVE_MODE' }
  | { type: 'TOGGLE_NATIVE_MODE'; id: string }
  | { type: 'SET_LAYOUT'; layout: LayoutType }
  | { type: 'LOAD_STREAMS'; streams: StreamSlot[] }

function makeId(): string {
  return crypto.randomUUID()
}

function reducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'ADD_STREAM': {
      const channel = action.channel.toLowerCase().trim()
      if (!channel || state.streams.some((s) => s.channel === channel)) return state
      const id = makeId()
      const slot: StreamSlot = { id, channel, muted: false, focused: false, nativeMode: false }
      const streams = [...state.streams, slot]
      const audioFocusId = state.audioFocusId ?? id
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
      return { ...state, chatChannel: action.channel }
    case 'SET_AUDIO_FOCUS':
      return { ...state, audioFocusId: action.id }
    case 'TOGGLE_MUTE_ALL':
      return { ...state, masterMuted: !state.masterMuted }
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
    case 'SET_LAYOUT':
      return { ...state, layoutType: action.layout }
    case 'SET_VOLUME':
      return { ...state, masterVolume: Math.max(0, Math.min(100, action.volume)) }
    case 'LOAD_STREAMS': {
      const audioFocusId =
        action.streams.length > 0
          ? state.audioFocusId && action.streams.some((s) => s.id === state.audioFocusId)
            ? state.audioFocusId
            : action.streams[0].id
          : null
      return {
        ...state,
        streams: action.streams.map((s) => ({ ...s, nativeMode: s.nativeMode ?? false })),
        audioFocusId,
      }
    }
    default:
      return state
  }
}

const CHAT_OPEN_KEY = 'ec_chat_open'

function getInitialState(): StreamState {
  return {
    streams: [],
    mainId: null,
    chatOpen: localStorage.getItem(CHAT_OPEN_KEY) === 'true',
    chatChannel: null,
    audioFocusId: null,
    masterMuted: false,
    masterVolume: 50,
    nativeModeAll: false,
    layoutType: 'grid',
  }
}

export function StreamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlChannels = params.get('streams')

    if (urlChannels) {
      const channels = urlChannels.split(',').filter(Boolean)
      const streams: StreamSlot[] = channels.map((ch) => ({
        id: makeId(),
        channel: ch.toLowerCase().trim(),
        muted: false,
        focused: false,
        nativeMode: false,
      }))
      dispatch({ type: 'LOAD_STREAMS', streams })
    } else {
      const saved = getActiveStreams()
      if (saved.length > 0) {
        dispatch({ type: 'LOAD_STREAMS', streams: saved })
      }
    }
  }, [])

  useEffect(() => {
    saveActiveStreams(state.streams)
  }, [state.streams])

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_KEY, String(state.chatOpen))
  }, [state.chatOpen])

  const addStream = useCallback((channel: string) => dispatch({ type: 'ADD_STREAM', channel }), [])
  const removeStream = useCallback((id: string) => dispatch({ type: 'REMOVE_STREAM', id }), [])
  const reorderStreams = useCallback(
    (streams: StreamSlot[]) => dispatch({ type: 'REORDER_STREAMS', streams }),
    []
  )
  const setMain = useCallback((id: string) => dispatch({ type: 'SET_MAIN', id }), [])
  const toggleChat = useCallback(() => dispatch({ type: 'TOGGLE_CHAT' }), [])
  const setChatChannel = useCallback(
    (channel: string | null) => dispatch({ type: 'SET_CHAT_CHANNEL', channel }),
    []
  )
  const setAudioFocus = useCallback(
    (id: string | null) => dispatch({ type: 'SET_AUDIO_FOCUS', id }),
    []
  )
  const toggleMuteAll = useCallback(() => dispatch({ type: 'TOGGLE_MUTE_ALL' }), [])
  const setVolume = useCallback((volume: number) => dispatch({ type: 'SET_VOLUME', volume }), [])
  const toggleAllNativeMode = useCallback(() => dispatch({ type: 'TOGGLE_ALL_NATIVE_MODE' }), [])
  const toggleNativeMode = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_NATIVE_MODE', id }),
    []
  )
  const setLayout = useCallback(
    (layout: LayoutType) => dispatch({ type: 'SET_LAYOUT', layout }),
    []
  )

  return (
    <StreamContext.Provider
      value={{
        ...state,
        addStream,
        removeStream,
        reorderStreams,
        setMain,
        toggleChat,
        setChatChannel,
        setAudioFocus,
        toggleMuteAll,
        setVolume,
        toggleAllNativeMode,
        toggleNativeMode,
        setLayout,
      }}
    >
      {children}
    </StreamContext.Provider>
  )
}
