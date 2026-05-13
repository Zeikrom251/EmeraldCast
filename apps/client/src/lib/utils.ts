import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatViewerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export function buildShareUrl(channels: string[]): string {
  const url = new URL(window.location.href)
  url.search = ''
  if (channels.length > 0) {
    url.searchParams.set('streams', channels.join(','))
  }
  return url.toString()
}
