import { describe, expect, it } from 'vitest'
import type { StreamSlot } from '@repo/types'
import type { StreamState } from './StreamContext'
import { createInitialState, reducer } from './streamReducer'

function stateWith(channels: string[]): StreamState {
  const base: StreamState = {
    streams: [],
    mainId: null,
    chatOpen: false,
    chatChannel: null,
    chatMode: 'channel',
    audioFocusId: null,
    nativeModeAll: false,
  }
  return channels.reduce((state, channel) => reducer(state, { type: 'ADD_STREAM', channel }), base)
}

const slots = (state: StreamState): string[] => state.streams.map((s) => s.channel)

describe('ADD_STREAM', () => {
  it('normalises the channel and gives the first stream audio focus', () => {
    const state = reducer(stateWith([]), { type: 'ADD_STREAM', channel: '  ShRoUd ' })
    expect(slots(state)).toEqual(['shroud'])
    expect(state.audioFocusId).toBe(state.streams[0].id)
  })

  it('ignores duplicates and blank channels', () => {
    const state = stateWith(['shroud'])
    expect(reducer(state, { type: 'ADD_STREAM', channel: 'SHROUD' })).toBe(state)
    expect(reducer(state, { type: 'ADD_STREAM', channel: '   ' })).toBe(state)
  })

  it('leaves audio focus on the existing stream', () => {
    const state = stateWith(['a', 'b'])
    expect(state.audioFocusId).toBe(state.streams[0].id)
  })
})

describe('ADD_STREAMS', () => {
  it('adds only the channels that are not already open', () => {
    const state = reducer(stateWith(['a']), { type: 'ADD_STREAMS', channels: ['A', 'b', 'b', 'c'] })
    expect(slots(state)).toEqual(['a', 'b', 'c'])
  })

  it('returns the same state when every channel is a duplicate', () => {
    const state = stateWith(['a'])
    expect(reducer(state, { type: 'ADD_STREAMS', channels: ['a'] })).toBe(state)
  })
})

describe('REMOVE_STREAM', () => {
  it('moves audio focus to the main stream when the focused one is removed', () => {
    let state = stateWith(['a', 'b', 'c'])
    const [a, b] = state.streams
    state = reducer(state, { type: 'SET_MAIN', id: b.id })
    state = reducer(state, { type: 'SET_AUDIO_FOCUS', id: a.id })

    state = reducer(state, { type: 'REMOVE_STREAM', id: a.id })

    expect(state.audioFocusId).toBe(b.id)
  })

  it('falls back to the first remaining stream when the main view is the one removed', () => {
    let state = stateWith(['a', 'b', 'c'])
    const [a, b] = state.streams
    state = reducer(state, { type: 'SET_MAIN', id: a.id })

    state = reducer(state, { type: 'REMOVE_STREAM', id: a.id })

    expect(state.mainId).toBeNull()
    expect(state.audioFocusId).toBe(b.id)
  })

  it('clears audio focus and chat when the last stream goes', () => {
    let state = stateWith(['a'])
    const [a] = state.streams
    state = reducer(state, { type: 'SET_CHAT_CHANNEL', channel: 'a' })

    state = reducer(state, { type: 'REMOVE_STREAM', id: a.id })

    expect(state.streams).toEqual([])
    expect(state.audioFocusId).toBeNull()
    expect(state.chatChannel).toBeNull()
  })

  it('keeps the pinned chat of a stream that was not removed', () => {
    let state = stateWith(['a', 'b'])
    const [a, b] = state.streams
    state = reducer(state, { type: 'SET_CHAT_CHANNEL', channel: 'b' })

    state = reducer(state, { type: 'REMOVE_STREAM', id: a.id })

    expect(state.chatChannel).toBe('b')
    expect(state.audioFocusId).toBe(b.id)
  })

  it('adopts a focus when none was set and streams remain', () => {
    let state = stateWith(['a', 'b'])
    const [a] = state.streams
    state = reducer(state, { type: 'SET_AUDIO_FOCUS', id: null })

    state = reducer(state, { type: 'REMOVE_STREAM', id: a.id })

    expect(state.audioFocusId).toBe(state.streams[0].id)
  })
})

