import { useReducer, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import type { StreamSlot } from '@repo/types'
import { getActiveStreams, saveActiveStreams, subscribeToStorage, STORAGE_KEYS } from '@repo/utils'
import { StreamContext } from './StreamContext'
import { createInitialState, makeSlot, reducer } from './streamReducer'

const CHAT_OPEN_KEY = 'ec_chat_open'

export function StreamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(
      window.location.search,
      getActiveStreams(),
      localStorage.getItem(CHAT_OPEN_KEY) === 'true'
    )
  )

  // The serialised form of what storage is known to hold. It is the pivot for
  // cross-tab sync: writes that would not change it are skipped, and inbound
  // changes that match it are ignored, so two tabs cannot ping-pong updates at
  // each other forever.
  const persistedRef = useRef<string>(JSON.stringify(state.streams))

  useEffect(() => {
    const serialized = JSON.stringify(state.streams)
    if (serialized === persistedRef.current) return
    persistedRef.current = serialized
    saveActiveStreams(state.streams)
  }, [state.streams])

  useEffect(
    () =>
      subscribeToStorage(STORAGE_KEYS.streams, () => {
        const streams = getActiveStreams()
        const serialized = JSON.stringify(streams)
        if (serialized === persistedRef.current) return
        persistedRef.current = serialized
        dispatch({ type: 'LOAD_STREAMS', streams })
      }),
    []
  )

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_KEY, String(state.chatOpen))
  }, [state.chatOpen])

  const addStream = useCallback((channel: string) => dispatch({ type: 'ADD_STREAM', channel }), [])
  const addStreams = useCallback(
    (channels: string[]) => dispatch({ type: 'ADD_STREAMS', channels }),
    []
  )
  const loadChannels = useCallback((channels: string[], main?: string | null) => {
    const streams: StreamSlot[] = channels.filter(Boolean).map((ch) => makeSlot(ch))
    dispatch({ type: 'LOAD_STREAMS', streams })
    const mainChannel = main?.toLowerCase().trim()
    const mainSlot = mainChannel ? streams.find((s) => s.channel === mainChannel) : undefined
    if (mainSlot) dispatch({ type: 'SET_MAIN', id: mainSlot.id })
  }, [])
  const removeStream = useCallback((id: string) => dispatch({ type: 'REMOVE_STREAM', id }), [])
  const clearStreams = useCallback(() => dispatch({ type: 'CLEAR_STREAMS' }), [])
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
  const setChatMode = useCallback(
    (mode: 'channel' | 'unified') => dispatch({ type: 'SET_CHAT_MODE', mode }),
    []
  )
  const setAudioFocus = useCallback(
    (id: string | null) => dispatch({ type: 'SET_AUDIO_FOCUS', id }),
    []
  )
  const toggleAllNativeMode = useCallback(() => dispatch({ type: 'TOGGLE_ALL_NATIVE_MODE' }), [])
  const toggleNativeMode = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_NATIVE_MODE', id }),
    []
  )

  const value = useMemo(
    () => ({
      ...state,
      addStream,
      addStreams,
      loadChannels,
      removeStream,
      clearStreams,
      reorderStreams,
      setMain,
      toggleChat,
      setChatChannel,
      setChatMode,
      setAudioFocus,
      toggleAllNativeMode,
      toggleNativeMode,
    }),
    [
      state,
      addStream,
      addStreams,
      loadChannels,
      removeStream,
      clearStreams,
      reorderStreams,
      setMain,
      toggleChat,
      setChatChannel,
      setChatMode,
      setAudioFocus,
      toggleAllNativeMode,
      toggleNativeMode,
    ]
  )

  return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>
}
