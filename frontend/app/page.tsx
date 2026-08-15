import React from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import LandingNav from '@/components/landing/LandingNav'
import GlazedScoreDemo from '@/components/landing/GlazedScoreDemo'
import LandingProcession from '@/components/landing/LandingProcession'
import LandingFooter from '@/components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      {/* Top Frosted Nav */}
      <LandingNav />

      {/* Main Hero Container */}
      <main className="flex-1 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col space-y-16 sm:space-y-20">
          
          {/* Top Hero Text + CTA Block */}
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center space-y-6">
            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#f5ede9] text-balance leading-[1.1]">
              See exactly how your CV matches any job.
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg md:text-xl text-[#a09098] max-w-2xl text-balance leading-relaxed">
              Upload your CV. Paste any job. Get your match score, missing skills, and actionable learning paths in seconds.
            </p>

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto px-8 py-4 bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold rounded-xl text-base shadow-lg shadow-[#b8796a]/25 hover:shadow-[#b8796a]/40 transition-all duration-200 flex items-center justify-center space-x-2">
                    <span>Analyze your CV</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/analysis/new"
                  className="w-full sm:w-auto px-8 py-4 bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] font-semibold rounded-xl text-base shadow-lg shadow-[#b8796a]/25 hover:shadow-[#b8796a]/40 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Start New Analysis</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </SignedIn>

              <Link
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-4 rounded-xl text-sm font-semibold text-[#f5ede9]/90 hover:text-white border border-[#3d3a52] hover:border-[#575068] bg-[#575068]/40 hover:bg-[#575068]/80 transition-all duration-200 text-center"
              >
                Explore pipeline
              </Link>
            </div>
          </div>

          {/* Interactive Glazed Score Shelf Demo Component */}
          <div className="max-w-4xl mx-auto w-full">
            <GlazedScoreDemo />
          </div>

          {/* 5-Step Procession */}
          <LandingProcession />

        </div>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
