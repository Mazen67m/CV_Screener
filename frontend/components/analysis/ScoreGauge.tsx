'use client'

import React, { useEffect, useState } from 'react'
import { clampScore, getScoreLabel, getToneClasses } from './scoreUtils'

interface ScoreGaugeProps {
  score: number
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [mounted, setMounted] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)

  const safeScore = clampScore(score)
  const tone = getToneClasses(safeScore)
  const radius = 68
  const strokeWidth = 12
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - (mounted ? safeScore : 0) / 100)

  useEffect(() => {
    setMounted(true)
    const duration = 1200
    const start = performance.now()

    const frame = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * safeScore))
      if (progress < 1) {
        requestAnimationFrame(frame)
      }
    }

    const animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [safeScore])

  return (
    <div className="flex flex-col items-center justify-center text-center p-2">
      <div 
        className="relative grid h-48 w-48 sm:h-56 sm:w-56 place-items-center"
        role="img"
        aria-label={`Overall compatibility score: ${safeScore} out of 100 (${getScoreLabel(safeScore)})`}
      >
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160" aria-hidden="true">
          {/* Background Ring */}
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
            className={`${tone.stroke} transition-[stroke-dashoffset] duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none`}
          />
        </svg>

        {/* Centered Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-[#f5ede9]">
            {animatedScore}
            <span className="text-2xl text-[#a09098] font-semibold">%</span>
          </span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a09098]">
            Match Score
          </span>
        </div>
      </div>

      {/* 5-Range Verdict Badge */}
      <div className={`mt-4 inline-flex items-center space-x-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span>{getScoreLabel(safeScore)}</span>
      </div>
    </div>
  )
}
