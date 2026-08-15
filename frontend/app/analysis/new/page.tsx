'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import AppNav from '@/components/nav/AppNav'
import AppFooter from '@/components/nav/AppFooter'
import CvUploadZone from '@/components/cv-upload/CvUploadZone'
import JdInputZone from '@/components/jd-input/JdInputZone'
import { analyzeCV } from '@/lib/api'

export default function NewAnalysisPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [cvData, setCvData] = useState<{ extractedText: string; fileName: string; wordCount: number } | null>(null)
  const [jdData, setJdData] = useState<{ cleanedText: string; wordCount: number } | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCvSuccess = (data: { extractedText: string; wordCount: number; fileName: string }) => {
    setCvData({
      extractedText: data.extractedText,
      fileName: data.fileName,
      wordCount: data.wordCount,
    })
  }

  const handleJdValid = (data?: { cleanedText: string; wordCount: number }) => {
    if (data) {
      setJdData(data)
    } else {
      setJdData(null)
    }
  }

  const isReady = !!cvData && !!jdData

  const handleAnalyze = async () => {
    if (!cvData || !jdData || isAnalyzing) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated. Please sign in again.')

      const result = await analyzeCV(
        {
          cvText: cvData.extractedText,
          jdText: jdData.cleanedText,
          jobTitle: jobTitle.trim() || undefined,
        },
        token
      )

      router.push(`/analysis/${result.id}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }
      setError(
        axiosErr.response?.data?.error
        ?? axiosErr.message
        ?? 'Analysis failed. Please check your network and try again.'
      )
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between selection:bg-[#b8796a]/40 selection:text-white">
      {/* Top App Nav */}
      <AppNav />

      {/* Main Form Flow */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col space-y-8">
          
          {/* Header & Back Navigation */}
          <div className="flex flex-col space-y-3 border-b border-[#3d3a52]/80 pb-6">
            <Link 
              href="/dashboard" 
              className="text-xs font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors flex items-center space-x-1 w-fit"
            >
              <span>&larr; Back to Dashboard</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#f5ede9]">
                  New Resume Analysis
                </h1>
                <p className="text-sm text-[#a09098] mt-1 max-w-xl">
                  Upload your CV in PDF format and paste the Job Description to generate an explainable match score and skill breakdown.
                </p>
              </div>

              {/* Progress Summary Pill */}
              <div className="inline-flex items-center space-x-2 rounded-full border border-[#3d3a52] bg-[#575068]/60 px-3.5 py-1.5 text-xs text-[#a09098] self-start sm:self-auto">
                <span className="font-medium text-[#f5ede9]">
                  {cvData && jdData ? '2 of 2 steps ready' : cvData || jdData ? '1 of 2 steps ready' : '0 of 2 steps ready'}
                </span>
                <span className={`h-2 w-2 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-[#3d3a52]'}`} />
              </div>
            </div>
          </div>

          {/* ── STEP 1: CV UPLOAD ── */}
          <section
            className={`rounded-2xl border bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md transition-all duration-300 ${
              cvData
                ? 'border-[#3d3a52] border-l-4 border-l-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                : 'border-[#3d3a52]/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center space-x-3">
                <span className="font-display text-xl sm:text-2xl font-bold text-[#d9998a]">
                  01
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#f5ede9]">
                    Upload CV
                  </h2>
                  <p className="text-xs text-[#a09098]">
                    PDF format (Max 5 MB)
                  </p>
                </div>
              </div>

              {cvData && (
                <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 animate-in fade-in duration-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>CV Extracted ({cvData.wordCount} words)</span>
                </div>
              )}
            </div>

            <CvUploadZone onSuccess={handleCvSuccess} />
          </section>

          {/* ── STEP 2: JOB DESCRIPTION ── */}
          <section
            className={`rounded-2xl border bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md transition-all duration-300 ${
              jdData
                ? 'border-[#3d3a52] border-l-4 border-l-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                : 'border-[#3d3a52]/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center space-x-3">
                <span className="font-display text-xl sm:text-2xl font-bold text-[#d9998a]">
                  02
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#f5ede9]">
                    Job Description
                  </h2>
                  <p className="text-xs text-gray-400">
                    Paste role requirements (50 to 5,000 words)
                  </p>
                </div>
              </div>

              {jdData && (
                <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 animate-in fade-in duration-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Valid Requirements ({jdData.wordCount} words)</span>
                </div>
              )}
            </div>

            <JdInputZone onValid={handleJdValid} />
          </section>

          {/* ── STEP 3: JOB TITLE (OPTIONAL) ── */}
          <section className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-4">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#d9998a]">
                03
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-[#f5ede9]">
                  Job Title <span className="text-xs font-normal text-[#a09098]">(optional)</span>
                </h2>
                <p className="text-xs text-[#a09098]">
                  Organize your analysis history with a clear role title
                </p>
              </div>
            </div>

            <div className="max-w-2xl">
              <input
                id="job-title-input"
                type="text"
                maxLength={200}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior .NET Engineer at Accenture"
                className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3.5 text-sm text-[#f5ede9] placeholder-[#a09098]/70 transition-all focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50 focus:border-[#b8796a]/50"
              />
            </div>
          </section>

          {/* ── ANALYZE ACTION TRIGGER ── */}
          <div className="pt-4 border-t border-[#3d3a52] flex flex-col items-center justify-center space-y-4">
            {error && (
              <div className="w-full max-w-xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200 flex items-start space-x-3">
                <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isReady || isAnalyzing}
              className={`w-full max-w-md py-4 px-8 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center space-x-3 ${
                isReady && !isAnalyzing
                  ? 'bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] shadow-lg shadow-[#b8796a]/30 hover:shadow-[#b8796a]/40 cursor-pointer'
                  : 'bg-[#575068]/30 text-[#a09098]/60 border border-[#3d3a52]/80 cursor-not-allowed shadow-none'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Analyzing Compatibility...</span>
                </>
              ) : (
                <>
                  <span>Analyze Resume</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {!isReady && !isAnalyzing && (
              <p className="text-xs text-[#a09098] text-center max-w-sm">
                Please complete Steps 01 and 02 above to enable the AI compatibility analysis.
              </p>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
