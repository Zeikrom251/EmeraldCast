let interacted = false
const callbacks = new Set<() => void>()

function handleInteraction() {
  if (interacted) return
  interacted = true
  document.removeEventListener('click', handleInteraction, true)
  document.removeEventListener('keydown', handleInteraction, true)
  document.removeEventListener('touchstart', handleInteraction, true)
  callbacks.forEach((fn) => fn())
  callbacks.clear()
}

document.addEventListener('click', handleInteraction, true)
document.addEventListener('keydown', handleInteraction, true)
document.addEventListener('touchstart', handleInteraction, true)

export function hasInteracted(): boolean {
  return interacted
}

export function onceInteracted(fn: () => void): () => void {
  if (interacted) {
    fn()
    return () => {}
  }
  callbacks.add(fn)
  return () => {
    callbacks.delete(fn)
  }
}
