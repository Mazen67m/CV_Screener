'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import ScoreBars from '@/components/analysis/ScoreBars'
import ScoreGauge from '@/components/analysis/ScoreGauge'
import SkillsGrid from '@/components/analysis/SkillsGrid'
import ResultsSkeleton from '@/components/analysis/ResultsSkeleton'
import { getAnalysis, type AnalyzeResponse } from '@/lib/api'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const { getToken } = useAuth()
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadResult = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated. Please sign in again.')
      const data = await getAnalysis(id, token)
      setResult(data)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }
      setError(
        axiosErr.response?.data?.error
        ?? axiosErr.message
        ?? 'Failed to load this analysis.'
      )
    } finally {
      setLoading(false)
    }
  }, [getToken, id])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated. Please sign in again.')
        const data = await getAnalysis(id, token)
        if (!cancelled) setResult(data)
      } catch (err: unknown) {
        if (!cancelled) {
          const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }
          setError(
            axiosErr.response?.data?.error
            ?? axiosErr.message
            ?? 'Failed to load this analysis.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [getToken, id])

  const handleShare = async () => {
    if (!result) return
    const shareUrl = `${window.location.origin}/share/${result.id}`
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <ResultsSkeleton />

  if (error || !result) {
    return (
      <main className="min-h-screen bg-gray-950 p-6 text-white md:p-8">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
          <div className="rounded-full border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Could not load analysis</h1>
            <p className="mt-2 text-sm text-gray-500">{error ?? 'The result was not found.'}</p>
          </div>
          <button
            type="button"
            onClick={loadResult}
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-5 border-b border-gray-900 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-violet-300 transition hover:text-violet-200">
              Back to Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-50 md:text-4xl">
              CV Match Result
            </h1>
            {result.jobTitle && (
              <p className="mt-2 text-sm font-medium text-gray-500">{result.jobTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-violet-500/50 hover:text-white"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49M18 5a3 3 0 110 6 3 3 0 010-6zM6 9a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6z" />
                </svg>
                Share
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <ScoreGauge score={result.overallScore} />
          </section>
          <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <h2 className="mb-6 text-lg font-bold text-gray-100">Score Breakdown</h2>
            <ScoreBars
              textSimilarity={result.textSimilarity}
              skillsScore={result.skillsScore}
              experienceScore={result.experienceScore}
            />
          </section>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-100">Skills Breakdown</h2>
          <SkillsGrid
            matched={result.skills.matched}
            partial={result.skills.partial}
            missing={result.skills.missing}
          />
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-lg font-bold text-gray-100">Experience</h2>
          <p className="mt-3 text-sm text-gray-400">
            CV: <span className="font-semibold text-gray-100">{result.experience.cvYears}</span> yrs · Required:{' '}
            <span className="font-semibold text-gray-100">{result.experience.requiredYears}</span> yrs
          </p>
        </section>
      </div>
    </main>
  )
}
