'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import CvUploadZone from '@/components/cv-upload/CvUploadZone'
import JdInputZone from '@/components/jd-input/JdInputZone'
import { analyzeCV } from '@/lib/api'

export default function NewAnalysisPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [cvData, setCvData] = useState<{ extractedText: string; fileName: string } | null>(null)
  const [jdData, setJdData] = useState<{ cleanedText: string; wordCount: number } | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCvSuccess = (data: { extractedText: string; wordCount: number; fileName: string }) => {
    setCvData({
      extractedText: data.extractedText,
      fileName: data.fileName,
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
        ?? 'Analysis failed. Please try again.'
      )
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <Link 
              href="/dashboard" 
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center space-x-1"
            >
              <span>&larr; Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mt-2">
              New Resume Analysis
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload your CV in PDF format and paste the Job Description below to evaluate matching score.
            </p>
          </div>
        </div>

        {/* CV Upload Section */}
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-gray-300">
            Step 1: Upload CV
          </h2>
          <CvUploadZone onSuccess={handleCvSuccess} />
        </div>

        {/* Job Description Section */}
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-gray-300">
            Step 2: Job Description
          </h2>
          <JdInputZone onValid={handleJdValid} />
        </div>

        {/* Job Title Section */}
        <div className="mx-auto flex w-full max-w-2xl flex-col space-y-2">
          <h2 className="text-lg font-semibold text-gray-300">
            Step 3: Job Title <span className="text-sm font-normal text-gray-600">(optional)</span>
          </h2>
          <input
            id="job-title-input"
            type="text"
            maxLength={200}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior .NET Engineer at Accenture"
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-600 transition focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>

        {/* Analyze Button */}
        <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-900">
          {error && (
            <div className="mb-4 w-full max-w-2xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!isReady || isAnalyzing}
            className={`w-full max-w-md py-4 px-6 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
              isReady && !isAnalyzing
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20 scale-[1.01] cursor-pointer'
                : 'bg-gray-900/50 text-gray-500 border border-gray-800/80 cursor-not-allowed shadow-none'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze Resume</span>
            )}
            {isReady && !isAnalyzing && (
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M14 5l7 7m0 0l-7 7m7-7H3" 
                />
              </svg>
            )}
          </button>
          {!isReady && !isAnalyzing && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Please upload a valid PDF CV and paste a job description (50 to 5000 words) to enable analysis.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
