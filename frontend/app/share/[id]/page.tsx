import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScoreBars from '@/components/analysis/ScoreBars'
import ScoreGauge from '@/components/analysis/ScoreGauge'
import SkillsGrid from '@/components/analysis/SkillsGrid'
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

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="border-b border-gray-900 pb-6">
          <p className="text-sm font-semibold text-violet-300">CV Screener — Shared Result</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-50 md:text-4xl">
            CV Match Result
          </h1>
          {result.jobTitle && (
            <p className="mt-2 text-sm font-medium text-gray-500">{result.jobTitle}</p>
          )}
        </header>

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

        <div className="flex justify-center border-t border-gray-900 pt-8">
          <Link
            href="/"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Analyze your own CV
          </Link>
        </div>
      </div>
    </main>
  )
}
