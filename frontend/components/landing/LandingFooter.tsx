import React from 'react'
import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="w-full border-t border-[#3d3a52] bg-[#0d2f3e] py-8 text-xs text-[#a09098]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="font-display font-semibold text-[#f5ede9]">CV Screener</span>
          <span>·</span>
          <span>© 2026 CV Screener. All rights reserved.</span>
        </div>

        <div className="flex items-center space-x-6">
          <Link href="#" className="hover:text-gray-300 transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-gray-300 transition-colors">
            Terms
          </Link>
          <Link href="#how-it-works" className="hover:text-gray-300 transition-colors">
            How it works
          </Link>
        </div>
      </div>
    </footer>
  )
}
