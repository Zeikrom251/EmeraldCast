import type { TwitchSearchResult, TwitchStream, FollowedChannel } from '@repo/types'
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
    search: (q: string) => get<TwitchSearchResult[]>(`/api/twitch/search`, { params: { q } }),

    streams: (channels: string[]) =>
      get<TwitchStream[]>(`/api/twitch/streams`, {
        params: { channels: channels.join(',') },
      }),

    followed: (userToken: string) =>
      get<FollowedChannel[]>(`/api/twitch/followed`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }),
  },
}
