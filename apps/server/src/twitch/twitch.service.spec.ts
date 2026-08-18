import { parseLogins } from './twitch.service'

describe('parseLogins', () => {
  it('lowercases, trims and de-duplicates', () => {
    expect(parseLogins('Shroud, POKIMANE ,shroud')).toEqual(['pokimane', 'shroud'])
  })

  it('sorts so the cache key does not depend on grid order', () => {
    expect(parseLogins('b,a,c')).toEqual(parseLogins('c,b,a'))
  })

  it('drops values that cannot be Twitch logins', () => {
    expect(parseLogins('good_1,bad login,<script>,,ok')).toEqual(['good_1', 'ok'])
  })

  it('rejects logins longer than Twitch allows', () => {
    expect(parseLogins('a'.repeat(26))).toEqual([])
    expect(parseLogins('a'.repeat(25))).toEqual(['a'.repeat(25)])
  })

  it('caps the list so one request cannot fan out unboundedly', () => {
    const logins = Array.from({ length: 250 }, (_, i) => `user${i}`).join(',')
    expect(parseLogins(logins)).toHaveLength(100)
  })

  it('returns nothing for an empty list', () => {
    expect(parseLogins('')).toEqual([])
  })
})
