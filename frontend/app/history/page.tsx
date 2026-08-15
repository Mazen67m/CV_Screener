import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/components/nav/AppNav'
import AppFooter from '@/components/nav/AppFooter'
import { getHistory, type HistoryItem } from '@/lib/api'

function getScoreBadgeStyle(scoreLabel: string): string {
  switch (scoreLabel) {
    case 'Excellent Match': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'Good Match':      return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
    case 'Average Match':   return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'Below Average':   return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    default:                return 'border-rose-500/20 bg-rose-500/10 text-rose-400/80'
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
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function HistoryPage() {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/login')

  const token = await getToken()
  let history: HistoryItem[] = []
  let historyError: string | null = null

  if (token) {
    try {
      history = await getHistory(token)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string }
      historyError = apiErr.response?.data?.error ?? apiErr.message ?? 'History is temporarily unavailable.'
    }
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      <AppNav />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col space-y-8">

          {/* ── Header ── */}
          <div className="border-b border-[#3d3a52]/80 pb-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors flex items-center gap-1 w-fit mb-4"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5ede9]">
                  Analysis History
                </h1>
                <p className="text-sm text-[#a09098] mt-1">
                  All your CV and job description comparisons, most recent first.
                </p>
              </div>
              {sortedHistory.length > 0 && (
                <span className="text-sm font-semibold text-[#a09098]">
                  {sortedHistory.length} {sortedHistory.length === 1 ? 'analysis' : 'analyses'}
                </span>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {historyError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-medium text-amber-200">
              {historyError}
            </div>
          )}

          {/* ── History List ── */}
          {sortedHistory.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 divide-y divide-[#3d3a52]/60 backdrop-blur-md">
              {sortedHistory.map((item: HistoryItem) => {
                const badgeStyle = getScoreBadgeStyle(item.scoreLabel)
                return (
                  <Link
                    key={item.id}
                    href={`/analysis/${item.id}`}
                    className="group grid gap-4 p-5 sm:p-6 transition-all duration-200 hover:bg-[#575068]/80 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-display text-base font-semibold text-[#f5ede9] group-hover:text-[#d9998a] transition-colors truncate">
                          {item.jobTitle ?? 'Untitled Analysis'}
                        </h2>
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
                      <svg
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/30 backdrop-blur-md text-center space-y-5">
              <div className="relative p-6 rounded-full bg-[#575068]/80 border border-[#3d3a52] text-[#d9998a]">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="font-display text-xl font-bold text-[#f5ede9]">No analyses yet</h3>
                <p className="text-sm text-[#a09098] leading-relaxed">
                  Start by uploading your CV and a job description to run your first match analysis.
                </p>
              </div>
              <Link
                href="/analysis/new"
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold text-sm transition-all shadow-lg shadow-[#b8796a]/25"
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
