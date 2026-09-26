import { useStream } from '../context/StreamContext'

export type LayoutMode = 'grid' | 'focus'

/** Grid shows every stream equally; focus promotes one stream beside the rest. */
export function useLayoutMode() {
  const { streams, mainId, audioFocusId, setMain } = useStream()
  const mode: LayoutMode = mainId && streams.some((s) => s.id === mainId) ? 'focus' : 'grid'

  function setMode(next: LayoutMode) {
    if (next === mode) return
    // SET_MAIN on the current main unsets it, which is how focus returns to grid.
    if (next === 'grid' && mainId) setMain(mainId)
    if (next === 'focus') {
      const id = audioFocusId ?? streams[0]?.id
      if (id) setMain(id)
    }
  }

  return { mode, setMode, canFocus: streams.length > 1 }
}
