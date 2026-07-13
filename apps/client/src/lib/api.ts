import type { TwitchSearchResult, FollowedChannel } from '@repo/types'
import axios, { type AxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? ''

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

async function get<T>(path: string, cfg?: AxiosRequestConfig): Promise<T> {
  const { data } = await client.get<T>(path, cfg)
  return data
}

export const api = {
  twitch: {
    search: (q: string, signal?: AbortSignal) =>
      get<TwitchSearchResult[]>(`/api/twitch/search`, { params: { q }, signal }),

    followed: (userToken: string) =>
      get<FollowedChannel[]>(`/api/twitch/followed`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }),
  },
}
