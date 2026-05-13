interface PlayerEntry {
  play: () => void
  isPaused: () => boolean
}

const registry = new Map<string, PlayerEntry>()

export function registerPlayer(id: string, entry: PlayerEntry): () => void {
  for (const [, other] of registry) {
    if (other.isPaused()) other.play()
  }
  registry.set(id, entry)
  return () => {
    registry.delete(id)
  }
}
