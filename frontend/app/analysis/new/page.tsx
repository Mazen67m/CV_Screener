'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import CvUploadZone from '@/components/cv-upload/CvUploadZone'
import JdInputZone from '@/components/jd-input/JdInputZone'

export default function NewAnalysisPage() {
  const [cvData, setCvData] = useState<{ extractedText: string; fileName: string } | null>(null)
  const [jdData, setJdData] = useState<{ cleanedText: string; wordCount: number } | null>(null)

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

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
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

        {/* Action Stub Button */}
        <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-900">
          <button
            type="button"
            disabled={!isReady}
            className={`w-full max-w-md py-4 px-6 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
              isReady
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20 scale-[1.01] cursor-pointer'
                : 'bg-gray-900/50 text-gray-500 border border-gray-800/80 cursor-not-allowed shadow-none'
            }`}
          >
            <span>Analyze Resume</span>
            {isReady && (
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
          {!isReady && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Please upload a valid PDF CV and paste a job description (50 to 5000 words) to enable analysis.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
