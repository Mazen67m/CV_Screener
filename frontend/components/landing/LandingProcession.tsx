import React from 'react'

interface Step {
  num: string
  title: string
  desc: string
  badge: string
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Upload CV',
    desc: 'Drop your resume in PDF format. Text is extracted and structured securely in seconds.',
    badge: 'PDF parsing',
  },
  {
    num: '02',
    title: 'Paste Job',
    desc: 'Paste the target job description or role requirements you want to evaluate against.',
    badge: 'Requirement text',
  },
  {
    num: '03',
    title: 'AI Radar Scan',
    desc: 'Our hybrid engine matches skills taxonomy, semantic vectors, and experience levels.',
    badge: 'Hybrid scoring',
  },
  {
    num: '04',
    title: 'Explainable Score',
    desc: 'Get an overall compatibility percentage backed by clear dimensional sub-scores.',
    badge: 'Transparent',
  },
  {
    num: '05',
    title: 'Close the Gap',
    desc: 'Identify missing requirements and receive targeted learning recommendations.',
    badge: 'Actionable',
  },
]

export default function LandingProcession() {
  return (
    <section id="how-it-works" className="w-full py-16 sm:py-24 border-t border-[#3d3a52]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#f5ede9]">
            How CV Screener Works
          </h2>
          <p className="text-sm sm:text-base text-[#a09098]">
            A transparent 5-step intelligence pipeline designed for candidates and hiring teams alike.
          </p>
        </div>

        {/* 5-Step Procession Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {STEPS.map((step, idx) => (
            <div
              key={step.num}
              className="relative group rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-5 backdrop-blur-sm transition-all duration-200 hover:border-[#575068] hover:bg-[#575068]/60 flex flex-col justify-between"
            >
              <div>
                {/* Step Number & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-2xl font-bold text-[#d9998a]/90 group-hover:text-[#f5ede9] transition-colors">
                    {step.num}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#575068]/80 border border-[#3d3a52] text-[#f5ede9]">
                    {step.badge}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-base font-semibold text-[#f5ede9] mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#a09098] leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Connecting arrow indicator for desktop (except last item) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#3d3a52] pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
