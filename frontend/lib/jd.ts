import { api } from './api'

export interface JdValidateResponse {
  cleaned_text: string
  word_count: number
  valid: boolean
}

/** Minimum word count for a valid job description (post-cleaning). DEC-008. */
export const JD_MIN_WORDS = 50

/** Maximum word count for a valid job description (post-cleaning). DEC-008. */
export const JD_MAX_WORDS = 5000

/**
 * Validates the job description by submitting it to the backend API.
 *
 * @param text        The raw job description text
 * @param token       Clerk auth JWT token
 * @param apiInstance Axios-compatible instance to use for the request.
 *                    Defaults to the shared `api` singleton; override in tests
 *                    to avoid mutating the global module export.
 */
export async function validateJd(
  text: string,
  token: string,
  apiInstance: Pick<typeof api, 'post'> = api
): Promise<JdValidateResponse> {
  const res = await apiInstance.post<JdValidateResponse>(
    '/jd/validate',
    { text },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return res.data
}

/**
 * Counts words in a string using the same tokenisation logic as the backend's
 * TextCleaner (DEC-008, DEC-010), keeping the frontend real-time counter
 * consistent with server-side validation.
 *
 * A "word" is any sequence of one or more characters from [a-zA-Z0-9-].
 * Hyphens are included so "full-stack" counts as one word (DEC-010).
 * This regex is intentionally identical to the one used in truncateToWordLimit
 * so that both functions always agree on word boundaries for any input string.
 *
 * @param text Raw job description text
 */
export function countJdWords(text: string): number {
  if (!text || text.trim() === '') {
    return 0
  }
  const matches = text.match(/[a-z0-9-]+/gi)
  return matches ? matches.length : 0
}

/**
 * Truncates raw text to a maximum number of words.
 * Preserves the exact original characters (spaces, newlines, punctuation)
 * up to the end of the limit-th word boundary.
 *
 * Uses the same /[a-z0-9-]+/gi tokenisation as countJdWords so the two
 * functions always agree on where a word ends for any input.
 *
 * @param text  The raw input text
 * @param limit The maximum number of words to keep (0 or negative → empty string)
 */
export function truncateToWordLimit(text: string, limit: number): string {
  // Guard: a limit of 0 or less means no words are allowed.
  if (limit <= 0) {
    return ''
  }

  const regex = /[a-z0-9-]+/gi
  let wordCount = 0
  let endIdx = text.length

  // eslint-disable-next-line no-cond-assign
  while (regex.exec(text) !== null) {
    wordCount++
    if (wordCount === limit) {
      endIdx = regex.lastIndex
      break
    }
  }

  // If we found the limit-th word, slice there. Otherwise keep the whole text.
  if (wordCount >= limit) {
    return text.slice(0, endIdx)
  }
  return text
}

/**
 * Validates a job description's word count client-side.
 * Returns the word count and a state label used to drive UI feedback.
 *
 * @param text The raw input text
 */
export function validateJdText(text: string): {
  wordCount: number
  state: 'empty' | 'too_short' | 'valid' | 'too_long'
} {
  const wordCount = countJdWords(text)

  if (wordCount === 0) {
    return { wordCount: 0, state: 'empty' }
  }

  if (wordCount < JD_MIN_WORDS) {
    return { wordCount, state: 'too_short' }
  }

  if (wordCount <= JD_MAX_WORDS) {
    return { wordCount, state: 'valid' }
  }

  return { wordCount, state: 'too_long' }
}