describe('SET_MAIN', () => {
  it('takes audio focus with it and drops the pinned chat', () => {
    let state = stateWith(['a', 'b'])
    const [, b] = state.streams
    state = reducer(state, { type: 'SET_CHAT_CHANNEL', channel: 'a' })

    state = reducer(state, { type: 'SET_MAIN', id: b.id })

    expect(state.mainId).toBe(b.id)
    expect(state.audioFocusId).toBe(b.id)
    expect(state.chatChannel).toBeNull()
  })

  it('unsets the main view when re-applied to the same stream, keeping audio', () => {
    let state = stateWith(['a', 'b'])
    const [, b] = state.streams
    state = reducer(state, { type: 'SET_MAIN', id: b.id })

    state = reducer(state, { type: 'SET_MAIN', id: b.id })

    expect(state.mainId).toBeNull()
    expect(state.audioFocusId).toBe(b.id)
  })
})

describe('native mode', () => {
  it('applies the global toggle to every stream', () => {
    const state = reducer(stateWith(['a', 'b']), { type: 'TOGGLE_ALL_NATIVE_MODE' })
    expect(state.nativeModeAll).toBe(true)
    expect(state.streams.every((s) => s.nativeMode)).toBe(true)
  })

  it('toggles a single stream without touching the others', () => {
    const start = stateWith(['a', 'b'])
    const state = reducer(start, { type: 'TOGGLE_NATIVE_MODE', id: start.streams[0].id })
    expect(state.streams.map((s) => s.nativeMode)).toEqual([true, false])
  })
})

describe('chat mode', () => {
  it('drops back to channel chat when a specific chat is pinned', () => {
    let state = reducer(stateWith(['a', 'b']), { type: 'SET_CHAT_MODE', mode: 'unified' })
    state = reducer(state, { type: 'SET_CHAT_CHANNEL', channel: 'b' })
    expect(state.chatMode).toBe('channel')
  })
})

describe('LOAD_STREAMS', () => {
  it('keeps a still-present audio focus and drops a stale main view', () => {
    const restored: StreamSlot[] = [
      { id: 'x', channel: 'a', nativeMode: false },
      { id: 'y', channel: 'b', nativeMode: false },
    ]
    const start: StreamState = { ...stateWith([]), audioFocusId: 'y', mainId: 'gone' }

    const state = reducer(start, { type: 'LOAD_STREAMS', streams: restored })

    expect(state.audioFocusId).toBe('y')
    expect(state.mainId).toBeNull()
  })

  it('focuses the first stream when the previous focus is gone', () => {
    const restored: StreamSlot[] = [{ id: 'x', channel: 'a', nativeMode: false }]
    const start: StreamState = { ...stateWith([]), audioFocusId: 'stale' }

    expect(reducer(start, { type: 'LOAD_STREAMS', streams: restored }).audioFocusId).toBe('x')
  })
})

describe('createInitialState', () => {
  it('restores the saved session when there is no share link', () => {
    const saved: StreamSlot[] = [{ id: 'x', channel: 'a', nativeMode: true }]
    const state = createInitialState('', saved, true)

    expect(slots(state)).toEqual(['a'])
    expect(state.streams[0].nativeMode).toBe(true)
    expect(state.chatOpen).toBe(true)
    expect(state.audioFocusId).toBe('x')
  })

  it('prefers a share link over the saved session and restores its layout', () => {
    const saved: StreamSlot[] = [{ id: 'x', channel: 'saved', nativeMode: false }]
    const state = createInitialState('?streams=a,b,c&main=b&audio=c', saved, false)

    expect(slots(state)).toEqual(['a', 'b', 'c'])
    expect(state.mainId).toBe(state.streams[1].id)
    expect(state.audioFocusId).toBe(state.streams[2].id)
  })

  it('ignores share-link channels that are not in the list', () => {
    const state = createInitialState('?streams=a&main=zzz&audio=zzz', [], false)
    expect(state.mainId).toBeNull()
    expect(state.audioFocusId).toBe(state.streams[0].id)
  })

  it('starts empty when nothing is saved', () => {
    const state = createInitialState('', [], false)
    expect(state.streams).toEqual([])
    expect(state.audioFocusId).toBeNull()
  })
})
