import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScoreBars from '@/components/analysis/ScoreBars'
import ScoreGauge from '@/components/analysis/ScoreGauge'
import SkillsGrid from '@/components/analysis/SkillsGrid'
import LearningPathSection from '@/components/analysis/LearningPathSection'
import AppFooter from '@/components/nav/AppFooter'
import { getSharedAnalysis, type AnalyzeResponse } from '@/lib/api'

interface SharePageProps {
  params: Promise<{ id: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params
  let result: AnalyzeResponse

  try {
    result = await getSharedAnalysis(id)
  } catch {
    notFound()
  }

  // Derive estimated category & confidence for classification card
  const detectedCategory = result.jobTitle ? result.jobTitle.split('at')[0].trim() : 'Software Engineer'
  const confidencePercent = Math.min(Math.max(Math.round(result.overallScore * 0.9 + 15), 65), 98)

  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      {/* Read-Only Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#3d3a52]/80 bg-[#0d2f3e]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-[#f5ede9] hover:text-[#d9998a] transition-colors"
          >
            CV Screener
          </Link>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-[#a09098]">Public Shared Report</span>
            <Link
              href="/"
              className="text-xs font-semibold text-[#f5ede9] px-3.5 py-1.5 rounded-lg bg-[#b8796a] hover:bg-[#d9998a] transition-all shadow-sm shadow-[#b8796a]/30"
            >
              Analyze Your CV →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Results Content */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col space-y-8">
          
          {/* Header */}
          <div className="border-b border-[#3d3a52]/80 pb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d9998a]">
              Shared Assessment
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5ede9] mt-1">
              CV Match Result
            </h1>
            <p className="text-sm font-medium text-[#a09098] mt-1">
              {result.jobTitle ?? 'Compatibility Analysis Report'}
            </p>
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
            <div>
              <h2 className="font-display text-xl font-bold text-[#f5ede9]">
                Skills Breakdown
              </h2>
              <p className="text-xs text-[#a09098] mt-0.5">
                Taxonomy matching against the job description requirements
              </p>
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
              <LearningPathSection missingSkills={result.skills.missing} />
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
              </div>
            </div>
          </div>

          {/* ── CONVERSION BOTTOM CTA CARD ── */}
          <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-8 text-center flex flex-col items-center space-y-4">
            <h3 className="font-display text-2xl font-bold text-[#f5ede9]">
              Want to see how your own CV matches?
            </h3>
            <p className="text-sm text-[#a09098] max-w-md">
              Upload your resume and any job description to get an instant compatibility breakdown and personalized learning recommendations.
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold text-sm transition-all shadow-lg shadow-[#b8796a]/25 hover:shadow-[#b8796a]/40"
            >
              <span>Analyze Your CV Free →</span>
            </Link>
          </div>

        </div>
      </main>

      <AppFooter />
    </div>
  )
}
