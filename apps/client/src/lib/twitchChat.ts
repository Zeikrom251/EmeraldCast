/**
 * A minimal anonymous Twitch chat client.
 *
 * Twitch's chat *embed* can only ever show one channel, which is exactly the
 * thing a multi-view needs to escape. Reading the same messages straight off
 * Twitch's IRC-over-WebSocket gateway lets several channels be merged into one
 * feed. Anonymous (`justinfan`) login is read-only and needs no credentials, so
 * nothing here touches the user's Twitch account.
 */

export type MessageFragment =
  | { type: 'text'; value: string }
  | { type: 'emote'; id: string; alt: string }

export interface ChatMessage {
  id: string
  channel: string
  login: string
  displayName: string
  /** Hex colour the chatter picked, or null when they never set one. */
  color: string | null
  fragments: MessageFragment[]
  text: string
  timestamp: number
}

export interface IrcMessage {
  tags: Record<string, string>
  prefix: string | null
  command: string
  params: string[]
}

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443'
const EMOTE_CDN = 'https://static-cdn.jtvnw.net/emoticon/v2'

/** Reconnect backoff, in milliseconds, capped at the last entry. */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000]

export function emoteUrl(id: string, scale: 1 | 2 | 3 = 1): string {
  return `${EMOTE_CDN}/${id}/default/dark/${scale}.0`
}

/** IRCv3 tag values escape a handful of characters; undo that. */
function unescapeTagValue(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '\\') {
      out += value[i]
      continue
    }
    i += 1
    switch (value[i]) {
      case ':':
        out += ';'
        break
      case 's':
        out += ' '
        break
      case 'r':
        out += '\r'
        break
      case 'n':
        out += '\n'
        break
      case undefined:
        break
      default:
        out += value[i]
    }
  }
  return out
}

/**
 * Parses one raw IRC line into its tags, prefix, command and parameters.
 * Returns null for blank lines. The trailing parameter (after " :") keeps its
 * spaces, which is where the chat text lives.
 */
export function parseIrcMessage(line: string): IrcMessage | null {
  let rest = line.trim()
  if (!rest) return null

  const tags: Record<string, string> = {}
  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ')
    const rawTags = rest.slice(1, end === -1 ? undefined : end)
    rest = end === -1 ? '' : rest.slice(end + 1)
    for (const pair of rawTags.split(';')) {
      if (!pair) continue
      const eq = pair.indexOf('=')
      if (eq === -1) tags[pair] = ''
      else tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1))
    }
  }

  let prefix: string | null = null
  if (rest.startsWith(':')) {
    const end = rest.indexOf(' ')
    if (end === -1) return null
    prefix = rest.slice(1, end)
    rest = rest.slice(end + 1)
  }

  const trailingAt = rest.indexOf(' :')
  let trailing: string | null = null
  if (rest.startsWith(':')) {
    trailing = rest.slice(1)
    rest = ''
  } else if (trailingAt !== -1) {
    trailing = rest.slice(trailingAt + 2)
    rest = rest.slice(0, trailingAt)
  }

  const parts = rest.split(' ').filter(Boolean)
  const command = parts.shift() ?? ''
  if (!command) return null
  if (trailing !== null) parts.push(trailing)

  return { tags, prefix, command, params: parts }
}

/**
 * Splits message text into text and emote fragments using the `emotes` tag.
 *
 * Twitch's indices count code points, not UTF-16 units, so the text is walked
 * as an array of code points — otherwise any astral character earlier in the
 * message (an emoji, say) shifts every emote after it.
 */
export function buildFragments(text: string, emotesTag: string | undefined): MessageFragment[] {
  const codePoints = [...text]
  if (!emotesTag) return text ? [{ type: 'text', value: text }] : []

  const spans: Array<{ start: number; end: number; id: string }> = []
  for (const group of emotesTag.split('/')) {
    const [id, ranges] = group.split(':')
    if (!id || !ranges) continue
    for (const range of ranges.split(',')) {
      const [start, end] = range.split('-').map(Number)
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue
      if (start < 0 || end < start || end >= codePoints.length) continue
      spans.push({ start, end, id })
    }
  }
  if (spans.length === 0) return text ? [{ type: 'text', value: text }] : []

  spans.sort((a, b) => a.start - b.start)

  const fragments: MessageFragment[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start < cursor) continue // overlapping ranges: keep the first
    if (span.start > cursor) {
      fragments.push({ type: 'text', value: codePoints.slice(cursor, span.start).join('') })
    }
    fragments.push({
      type: 'emote',
      id: span.id,
      alt: codePoints.slice(span.start, span.end + 1).join(''),
    })
    cursor = span.end + 1
  }
  if (cursor < codePoints.length) {
    fragments.push({ type: 'text', value: codePoints.slice(cursor).join('') })
  }
  return fragments
}

