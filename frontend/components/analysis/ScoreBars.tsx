'use client'

import React, { useEffect, useState } from 'react'

interface ScoreBarsProps {
  textSimilarity: number
  skillsScore: number
  experienceScore: number
}

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value * 100), 0), 100)
}

export default function ScoreBars({
  textSimilarity,
  skillsScore,
  experienceScore,
}: ScoreBarsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const rows = [
    {
      label: 'Text Similarity',
      description: 'Lexical and semantic alignment between resume and job text',
      weight: '×0.50',
      value: toPercent(textSimilarity),
      fill: 'bg-sky-400',
      textColor: 'text-sky-400',
      delay: 'delay-[100ms]',
    },
    {
      label: 'Skills Fit',
      description: 'Hard and technical skill taxonomy coverage',
      weight: '×0.35',
      value: toPercent(skillsScore),
      fill: 'bg-violet-400',
      textColor: 'text-violet-400',
      delay: 'delay-[250ms]',
    },
    {
      label: 'Experience Match',
      description: 'Seniority and work history alignment with role requirements',
      weight: '×0.15',
      value: toPercent(experienceScore),
      fill: 'bg-emerald-400',
      textColor: 'text-emerald-400',
      delay: 'delay-[400ms]',
    },
  ]

  return (
    <div className="flex flex-col space-y-6">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col space-y-2">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display text-sm font-semibold text-[#f5ede9]">
                  {row.label}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#575068]/80 border border-[#3d3a52] text-[#a09098]">
                  {row.weight}
                </span>
              </div>
              <p className="text-xs text-[#a09098] mt-0.5 hidden sm:block">
                {row.description}
              </p>
            </div>

            <span className={`font-display text-base font-bold ${row.textColor}`}>
              {row.value}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="h-3 overflow-hidden rounded-full bg-[#0d2f3e] border border-[#3d3a52]/60">
            <div
              className={`h-full rounded-full ${row.fill} transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none origin-left ${row.delay}`}
              style={{ transform: `scaleX(${mounted ? row.value / 100 : 0})` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
