'use client'

import React from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

interface AppNavProps {
  remainingAnalyses?: number
  planName?: string
}

export default function AppNav({
  remainingAnalyses = 14,
  planName = 'Free',
}: AppNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#3d3a52]/80 bg-[#0d2f3e]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Wordmark */}
        <div className="flex items-center space-x-6">
          <Link
            href="/dashboard"
            className="font-display text-xl font-bold tracking-tight text-[#f5ede9] hover:text-[#d9998a] transition-colors"
          >
            CV Screener
          </Link>
          <nav className="hidden sm:flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#a09098] hover:text-[#f5ede9] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/analysis/new"
              className="text-xs font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors"
            >
              New Analysis
            </Link>
          </nav>
        </div>

        {/* Right: Plan chip & User avatar */}
        <div className="flex items-center space-x-4">
          {/* Plan-aware usage chip */}
          <div className="hidden sm:inline-flex items-center space-x-1.5 rounded-full border border-[#3d3a52] bg-[#575068]/80 px-3 py-1 text-xs text-[#a09098]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-[#f5ede9]">{planName}</span>
            <span className="text-[#a09098]/60">·</span>
            <span>{remainingAnalyses} remaining</span>
          </div>

          {/* User Button */}
          <div className="flex items-center pl-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 rounded-full ring-1 ring-[#3d3a52] hover:ring-[#b8796a] transition-all',
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
