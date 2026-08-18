import type {
  TwitchSearchResult,
  FollowedChannelsResponse,
  TwitchCategory,
  CategoryStreamsPage,
  DiscoverData,
  StreamStatus,
} from '@repo/types'
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

    followed: (userToken: string, refreshToken?: string) =>
      get<FollowedChannelsResponse>(`/api/twitch/followed`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          ...(refreshToken ? { 'x-refresh-token': refreshToken } : {}),
        },
      }),

    streamStatus: (logins: string[], signal?: AbortSignal) =>
      get<StreamStatus[]>(`/api/twitch/streams/status`, {
        params: { logins: logins.join(',') },
        signal,
      }),

    discover: (signal?: AbortSignal) =>
      get<DiscoverData>(`/api/twitch/discover`, { signal }),

    searchCategories: (q: string, signal?: AbortSignal) =>
      get<TwitchCategory[]>(`/api/twitch/categories/search`, { params: { q }, signal }),

    categoryStreams: (
      gameId: string,
      opts?: { cursor?: string; language?: string },
      signal?: AbortSignal
    ) =>
      get<CategoryStreamsPage>(`/api/twitch/categories/streams`, {
        params: {
          gameId,
          ...(opts?.cursor ? { cursor: opts.cursor } : {}),
          ...(opts?.language ? { language: opts.language } : {}),
        },
        signal,
      }),
  },
}
