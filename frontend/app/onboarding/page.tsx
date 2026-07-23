'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getMe, setRole } from '@/lib/api'

export default function OnboardingPage() {
  const { isLoaded, userId, getToken } = useAuth()
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<'job_seeker' | 'recruiter' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded) return
      if (!userId) {
        router.replace('/login')
        return
      }

      try {
        const token = await getToken()
        if (token) {
          const profile = await getMe(token)
          if (profile.role) {
            router.replace('/dashboard')
          } else {
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Error during onboarding check:', err)
        // If it's a new user they might not be in DB yet, so getMe returns null role which is expected.
        setLoading(false)
      }
    }

    checkRole()
  }, [isLoaded, userId, router, getToken])

  const handleSubmit = async () => {
    if (!selectedRole) return
    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication token is missing.')
      }

      await setRole(selectedRole, token)
      router.replace('/dashboard')
    } catch (err) {
      console.error('Failed to save role:', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-gray-400 text-sm animate-pulse">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>

      <div className="max-w-2xl w-full text-center space-y-8 z-10">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Choose Your Role
          </h1>
          <p className="text-gray-400 text-lg">
            Personalize your experience. How will you use CV Screener?
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-medium mt-2">
            <span>⚠️</span> This choice is permanent
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm transition-all duration-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Job Seeker Card */}
          <button
            onClick={() => !submitting && setSelectedRole('job_seeker')}
            className={`flex flex-col items-center text-center p-8 bg-gray-900/40 border rounded-2xl transition-all duration-300 backdrop-blur-md relative overflow-hidden group ${
              selectedRole === 'job_seeker'
                ? 'border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.2)] bg-indigo-950/20'
                : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/60'
            } ${submitting ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="p-4 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300 text-indigo-400 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Job Seeker</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Analyze your CV against job descriptions, find skill gaps, and get a personalized learning path.
            </p>
          </button>

          {/* Recruiter Card */}
          <button
            onClick={() => !submitting && setSelectedRole('recruiter')}
            className={`flex flex-col items-center text-center p-8 bg-gray-900/40 border rounded-2xl transition-all duration-300 backdrop-blur-md relative overflow-hidden group ${
              selectedRole === 'recruiter'
                ? 'border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.2)] bg-purple-950/20'
                : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/60'
            } ${submitting ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="p-4 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300 text-purple-400 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637ZM12 7.5v9m-4.5-4.5h9"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Recruiter</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Screen candidate resumes against target job descriptions and rank compatibility instantly.
            </p>
          </button>
        </div>

        <div className="pt-6">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || submitting}
            className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 mx-auto ${
              selectedRole && !submitting
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/45 cursor-pointer hover:-translate-y-0.5'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Confirm Selection</span>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
