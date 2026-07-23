import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const user = await currentUser()
  const firstName = user?.firstName ?? 'there'

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto flex flex-col space-y-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Welcome back, {firstName} 👋
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

        {/* ── Metric Cards (F-10 placeholder) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Analyses', icon: '📊' },
            { label: 'Average Score',  icon: '🎯' },
            { label: 'Best Score',     icon: '🏆' },
          ].map(({ label, icon }) => (
            <div
              key={label}
              className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col space-y-2"
            >
              <span className="text-lg">{icon}</span>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-700">—</p>
            </div>
          ))}
        </div>

        {/* ── Empty state — history (F-09 placeholder) ── */}
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl bg-gray-900/20 space-y-4">
          <div className="text-5xl">📂</div>
          <p className="text-gray-400 font-medium text-lg">No analyses yet</p>
          <p className="text-gray-600 text-sm text-center max-w-xs">
            Run your first CV analysis to see your results and history here.
          </p>
          <Link
            href="/analysis/new"
            className="mt-2 text-sm font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors"
          >
            Start your first analysis →
          </Link>
        </div>

      </div>
    </main>
  )
}
