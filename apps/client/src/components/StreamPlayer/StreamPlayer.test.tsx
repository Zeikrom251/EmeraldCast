import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StreamPlayer } from './StreamPlayer'

afterEach(() => {
  vi.useRealTimers()
})

it('fades the hover controls once the pointer rests, so they stop covering the player', () => {
  vi.useFakeTimers()
  const { container } = render(<StreamPlayer id="a" channel="test" muted onRemove={() => {}} />)
  const tile = container.querySelector('[data-stream-id="a"]')!

  fireEvent.mouseMove(tile)
  act(() => vi.advanceTimersByTime(1500))
  fireEvent.mouseMove(tile)
  act(() => vi.advanceTimersByTime(1500))
  expect(tile).toHaveAttribute('data-controls')

  act(() => vi.advanceTimersByTime(500))
  expect(tile).not.toHaveAttribute('data-controls')
})
