'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0d2f3e]/90 backdrop-blur-md border-b border-[#3d3a52]/80 py-3 shadow-lg shadow-black/30'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#f5ede9] hover:text-[#d9998a] transition-colors"
        >
          CV Screener
        </Link>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="#how-it-works"
            className="text-sm text-[#a09098] hover:text-[#f5ede9] transition-colors"
          >
            How it works
          </Link>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-semibold text-[#f5ede9] hover:text-white px-4 py-2 rounded-lg border border-[#3d3a52] hover:border-[#575068] bg-[#575068]/60 hover:bg-[#575068]/80 transition-all">
                Sign in
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="text-sm font-semibold text-[#f5ede9] px-4 py-2 rounded-lg bg-[#b8796a] hover:bg-[#d9998a] transition-all shadow-sm shadow-[#b8796a]/30">
                Analyze your CV →
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[#f5ede9] px-4 py-2 rounded-lg bg-[#b8796a] hover:bg-[#d9998a] transition-all shadow-sm shadow-[#b8796a]/30"
            >
              Dashboard →
            </Link>
          </SignedIn>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="p-2 rounded-lg text-[#a09098] hover:text-[#f5ede9] hover:bg-[#575068]/40 border border-[#3d3a52] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0d2f3e]/95 backdrop-blur-lg border-b border-[#3d3a52] px-6 py-5 flex flex-col space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <Link
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="text-base text-[#a09098] hover:text-[#f5ede9] py-2"
          >
            How it works
          </Link>
          <div className="pt-2 border-t border-[#3d3a52]/80 flex flex-col space-y-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center text-sm font-semibold text-[#f5ede9] py-3 rounded-lg border border-[#3d3a52] bg-[#575068]/60 hover:bg-[#575068]/80 transition-colors"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center text-sm font-semibold text-[#f5ede9] py-3 rounded-lg bg-[#b8796a] hover:bg-[#d9998a] transition-colors"
                >
                  Analyze your CV →
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center text-sm font-semibold text-[#f5ede9] py-3 rounded-lg bg-[#b8796a] hover:bg-[#d9998a] transition-colors"
              >
                Go to Dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </header>
  )
}