/** Turns a PRIVMSG into the shape the UI renders, or null if it is not one. */
export function toChatMessage(irc: IrcMessage, now: number = Date.now()): ChatMessage | null {
  if (irc.command !== 'PRIVMSG') return null
  const channel = irc.params[0]?.replace(/^#/, '') ?? ''
  const text = irc.params[1] ?? ''
  if (!channel) return null

  const login = irc.prefix?.split('!')[0] ?? irc.tags['login'] ?? 'unknown'
  const tmiSentTs = Number(irc.tags['tmi-sent-ts'])

  return {
    id: irc.tags['id'] || `${channel}-${login}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    channel,
    login,
    displayName: irc.tags['display-name'] || login,
    color: irc.tags['color'] || null,
    fragments: buildFragments(text, irc.tags['emotes']),
    text,
    timestamp: Number.isFinite(tmiSentTs) && tmiSentTs > 0 ? tmiSentTs : now,
  }
}

export type ChatStatus = 'connecting' | 'connected' | 'disconnected'

interface ChatClientHandlers {
  onMessage: (message: ChatMessage) => void
  onStatus?: (status: ChatStatus) => void
}

/**
 * Holds one anonymous connection and keeps its joined channels in sync with
 * whatever the caller asks for. Reconnects with backoff, re-joining the current
 * channel set each time.
 */
export class TwitchChatClient {
  private socket: WebSocket | null = null
  private channels = new Set<string>()
  private joined = new Set<string>()
  private reconnectAttempt = 0
  private reconnectTimer: number | undefined
  private closed = false

  constructor(private readonly handlers: ChatClientHandlers) {}

  connect(): void {
    if (this.closed || this.socket) return
    this.handlers.onStatus?.('connecting')

    // Anonymous read-only login. The numeric suffix keeps concurrent tabs from
    // colliding on the same nick.
    const nick = `justinfan${Math.floor(Math.random() * 80_000) + 1_000}`
    const socket = new WebSocket(IRC_URL)
    this.socket = socket

    socket.addEventListener('open', () => {
      socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands')
      socket.send(`NICK ${nick}`)
      this.reconnectAttempt = 0
      this.joined.clear()
      this.syncChannels()
      this.handlers.onStatus?.('connected')
    })

    socket.addEventListener('message', (event) => {
      for (const line of String(event.data).split('\r\n')) {
        this.handleLine(line)
      }
    })

    socket.addEventListener('close', () => {
      this.socket = null
      this.joined.clear()
      this.handlers.onStatus?.('disconnected')
      this.scheduleReconnect()
    })

    // A socket error is always followed by close, which owns the reconnect.
    socket.addEventListener('error', () => socket.close())
  }

  private handleLine(line: string): void {
    const irc = parseIrcMessage(line)
    if (!irc) return

    if (irc.command === 'PING') {
      this.socket?.send(`PONG :${irc.params[0] ?? 'tmi.twitch.tv'}`)
      return
    }
    // Twitch asks clients to reconnect before it drops them for maintenance.
    if (irc.command === 'RECONNECT') {
      this.socket?.close()
      return
    }

    const message = toChatMessage(irc)
    if (message) this.handlers.onMessage(message)
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer !== undefined) return
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined
      this.connect()
    }, delay)
  }

  setChannels(channels: string[]): void {
    this.channels = new Set(channels.map((c) => c.toLowerCase()))
    this.syncChannels()
  }

  private syncChannels(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return
    for (const channel of this.channels) {
      if (this.joined.has(channel)) continue
      this.socket.send(`JOIN #${channel}`)
      this.joined.add(channel)
    }
    for (const channel of this.joined) {
      if (this.channels.has(channel)) continue
      this.socket.send(`PART #${channel}`)
      this.joined.delete(channel)
    }
  }

  close(): void {
    this.closed = true
    if (this.reconnectTimer !== undefined) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
    this.socket?.close()
    this.socket = null
  }
}
