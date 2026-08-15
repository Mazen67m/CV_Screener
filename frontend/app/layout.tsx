import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  display: 'swap',
})

const clashDisplay = localFont({
  src: [
    {
      path: './fonts/ClashDisplay-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/ClashDisplay-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/ClashDisplay-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-clash',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'CV Screener — AI-Powered Resume Intelligence',
  description:
    'Analyze your CV against any job description using AI. Get instant match scores, skills analysis, and a personalized learning path.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${geist.variable} ${clashDisplay.variable}`}>
        <body className="min-h-screen bg-[#0d2f3e] font-sans text-[#f5ede9] antialiased selection:bg-[#b8796a]/40 selection:text-white">
          {/*
            THESIS: The match score flows and deposits like molten glaze; gravity-as-verdict replaces generic SaaS metric dials.
            OWN-WORLD: Deep navy-teal canvas #0d2f3e, 1px tonal borders #3d3a52, translucent slate-purple surfaces #575068/40, Clash Display display typography, emerald/amber/rose semantic status chips.
            STORY: First-time job seekers and recruiters see a live match score and skill breakdown animate instantly, understanding compatibility in one glance before applying or screening.
            FIRST VIEWPORT: Top frosted nav, left fluid 0->74% score arc with Strong Match verdict, right staggered skill deposit chips, bold Clash Display headline, prominent terracotta Analyze CTA.
            FORM: The Glazed Score Shelf · seed bd8735f2
            FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
          */}
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
