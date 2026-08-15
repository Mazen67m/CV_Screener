import React from 'react'
import AppNav from '@/components/nav/AppNav'
import AppFooter from '@/components/nav/AppFooter'

export default function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between">
      <AppNav />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col space-y-8 animate-pulse">
          
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3d3a52]/80 pb-6">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-[#575068]/60" />
              <div className="h-8 w-64 rounded-lg bg-[#575068]" />
              <div className="h-4 w-48 rounded bg-[#575068]/60" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-[#575068]/60" />
          </div>

          {/* Top Row: Score Gauge Left + Score Bars Right */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-8 flex flex-col items-center justify-center space-y-4">
              <div className="h-44 w-44 rounded-full bg-[#575068]/80" />
              <div className="h-6 w-32 rounded-full bg-[#575068]" />
            </div>

            <div className="rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-8 space-y-6">
              <div className="h-6 w-40 rounded bg-[#575068]" />
              <div className="space-y-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 rounded bg-[#575068]" />
                      <div className="h-4 w-12 rounded bg-[#575068]" />
                    </div>
                    <div className="h-3 w-full rounded-full bg-[#575068]/60" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Breakdown Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 w-24 rounded bg-[#575068]" />
                  <div className="h-5 w-8 rounded-full bg-[#575068]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-7 w-20 rounded-full bg-[#575068]/60" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Row Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-6 space-y-3">
              <div className="h-5 w-32 rounded bg-[#575068]" />
              <div className="h-8 w-48 rounded-full bg-[#575068]" />
            </div>
            <div className="rounded-2xl border border-[#3d3a52] bg-[#575068]/40 p-6 space-y-3">
              <div className="h-5 w-36 rounded bg-[#575068]" />
              <div className="h-4 w-44 rounded bg-[#575068]" />
            </div>
          </div>

        </div>
      </main>

      <AppFooter />
    </div>
  )
}
