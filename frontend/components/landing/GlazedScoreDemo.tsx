'use client'

import React, { useEffect, useState } from 'react'

interface SkillItem {
  name: string
  status: 'matched' | 'partial' | 'missing'
  delay: number
}

const DEMO_SKILLS: SkillItem[] = [
  { name: 'React', status: 'matched', delay: 100 },
  { name: 'TypeScript', status: 'matched', delay: 180 },
  { name: '.NET Core', status: 'matched', delay: 260 },
  { name: 'Node.js', status: 'matched', delay: 340 },
  { name: 'REST APIs', status: 'partial', delay: 420 },
  { name: 'Docker', status: 'partial', delay: 500 },
  { name: 'GraphQL', status: 'missing', delay: 580 },
  { name: 'Kubernetes', status: 'missing', delay: 660 },
]

export default function GlazedScoreDemo() {
  const [mounted, setMounted] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)

  const targetScore = 74
  const radius = 64
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - (mounted ? targetScore : 0) / 100)

  useEffect(() => {
    setMounted(true)
    const duration = 1200
    const start = performance.now()

    const frame = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * targetScore))
      if (progress < 1) {
        requestAnimationFrame(frame)
      }
    }

    const animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="w-full rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-black/40">
      {/* Top Demo Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3d3a52]/60 pb-5">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#a09098]">
              Live Compatibility Scan
            </p>
            <p className="text-sm font-medium text-[#f5ede9]">
              Senior Fullstack Engineer · FinTech
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
          <span>AI Radar v1.0</span>
        </div>
      </div>

      {/* Main Grid: Score Gauge Left + Deposited Chips Right */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left: Score Gauge Dial */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative grid h-44 w-44 place-items-center">
            <svg
              className="h-full w-full -rotate-90 transform"
              viewBox="0 0 160 160"
              aria-hidden="true"
            >
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className="stroke-[#3d3a52]/80"
              />
              {/* Animated Foreground Arc */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="stroke-sky-400 transition-[stroke-dashoffset] duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
              />
            </svg>

            {/* Score Center Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold tracking-tight text-[#f5ede9]">
                {animatedScore}
                <span className="text-2xl text-sky-400 font-semibold">%</span>
              </span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a09098]">
                Match Score
              </span>
            </div>
          </div>

          {/* Score Verdict Pill */}
          <div className="mt-4 inline-flex items-center space-x-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Strong Match</span>
          </div>
        </div>

        {/* Right: Skills Deposited Chips Shelf */}
        <div className="md:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#a09098]">
              Taxonomy Breakdown
            </span>
            <span className="text-xs text-[#a09098]">
              8 key skills evaluated
            </span>
          </div>

          {/* Deposited Chips Container */}
          <div className="flex flex-wrap gap-2.5 min-h-[110px] items-start content-start">
            {DEMO_SKILLS.map((skill) => {
              let badgeStyles = ''
              let icon = null

              if (skill.status === 'matched') {
                badgeStyles =
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                icon = (
                  <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )
              } else if (skill.status === 'partial') {
                badgeStyles =
                  'border-amber-500/30 bg-amber-500/10 text-amber-200'
                icon = (
                  <span className="text-amber-400 text-xs font-bold leading-none shrink-0">
                    ≈
                  </span>
                )
              } else {
                badgeStyles =
                  'border-rose-500/30 bg-rose-500/10 text-rose-200'
                icon = (
                  <svg className="w-3 h-3 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )
              }

              return (
                <div
                  key={skill.name}
                  style={{
                    animationDelay: `${skill.delay}ms`,
                  }}
                  className={`animate-chip-drop inline-flex items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-transform hover:scale-105 ${badgeStyles}`}
                >
                  {icon}
                  <span>{skill.name}</span>
                </div>
              )
            })}
          </div>

          {/* Dimension Mini Breakdown Bars */}
          <div className="pt-3 border-t border-[#3d3a52]/60 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-[#575068]/60 p-2 border border-[#3d3a52]/40">
              <span className="text-[10px] text-[#a09098] uppercase tracking-wider block">Text Match</span>
              <span className="font-display font-semibold text-sm text-sky-400">68%</span>
            </div>
            <div className="rounded-lg bg-[#575068]/60 p-2 border border-[#3d3a52]/40">
              <span className="text-[10px] text-[#a09098] uppercase tracking-wider block">Skills Fit</span>
              <span className="font-display font-semibold text-sm text-purple-400">81%</span>
            </div>
            <div className="rounded-lg bg-[#575068]/60 p-2 border border-[#3d3a52]/40">
              <span className="text-[10px] text-[#a09098] uppercase tracking-wider block">Experience</span>
              <span className="font-display font-semibold text-sm text-emerald-400">79%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
