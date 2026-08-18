import { describe, expect, it } from 'vitest'
import { buildFragments, parseIrcMessage, toChatMessage } from './twitchChat'

describe('parseIrcMessage', () => {
  it('parses tags, prefix, command and trailing text', () => {
    const line =
      '@color=#FF0000;display-name=Foo :foo!foo@foo.tmi.twitch.tv PRIVMSG #bar :hello there'
    const irc = parseIrcMessage(line)!

    expect(irc.tags.color).toBe('#FF0000')
    expect(irc.tags['display-name']).toBe('Foo')
    expect(irc.prefix).toBe('foo!foo@foo.tmi.twitch.tv')
    expect(irc.command).toBe('PRIVMSG')
    expect(irc.params).toEqual(['#bar', 'hello there'])
  })

  it('unescapes tag values', () => {
    const irc = parseIrcMessage('@system-msg=a\\sb\\:c\\\\d PRIVMSG #x :y')!
    expect(irc.tags['system-msg']).toBe('a b;c\\d')
  })

  it('keeps colons inside the message body', () => {
    const irc = parseIrcMessage(':a!a@a PRIVMSG #x :look: http://example.com')!
    expect(irc.params[1]).toBe('look: http://example.com')
  })

  it('handles a PING with no prefix', () => {
    const irc = parseIrcMessage('PING :tmi.twitch.tv')!
    expect(irc.command).toBe('PING')
    expect(irc.params).toEqual(['tmi.twitch.tv'])
  })

  it('returns null for blank lines', () => {
    expect(parseIrcMessage('')).toBeNull()
    expect(parseIrcMessage('   ')).toBeNull()
  })
})

describe('buildFragments', () => {
  it('returns a single text fragment when there are no emotes', () => {
    expect(buildFragments('hello', undefined)).toEqual([{ type: 'text', value: 'hello' }])
  })

  it('splits text around a single emote', () => {
    expect(buildFragments('hey Kappa!', '25:4-8')).toEqual([
      { type: 'text', value: 'hey ' },
      { type: 'emote', id: '25', alt: 'Kappa' },
      { type: 'text', value: '!' },
    ])
  })

  it('handles repeated and multiple emote ids in order', () => {
    const fragments = buildFragments('Kappa a PogChamp', '25:0-4/88:8-15')
    expect(fragments).toEqual([
      { type: 'emote', id: '25', alt: 'Kappa' },
      { type: 'text', value: ' a ' },
      { type: 'emote', id: '88', alt: 'PogChamp' },
    ])
  })

  it('counts positions in code points, not UTF-16 units', () => {
    // The astral emoji occupies one code point but two UTF-16 units; a naive
    // slice would land one character short and clip the emote name.
    const fragments = buildFragments('😀 Kappa', '25:2-6')
    expect(fragments).toEqual([
      { type: 'text', value: '😀 ' },
      { type: 'emote', id: '25', alt: 'Kappa' },
    ])
  })

  it('ignores ranges that fall outside the message', () => {
    expect(buildFragments('hi', '25:0-99')).toEqual([{ type: 'text', value: 'hi' }])
  })
})

describe('toChatMessage', () => {
  const line =
    '@color=#00FF00;display-name=Bar;emotes=25:0-4;id=abc;tmi-sent-ts=1700000000000 ' +
    ':bar!bar@bar.tmi.twitch.tv PRIVMSG #chan :Kappa hi'

  it('maps a PRIVMSG onto the render model', () => {
    const message = toChatMessage(parseIrcMessage(line)!)!

    expect(message).toMatchObject({
      id: 'abc',
      channel: 'chan',
      login: 'bar',
      displayName: 'Bar',
      color: '#00FF00',
      text: 'Kappa hi',
      timestamp: 1700000000000,
    })
    expect(message.fragments[0]).toEqual({ type: 'emote', id: '25', alt: 'Kappa' })
  })

  it('falls back to the login and current time when tags are missing', () => {
    const message = toChatMessage(parseIrcMessage(':baz!baz@baz PRIVMSG #chan :yo')!, 1234)!

    expect(message.displayName).toBe('baz')
    expect(message.color).toBeNull()
    expect(message.timestamp).toBe(1234)
    expect(message.id).toContain('chan-baz-1234')
  })

  it('ignores non-PRIVMSG commands', () => {
    expect(toChatMessage(parseIrcMessage('PING :tmi.twitch.tv')!)).toBeNull()
    expect(toChatMessage(parseIrcMessage(':tmi.twitch.tv 001 justinfan1 :Welcome')!)).toBeNull()
  })
})
