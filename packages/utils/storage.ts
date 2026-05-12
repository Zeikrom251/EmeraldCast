import type { LayoutConfig, StreamSlot } from '@repo/types'

const LAYOUTS_KEY = 'emeraldcast:layouts'
const STREAMS_KEY = 'emeraldcast:streams'

export function getSavedLayouts(): LayoutConfig[] {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY)
    return raw ? (JSON.parse(raw) as LayoutConfig[]) : []
  } catch {
    return []
  }
}

export function saveLayout(layout: LayoutConfig): void {
  const layouts = getSavedLayouts()
  const idx = layouts.findIndex((l) => l.id === layout.id)
  if (idx >= 0) {
    layouts[idx] = layout
  } else {
    layouts.push(layout)
  }
  localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts))
}

export function deleteLayout(id: string): void {
  const layouts = getSavedLayouts().filter((l) => l.id !== id)
  localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts))
}

export function getActiveStreams(): StreamSlot[] {
  try {
    const raw = localStorage.getItem(STREAMS_KEY)
    return raw ? (JSON.parse(raw) as StreamSlot[]) : []
  } catch {
    return []
  }
}

export function saveActiveStreams(streams: StreamSlot[]): void {
  localStorage.setItem(STREAMS_KEY, JSON.stringify(streams))
}
