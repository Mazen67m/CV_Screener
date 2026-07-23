'use client'

import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  validateJdText,
  truncateToWordLimit,
  validateJd,
  JD_MIN_WORDS,
  JD_MAX_WORDS,
} from '../../lib/jd'
import { type JdState, getJdZoneStyles } from './jdStyles'

// Re-export so consumers that previously imported from this file keep working.
export type { JdState }
export { getJdZoneStyles }

interface JdInputZoneProps {
  onValid?: (data?: { cleanedText: string; wordCount: number }) => void
}

export default function JdInputZone({ onValid }: JdInputZoneProps) {
  const { getToken } = useAuth()

  const [text, setText] = useState<string>('')
  const [wordCount, setWordCount] = useState<number>(0)
  const [state, setState] = useState<JdState>('default')
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Holds the pending debounce timer so we can clear it on every new keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value

    // Single validation pass — avoids calling countJdWords twice per keystroke.
    const rawValidation = validateJdText(rawVal)

    let finalVal = rawVal
    let finalWordCount = rawValidation.wordCount
    let nextState: JdState

    if (rawValidation.state === 'too_long') {
      // Hard cap: truncate and force state to 'valid' (exactly JD_MAX_WORDS words).
      finalVal = truncateToWordLimit(rawVal, JD_MAX_WORDS)
      finalWordCount = JD_MAX_WORDS
      nextState = 'valid'
    } else {
      nextState =
        rawValidation.state === 'empty'     ? 'default'    :
        rawValidation.state === 'too_short' ? 'too_short'  :
        'valid'
    }

    setText(finalVal)
    setWordCount(finalWordCount)
    setState(nextState)

    // Clear server-validated data immediately on any text change so the parent
    // cannot proceed with a stale cleaned_text while the debounce is pending.
    if (nextState !== 'valid') {
      setApiError(null)
      onValid?.(undefined)
    }
  }

  // ─── Debounced server validation ──────────────────────────────────────────
  // Fires POST /api/jd/validate 600 ms after the user stops typing while the
  // state is 'valid'. Propagates the server-cleaned text to the parent via
  // onValid so the matching engine always receives backend-normalised input.
  // (DEC-011: call timing decision)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (state !== 'valid') {
      setApiError(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsValidating(true)
      setApiError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')
        const result = await validateJd(text, token)
        onValid?.({ cleanedText: result.cleaned_text, wordCount: result.word_count })
      } catch (err: any) {
        // Prefer the structured error message from the API; fall back to a generic one.
        const message: string =
          err?.response?.data?.error ?? 'Server validation failed. Please try again.'
        setApiError(message)
        onValid?.(undefined)
      } finally {
        setIsValidating(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state, text])

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col space-y-2">
      <label htmlFor="jd-textarea" className="text-sm font-semibold text-gray-300">
        Job Description
      </label>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300 ease-out backdrop-blur-md ${getJdZoneStyles(
          state
        )}`}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -inset-10 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 opacity-30 blur-2xl pointer-events-none" />

        <textarea
          id="jd-textarea"
          value={text}
          onChange={handleChange}
          placeholder={`Paste the Job Description here (Minimum ${JD_MIN_WORDS} words)...`}
          className="w-full min-h-[200px] bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-y text-base font-normal leading-relaxed"
        />

        <div className="flex items-center justify-between mt-4 border-t border-gray-800/60 pt-3">
          <div className="text-xs text-gray-500">
            {/* API error takes precedence over all other status messages */}
            {apiError && (
              <span className="text-rose-400 font-medium">{apiError}</span>
            )}
            {!apiError && state === 'too_short' && (
              <span className="text-amber-400 font-medium">
                Too short. Needs {JD_MIN_WORDS - wordCount} more words to analyze.
              </span>
            )}
            {!apiError && state === 'too_long' && (
              <span className="text-rose-400 font-medium">
                Too long. Max {JD_MAX_WORDS} words allowed.
              </span>
            )}
            {!apiError && state === 'valid' && isValidating && (
              <span className="text-violet-400 font-medium animate-pulse">
                Validating…
              </span>
            )}
            {!apiError && state === 'valid' && !isValidating && (
              <span className="text-emerald-400 font-medium">
                Valid word count for analysis.
              </span>
            )}
            {state === 'default' && (
              <span>Provide a detailed description of the job profile.</span>
            )}
          </div>
          <div className="text-sm font-semibold text-gray-400">
            <span
              className={
                state === 'too_short' ? 'text-amber-400'  :
                state === 'too_long'  ? 'text-rose-400'   :
                state === 'valid'     ? 'text-emerald-400' :
                'text-gray-400'
              }
            >
              {wordCount}
            </span>
            <span className="text-gray-600"> / {JD_MAX_WORDS} words</span>
          </div>
        </div>
      </div>
    </div>
  )
}
