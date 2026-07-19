import { createContext, useContext } from 'react'
import type { StreamSlot } from '@repo/types'

export interface StreamState {
  streams: StreamSlot[]
  mainId: string | null
  chatOpen: boolean
  chatChannel: string | null
  audioFocusId: string | null
  nativeModeAll: boolean
}

export interface StreamContextValue extends StreamState {
  addStream: (channel: string) => void
  addStreams: (channels: string[]) => void
  loadChannels: (channels: string[], main?: string | null) => void
  removeStream: (id: string) => void
  clearStreams: () => void
  reorderStreams: (streams: StreamSlot[]) => void
  setMain: (id: string) => void
  toggleChat: () => void
  setChatChannel: (channel: string | null) => void
  setAudioFocus: (id: string | null) => void
  toggleAllNativeMode: () => void
  toggleNativeMode: (id: string) => void
}

export const StreamContext = createContext<StreamContextValue | null>(null)

export function useStream() {
  const ctx = useContext(StreamContext)
  if (!ctx) throw new Error('useStream must be used within StreamProvider')
  return ctx
}
