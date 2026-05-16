import { createContext, useContext } from 'react'
import type { StreamSlot, LayoutType } from '@repo/types'

export interface StreamState {
  streams: StreamSlot[]
  mainId: string | null
  chatOpen: boolean
  chatChannel: string | null
  audioFocusId: string | null
  masterMuted: boolean
  masterVolume: number
  nativeModeAll: boolean
  layoutType: LayoutType
}

export interface StreamContextValue extends StreamState {
  addStream: (channel: string) => void
  removeStream: (id: string) => void
  reorderStreams: (streams: StreamSlot[]) => void
  setMain: (id: string) => void
  toggleChat: () => void
  setChatChannel: (channel: string | null) => void
  setAudioFocus: (id: string | null) => void
  toggleMuteAll: () => void
  setVolume: (volume: number) => void
  toggleAllNativeMode: () => void
  toggleNativeMode: (id: string) => void
  setLayout: (layout: LayoutType) => void
}

export const StreamContext = createContext<StreamContextValue | null>(null)

export function useStream() {
  const ctx = useContext(StreamContext)
  if (!ctx) throw new Error('useStream must be used within StreamProvider')
  return ctx
}
