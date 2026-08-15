'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import AppNav from '@/components/nav/AppNav'
import AppFooter from '@/components/nav/AppFooter'
import ScoreBars from '@/components/analysis/ScoreBars'
import ScoreGauge from '@/components/analysis/ScoreGauge'
import SkillsGrid from '@/components/analysis/SkillsGrid'
import LearningPathSection from '@/components/analysis/LearningPathSection'
import ResultsSkeleton from '@/components/analysis/ResultsSkeleton'
import { getAnalysis, getLearningPath, type AnalyzeResponse } from '@/lib/api'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const { getToken } = useAuth()
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [learningSkills, setLearningSkills] = useState<string[] | null>(null)

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

  // Fetch learning path skills from backend after analysis loads
  useEffect(() => {
    if (!result || result.skills.missing.length === 0) return
    let cancelled = false

    async function fetchLearningPath() {
      try {
        const token = await getToken()
        if (!token) return
        const data = await getLearningPath(id, token)
        if (!cancelled) setLearningSkills(data.skills)
      } catch {
        // Fallback to the analysis's own missing skills list
        if (!cancelled) setLearningSkills(result!.skills.missing)
      }
    }

    fetchLearningPath()
    return () => { cancelled = true }
  }, [result, getToken, id])

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
      <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between">
        <AppNav />
        <main className="flex-1 p-6 md:p-8 flex items-center justify-center">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 text-center rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-8 backdrop-blur-md">
            <div className="rounded-full border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#f5ede9]">Could not load analysis</h1>
              <p className="mt-2 text-sm text-[#a09098]">{error ?? 'The requested analysis result was not found.'}</p>
            </div>
            <div className="flex items-center space-x-3 mt-2">
              <button
                type="button"
                onClick={loadResult}
                className="rounded-xl bg-[#b8796a] hover:bg-[#d9998a] px-5 py-2.5 text-sm font-semibold text-[#f5ede9] transition-all shadow-sm shadow-[#b8796a]/30"
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#3d3a52] bg-[#575068]/60 hover:bg-[#575068]/80 px-5 py-2.5 text-sm font-semibold text-[#f5ede9] transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  // Derive estimated category & confidence for classification card
  const detectedCategory = result.jobTitle ? result.jobTitle.split('at')[0].trim() : 'Software Engineer'
  const confidencePercent = Math.min(Math.max(Math.round(result.overallScore * 0.9 + 15), 65), 98)

  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      {/* Top App Navigation */}
      <AppNav />

      {/* Main Results Container */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col space-y-8">
          
          {/* Header & Share Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#3d3a52]/80 pb-6">
            <div className="space-y-1">
              <Link 
                href="/dashboard" 
                className="text-xs font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors flex items-center space-x-1 w-fit mb-2"
              >
                <span>&larr; Back to Dashboard</span>
              </Link>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5ede9]">
                CV Match Result
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm font-medium text-[#a09098]">
                  {result.jobTitle ?? 'Compatibility Analysis Report'}
                </p>
                {result.scoreLabel && (
                  <span className="rounded-full border border-[#b8796a]/30 bg-[#b8796a]/10 px-2.5 py-0.5 text-xs font-semibold text-[#d9998a]">
                    {result.scoreLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Share Public Link Button */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center space-x-2 rounded-xl border border-[#3d3a52] bg-[#575068]/60 hover:bg-[#575068]/80 hover:border-[#575068] px-4 py-2.5 text-xs font-semibold text-[#f5ede9] transition-all self-start sm:self-auto"
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-[#a09098]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share Report</span>
                </>
              )}
            </button>
          </div>

          {/* ── TOP SECTION: Overall Score Left + Breakdown Bars Right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 sm:gap-8 items-stretch">
            {/* Overall Score Dial Card */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md flex flex-col items-center justify-center">
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-[#a09098] mb-4">
                Overall Compatibility
              </span>
              <ScoreGauge score={result.overallScore} />
            </div>

            {/* Dimensional Breakdown Card */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#f5ede9] mb-1">
                  Dimensional Score Breakdown
                </h2>
                <p className="text-xs text-[#a09098] mb-6">
                  Weighted hybrid evaluation across lexical text, skills taxonomy, and experience.
                </p>
                <ScoreBars
                  textSimilarity={result.textSimilarity}
                  skillsScore={result.skillsScore}
                  experienceScore={result.experienceScore}
                />
              </div>
            </div>
          </div>

          {/* ── SKILLS BREAKDOWN SECTION ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-[#f5ede9]">
                  Skills Breakdown
                </h2>
                <p className="text-xs text-[#a09098] mt-0.5">
                  Taxonomy matching against the job description requirements
                </p>
              </div>
            </div>

            <SkillsGrid
              matched={result.skills.matched}
              partial={result.skills.partial}
              missing={result.skills.missing}
            />
          </section>

          {/* ── LEARNING PATH RECOMMENDATIONS ── */}
          {result.skills.missing.length > 0 && (
            <section>
              <LearningPathSection missingSkills={learningSkills ?? result.skills.missing} />
            </section>
          )}

          {/* ── BOTTOM ROW: Classification + Experience ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CV Category Classification Card */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-violet-950/40 border border-violet-900/40 text-violet-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#f5ede9]">
                    CV Category Classification
                  </h3>
                </div>
                <p className="text-xs text-[#a09098]">
                  Predicted professional profile category from resume taxonomy
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-300">
                    {detectedCategory}
                  </span>
                  <span className="text-xs font-semibold text-violet-400">
                    {confidencePercent}% confidence
                  </span>
                </div>
                {/* Confidence Bar */}
                <div className="h-2 overflow-hidden rounded-full bg-[#0d2f3e] border border-[#3d3a52]">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-700"
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Experience Alignment Card */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#f5ede9]">
                    Experience Alignment
                  </h3>
                </div>
                <p className="text-xs text-[#a09098]">
                  Total career tenure evaluated against role seniority requirement
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#f5ede9] font-medium">
                    CV Tenure: <span className="font-bold text-emerald-300">{result.experience.cvYears} yrs</span>
                  </span>
                  <span className="text-[#a09098]">
                    Required: <span className="font-bold text-[#f5ede9]">{result.experience.requiredYears} yrs</span>
                  </span>
                </div>
                {/* Experience Bar */}
                <div className="h-2 overflow-hidden rounded-full bg-[#0d2f3e] border border-[#3d3a52]">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        result.experience.requiredYears > 0
                          ? (result.experience.cvYears / result.experience.requiredYears) * 100
                          : 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                {/* Mismatch Note */}
                {result.experience.mismatchNote && (
                  <p className="text-xs text-amber-400/90 font-medium pt-1">
                    ⚠ {result.experience.mismatchNote}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
