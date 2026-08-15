import React from 'react'

interface SkillsGridProps {
  matched: string[]
  partial: string[]
  missing: string[]
}

function SkillColumn({
  title,
  skills,
  empty,
  badgeClasses,
  icon,
  countColor,
}: {
  title: string
  skills: string[]
  empty: string
  badgeClasses: string
  icon: React.ReactNode
  countColor: string
}) {
  return (
    <section className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-5 sm:p-6 backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#3d3a52]/60 pb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-display text-sm sm:text-base font-semibold text-[#f5ede9]">{title}</h3>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${countColor}`}>
            {skills.length}
          </span>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className={`inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm transition-transform hover:scale-105 ${badgeClasses}`}
                title={skill}
              >
                {icon}
                <span className="truncate max-w-[200px]">{skill}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#a09098] py-3">{empty}</p>
        )}
      </div>
    </section>
  )
}

export default function SkillsGrid({ matched, partial, missing }: SkillsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <SkillColumn
        title="Matched Skills"
        skills={matched}
        empty="No exact matches identified."
        badgeClasses="border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        countColor="bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
        icon={
          <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        }
      />
      <SkillColumn
        title="Partial Matches"
        skills={partial}
        empty="No partial or transferable skills found."
        badgeClasses="border-amber-500/30 bg-amber-500/10 text-amber-200"
        countColor="bg-amber-500/10 text-amber-300 border-amber-500/30"
        icon={
          <span className="text-amber-400 text-xs font-bold leading-none shrink-0">
            ≈
          </span>
        }
      />
      <SkillColumn
        title="Missing Skills"
        skills={missing}
        empty="No missing skills detected. Excellent coverage!"
        badgeClasses="border-rose-500/30 bg-rose-500/10 text-rose-200"
        countColor="bg-rose-500/10 text-rose-300 border-rose-500/30"
        icon={
          <svg className="w-3 h-3 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        }
      />
    </div>
  )
}
