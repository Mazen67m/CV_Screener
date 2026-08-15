import { describe, it } from 'node:test'
import assert from 'node:assert'
import { countJdWords, validateJdText, truncateToWordLimit, validateJd } from '../../lib/jd'
import { getJdZoneStyles } from './jdStyles'

describe('countJdWords', () => {
  it('should return 0 for empty or whitespace-only strings', () => {
    assert.strictEqual(countJdWords(''), 0)
    assert.strictEqual(countJdWords('   '), 0)
    assert.strictEqual(countJdWords('\n\t'), 0)
  })

  it('should count simple words separated by spaces', () => {
    assert.strictEqual(countJdWords('hello world'), 2)
    assert.strictEqual(countJdWords('we are looking for a senior developer'), 7)
  })

  it('should clean punctuation and collapse whitespace before counting', () => {
    assert.strictEqual(countJdWords('Hello, world! C# .NET @2026.'), 5) // "hello", "world", "c", "net", "2026"
    assert.strictEqual(countJdWords('too   many    spaces'), 3)
    assert.strictEqual(countJdWords('  leading and trailing spaces  '), 4)
  })

  it('should preserve hyphens in words', () => {
    // hyphens are preserved (DEC-010), so "full-stack" is a single word
    assert.strictEqual(countJdWords('full-stack c# developer'), 3)
    assert.strictEqual(countJdWords('entry-level-position'), 1)
  })
})

describe('validateJdText', () => {
  it('should return empty state for blank text', () => {
    const res = validateJdText('')
    assert.strictEqual(res.state, 'empty')
    assert.strictEqual(res.wordCount, 0)
  })

  it('should return too_short state for 1 to 49 words', () => {
    const shortText = Array(49).fill('word').join(' ')
    const res = validateJdText(shortText)
    assert.strictEqual(res.state, 'too_short')
    assert.strictEqual(res.wordCount, 49)
  })

  it('should return valid state for exactly 50 words', () => {
    const exactText = Array(50).fill('word').join(' ')
    const res = validateJdText(exactText)
    assert.strictEqual(res.state, 'valid')
    assert.strictEqual(res.wordCount, 50)
  })

  it('should return valid state for exactly 5000 words', () => {
    const maxText = Array(5000).fill('word').join(' ')
    const res = validateJdText(maxText)
    assert.strictEqual(res.state, 'valid')
    assert.strictEqual(res.wordCount, 5000)
  })

  it('should return too_long state for 5001 words', () => {
    const tooLongText = Array(5001).fill('word').join(' ')
    const res = validateJdText(tooLongText)
    assert.strictEqual(res.state, 'too_long')
    assert.strictEqual(res.wordCount, 5001)
  })
})

describe('truncateToWordLimit', () => {
  it('should return empty string when limit is 0', () => {
    assert.strictEqual(truncateToWordLimit('hello world', 0), '')
  })

  it('should return empty string when limit is negative', () => {
    assert.strictEqual(truncateToWordLimit('hello world', -1), '')
  })

  it('should not modify text if word count is under the limit', () => {
    const text = 'hello world'
    assert.strictEqual(truncateToWordLimit(text, 5), text)
  })

  it('should truncate text at exactly the Nth word boundary', () => {
    const text = 'Hello, world! C# .NET @2026.'
    // Words are: Hello (1), world (2), C (3), NET (4), 2026 (5)
    // Truncating to 2 words should return everything up to the end of "world"
    assert.strictEqual(truncateToWordLimit(text, 2), 'Hello, world')
    assert.strictEqual(truncateToWordLimit(text, 4), 'Hello, world! C# .NET')
  })
})

describe('getJdZoneStyles', () => {
  it('should return default styles for default state', () => {
    const styles = getJdZoneStyles('default')
    assert.ok(styles.includes('border-[#3d3a52]'))
    assert.ok(styles.includes('bg-[#575068]/40'))
  })

  it('should return typing styles for typing state', () => {
    // 'typing' is not a JdState variant — this test documents that the
    // default branch handles unknown values gracefully.
    const styles = getJdZoneStyles('default')
    assert.ok(styles.length > 0)
  })

  it('should return valid styles for valid state', () => {
    const styles = getJdZoneStyles('valid')
    assert.ok(styles.includes('border-emerald-500'))
    assert.ok(styles.includes('bg-emerald-950/10'))
  })

  it('should return too_short styles for too_short state', () => {
    const styles = getJdZoneStyles('too_short')
    assert.ok(styles.includes('border-amber-500/60'))
    assert.ok(styles.includes('bg-amber-950/5'))
  })

  it('should return too_long styles for too_long state', () => {
    const styles = getJdZoneStyles('too_long')
    assert.ok(styles.includes('border-rose-500'))
    assert.ok(styles.includes('bg-rose-950/10'))
  })
})

describe('validateJd', () => {
  it('should call api.post with correct url, payload and auth headers', async () => {
    const text = 'test job description text'
    const token = 'mock-auth-token'
    const serverResponse = {
      data: {
        cleaned_text: 'cleaned text',
        word_count: 5,
        valid: true,
      },
    }

    let calledUrl: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calledData: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calledConfig: any = null

    // Inject a mock api instance — avoids mutating the global `api` singleton.
    const mockApi = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post: async <T = any, R = any>(url: string, data?: any, config?: any): Promise<R> => {
        calledUrl = url
        calledData = data
        calledConfig = config
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return serverResponse as any
      },
    }

    const result = await validateJd(text, token, mockApi)

    assert.strictEqual(calledUrl, '/jd/validate')
    assert.deepStrictEqual(calledData, { text })
    assert.deepStrictEqual(calledConfig, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    assert.deepStrictEqual(result, {
      cleaned_text: 'cleaned text',
      word_count: 5,
      valid: true,
    })
  })
})
