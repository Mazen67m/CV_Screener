import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getHistory, type HistoryItem } from '@/lib/api'

function scoreBadgeClasses(score: number): string {
  if (score >= 70) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  if (score >= 40) return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-rose-500/30 bg-rose-500/10 text-rose-200'
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

  if (token) {
    try {
      history = await getHistory(token)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } }; message?: string }
      historyError =
        apiError.response?.data?.error
        ?? apiError.message
        ?? 'History is temporarily unavailable.'
      history = []
    }
  }

  const totalAnalyses = history.length
  const avgScore = totalAnalyses
    ? Math.round(history.reduce((sum, item) => sum + item.overallScore, 0) / totalAnalyses)
    : null
  const bestScore = totalAnalyses
    ? Math.max(...history.map((item) => item.overallScore))
    : null

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col space-y-10">

        {/* ── Header ── */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-50">
              Welcome back, {firstName}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Analyze your CV against any job description and get an instant match score.
            </p>
          </div>

          {/* Primary CTA */}
          <Link
            href="/analysis/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02] whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Analysis</span>
          </Link>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Analyses', value: totalAnalyses.toString() },
            { label: 'Average Score', value: avgScore === null ? '—' : avgScore.toString() },
            { label: 'Best Score', value: bestScore === null ? '—' : bestScore.toString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col space-y-2"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-100">{value}</p>
            </div>
          ))}
        </div>

        {historyError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
            {historyError}
          </div>
        )}

        {history.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-100">Analysis History</h2>
                <p className="mt-1 text-sm text-gray-600">Your latest CV and job description comparisons.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30">
              {history.map((item) => (
                <Link
                  key={item.id}
                  href={`/analysis/${item.id}`}
                  className="grid gap-4 border-b border-gray-800 p-5 transition last:border-b-0 hover:bg-gray-900/70 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="truncate text-base font-semibold text-gray-100">
                        {item.jobTitle ?? 'Untitled Analysis'}
                      </h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBadgeClasses(item.overallScore)}`}>
                        {item.overallScore}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.matchedSkillsCount} skills matched · {item.missingSkillsCount} missing · {formatRelativeDate(item.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-violet-300">View Results</span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl bg-gray-900/20 space-y-4">
            <div className="rounded-full border border-gray-800 bg-gray-900 p-4 text-gray-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium text-lg">No analyses yet</p>
            <p className="text-gray-600 text-sm text-center max-w-xs">
              Run your first CV analysis to see your results and history here.
            </p>
            <Link
              href="/analysis/new"
              className="mt-2 text-sm font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
            >
              Start your first analysis
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
