import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/components/nav/AppNav'
import AppFooter from '@/components/nav/AppFooter'
import { getHistory, getDashboardMetrics, type HistoryItem } from '@/lib/api'

function getScoreBadgeStyle(scoreLabel: string): string {
  switch (scoreLabel) {
    case 'Excellent Match': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'Good Match':      return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
    case 'Average Match':   return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'Below Average':   return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    default:                return 'border-rose-500/20 bg-rose-500/10 text-rose-400/80' // Poor Match
  }
}

function formatRelativeDate(value: string): string {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (!Number.isFinite(diffDays) || diffDays < 0) return 'Recently'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`

  return date.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function DashboardPage() {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/login')

  const user = await currentUser()
  const firstName = user?.firstName ?? 'there'
  const token = await getToken()

  let history: HistoryItem[] = []
  let historyError: string | null = null
  let metrics = { totalAnalyses: 0, averageScore: null as number | null, bestScore: null as number | null, mostMissingSkills: [] as string[] }

  if (token) {
    // Fetch history and metrics in parallel
    const [historyResult, metricsResult] = await Promise.allSettled([
      getHistory(token),
      getDashboardMetrics(token),
    ])

    if (historyResult.status === 'fulfilled') {
      history = historyResult.value
    } else {
      const err = historyResult.reason as { response?: { data?: { error?: string } }; message?: string }
      historyError = err.response?.data?.error ?? err.message ?? 'History is temporarily unavailable.'
    }

    if (metricsResult.status === 'fulfilled') {
      metrics = metricsResult.value
    }
  }

  // Sort history: most recent first, take only the last 5 for the dashboard strip (DEC-021)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const recentHistory = sortedHistory.slice(0, 5)
  const hasMore = sortedHistory.length > 5

  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      <AppNav />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col space-y-10">

          {/* ── Dashboard Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-[#3d3a52]/80 pb-6">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5ede9]">
                Welcome back, {firstName}
              </h1>
              <p className="text-sm text-[#a09098] mt-1">
                Analyze your CV against any job description and track your compatibility progression.
              </p>
            </div>

            <Link
              href="/analysis/new"
              className="inline-flex items-center space-x-2 bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold px-5 py-3 rounded-xl shadow-lg shadow-[#b8796a]/25 hover:shadow-[#b8796a]/40 transition-all duration-200 whitespace-nowrap self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Analysis</span>
            </Link>
          </div>

          {/* ── Metric Cards Strip ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Analyses */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#a09098]">Total Assessments</span>
                <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
              </div>
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#f5ede9]">
                  {metrics.totalAnalyses}
                </span>
                <p className="text-xs text-[#a09098] mt-1">CVs evaluated against job targets</p>
              </div>
            </div>

            {/* Average Score */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#a09098]">Average Score</span>
                <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
              </div>
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#f5ede9]">
                  {metrics.averageScore === null ? '—' : `${metrics.averageScore}%`}
                </span>
                <p className="text-xs text-[#a09098] mt-1">Mean match compatibility rate</p>
              </div>
            </div>

            {/* Best Score */}
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#a09098]">Best Score</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </span>
              </div>
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-emerald-400">
                  {metrics.bestScore === null ? '—' : `${metrics.bestScore}%`}
                </span>
                <p className="text-xs text-[#a09098] mt-1">Highest candidate alignment</p>
              </div>
            </div>
          </div>

          {/* ── Most Missing Skills ── */}
          {metrics.mostMissingSkills.length > 0 && (
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a09098] mb-3">Most Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {metrics.mostMissingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* History Error Banner */}
          {historyError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-medium text-amber-200">
              {historyError}
            </div>
          )}

          {/* ── Recent Analyses Section ── */}
          {recentHistory.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#3d3a52]/80 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#f5ede9]">Recent Analyses</h2>
                  <p className="text-xs text-[#a09098] mt-0.5">Your latest CV and job description comparisons.</p>
                </div>
                {hasMore && (
                  <Link
                    href="/history"
                    className="text-xs font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors flex items-center gap-1"
                  >
                    View all history
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 divide-y divide-[#3d3a52]/60 backdrop-blur-md">
                {recentHistory.map((item) => {
                  const badgeStyle = getScoreBadgeStyle(item.scoreLabel)
                  return (
                    <Link
                      key={item.id}
                      href={`/analysis/${item.id}`}
                      className="group grid gap-4 p-5 sm:p-6 transition-all duration-200 hover:bg-[#575068]/80 md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-display text-base font-semibold text-[#f5ede9] group-hover:text-[#d9998a] transition-colors truncate">
                            {item.jobTitle ?? 'Untitled Analysis'}
                          </h3>
                          <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${badgeStyle}`}>
                            {item.scoreLabel} · {item.overallScore}%
                          </span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-[#a09098]">
                          <span className="text-emerald-300 font-medium">{item.matchedSkillsCount} matched</span>
                          {' · '}
                          <span className="text-rose-300 font-medium">{item.missingSkillsCount} missing</span>
                          {' · '}
                          <span>{formatRelativeDate(item.createdAt)}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-xs font-semibold text-[#d9998a] group-hover:text-[#f5ede9] transition-colors">
                        <span>View Results</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Link
                    href="/history"
                    className="text-sm font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors border border-[#b8796a]/30 hover:border-[#b8796a]/60 rounded-xl px-5 py-2.5"
                  >
                    View all {metrics.totalAnalyses} analyses →
                  </Link>
                </div>
              )}
            </section>
          ) : (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/30 backdrop-blur-md text-center space-y-5">
              <div className="relative p-6 rounded-full bg-[#575068]/80 border border-[#3d3a52] text-[#d9998a]">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#b8796a] animate-ping opacity-75" />
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#b8796a]" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="font-display text-xl font-bold text-[#f5ede9]">Your first analysis is waiting</h3>
                <p className="text-xs sm:text-sm text-[#a09098] leading-relaxed">
                  Upload your CV and paste any job description to generate your first match score, skill breakdown, and career recommendations.
                </p>
              </div>

              <Link
                href="/analysis/new"
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold text-sm transition-all shadow-lg shadow-[#b8796a]/25 hover:shadow-[#b8796a]/40"
              >
                <span>Start Your First Analysis →</span>
              </Link>
            </div>
          )}

        </div>
      </main>

      <AppFooter />
    </div>
  )
}
