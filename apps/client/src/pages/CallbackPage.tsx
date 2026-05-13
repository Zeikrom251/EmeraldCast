import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { useFollowing } from '../context/FollowingContext'
import type { FollowedChannel } from '@repo/types'

interface JwtPayload {
  username: string
  channels: FollowedChannel[]
  userToken?: string
}

export function CallbackPage() {
  const navigate = useNavigate()
  const { setConnected, setError } = useFollowing()

  useEffect(() => {
    // Token is in the URL fragment (#token=...) — never sent to any server
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('token')

    if (!token) {
      setError()
      navigate('/', { replace: true })
      return
    }

    try {
      // Decode only — the signature was already verified server-side when signing.
      // We just extract the payload; the 5-min expiry is enforced by the server.
      const payload = jwtDecode<JwtPayload>(token)

      if (!payload.username || !Array.isArray(payload.channels)) {
        throw new Error('Invalid token payload')
      }

      setConnected(payload.username, payload.channels, payload.userToken)
    } catch {
      setError()
    }

    // Navigate back to main app, clearing the token from the URL immediately
    navigate('/', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-dvh items-center justify-center bg-[var(--bg-base)]">
      <p className="text-sm text-[var(--text-muted)]">Connecting to Twitch…</p>
    </div>
  )
}
