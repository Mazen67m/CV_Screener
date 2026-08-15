'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { getMe, setRole } from '@/lib/api'

export default function OnboardingPage() {
  const { isLoaded, userId, getToken } = useAuth()
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<'job_seeker' | 'recruiter' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Job Seeker Form Fields
  const [targetRole, setTargetRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('mid')
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [preferredIndustries, setPreferredIndustries] = useState('')

  // Recruiter Form Fields
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('11-50')
  const [hiringRoles, setHiringRoles] = useState('')

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
            return
          }
        }
      } catch (err) {
        console.error('Error during onboarding check:', err)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [isLoaded, userId, router, getToken])

  // Check if at least one profile field is filled
  const hasJobSeekerField =
    targetRole.trim().length > 0 ||
    yearsOfExperience.trim().length > 0 ||
    preferredIndustries.trim().length > 0

  const hasRecruiterField =
    companyName.trim().length > 0 ||
    industry.trim().length > 0 ||
    hiringRoles.trim().length > 0

  const isFormValid =
    (selectedRole === 'job_seeker' && hasJobSeekerField) ||
    (selectedRole === 'recruiter' && hasRecruiterField)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole || !isFormValid || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Authentication token is missing.')

      // Build profile payload — only include non-empty strings (DEC-019 / F-13)
      const profile =
        selectedRole === 'job_seeker'
          ? {
              targetRole:          targetRole.trim()          || undefined,
              experienceLevel:     experienceLevel            || undefined,
              yearsOfExperience:   yearsOfExperience.trim()  || undefined,
              preferredIndustries: preferredIndustries.trim() || undefined,
            }
          : {
              companyName:  companyName.trim()  || undefined,
              industry:     industry.trim()     || undefined,
              companySize:  companySize         || undefined,
              hiringRoles:  hiringRoles.trim()  || undefined,
            }

      await setRole(selectedRole, token, profile)
      router.replace('/dashboard')
    } catch (err: unknown) {
      console.error('Failed to save role:', err)
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }
      setError(axiosErr.response?.data?.error ?? 'Something went wrong saving your profile. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#b8796a] border-t-transparent" />
          <p className="text-[#a09098] text-sm animate-pulse">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d2f3e] text-[#f5ede9] flex flex-col justify-between py-12 px-4 sm:px-6 relative selection:bg-[#b8796a]/40 selection:text-white">
      {/* Centered Brand Header */}
      <div className="max-w-2xl mx-auto w-full text-center mb-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight text-[#f5ede9] hover:text-[#d9998a] transition-colors"
        >
          CV Screener
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="max-w-3xl mx-auto w-full flex flex-col space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5ede9]">
            Welcome. Tell us who you are.
          </h1>
          <p className="text-sm sm:text-base text-[#a09098] max-w-lg mx-auto">
            We will personalize your resume analysis, skill scoring, and recruitment intelligence pipeline.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-8">
          {/* ── Role Selection Tiles ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Job Seeker Tile */}
            <button
              type="button"
              onClick={() => setSelectedRole('job_seeker')}
              className={`rounded-2xl border p-6 sm:p-8 text-left transition-all duration-300 backdrop-blur-md relative flex flex-col justify-between space-y-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8796a] ${
                selectedRole === 'job_seeker'
                  ? 'border-[#b8796a] bg-[#b8796a]/15 border-l-4 border-l-[#b8796a] shadow-[0_0_25px_rgba(184,121,106,0.15)]'
                  : selectedRole === 'recruiter'
                  ? 'border-[#3d3a52]/80 bg-[#575068]/30 opacity-60 hover:opacity-90'
                  : 'border-[#3d3a52]/80 bg-[#575068]/40 hover:border-[#575068] hover:bg-[#575068]/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#575068]/80 border border-[#3d3a52] rounded-xl text-[#d9998a]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {selectedRole === 'job_seeker' && (
                    <span className="inline-flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <span>✓ Selected</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display text-xl font-bold text-[#f5ede9] mb-1">
                  Job Seeker
                </h3>
                <p className="text-xs sm:text-sm text-[#a09098] leading-relaxed">
                  Evaluate your CV fit against target jobs, discover missing technical skills, and follow tailored learning paths.
                </p>
              </div>

              <span className="text-xs font-semibold text-[#d9998a]">
                Career insights & gap analysis →
              </span>
            </button>

            {/* Recruiter Tile */}
            <button
              type="button"
              onClick={() => setSelectedRole('recruiter')}
              className={`rounded-2xl border p-6 sm:p-8 text-left transition-all duration-300 backdrop-blur-md relative flex flex-col justify-between space-y-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8796a] ${
                selectedRole === 'recruiter'
                  ? 'border-[#b8796a] bg-[#b8796a]/15 border-l-4 border-l-[#b8796a] shadow-[0_0_25px_rgba(184,121,106,0.15)]'
                  : selectedRole === 'job_seeker'
                  ? 'border-[#3d3a52]/80 bg-[#575068]/30 opacity-60 hover:opacity-90'
                  : 'border-[#3d3a52]/80 bg-[#575068]/40 hover:border-[#575068] hover:bg-[#575068]/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#575068]/80 border border-[#3d3a52] rounded-xl text-[#d9998a]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  {selectedRole === 'recruiter' && (
                    <span className="inline-flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <span>✓ Selected</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display text-xl font-bold text-[#f5ede9] mb-1">
                  Recruiter / HR
                </h3>
                <p className="text-xs sm:text-sm text-[#a09098] leading-relaxed">
                  Screen high candidate volumes against job descriptions with fast, consistent, and explainable scoring.
                </p>
              </div>

              <span className="text-xs font-semibold text-[#d9998a]">
                Screening & candidate evaluation →
              </span>
            </button>
          </div>

          {/* ── Expanding Profile Fields ── */}
          {selectedRole === 'job_seeker' && (
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="border-b border-[#3d3a52]/80 pb-3">
                <h3 className="font-display text-base font-semibold text-[#f5ede9]">
                  Job Seeker Profile Details
                </h3>
                <p className="text-xs text-[#a09098]">
                  Provide at least one detail to help tune your matching preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Role */}
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="target-role" className="text-xs font-semibold text-[#f5ede9]">
                    Target Role / Job Title *
                  </label>
                  <input
                    id="target-role"
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior .NET Developer, Frontend Engineer"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>

                {/* Experience Level */}
                <div className="space-y-1">
                  <label htmlFor="exp-level" className="text-xs font-semibold text-[#f5ede9]">
                    Experience Level
                  </label>
                  <select
                    id="exp-level"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  >
                    <option value="junior" className="bg-[#0d2f3e] text-[#f5ede9]">Junior (0–2 years)</option>
                    <option value="mid" className="bg-[#0d2f3e] text-[#f5ede9]">Mid-Level (3–5 years)</option>
                    <option value="senior" className="bg-[#0d2f3e] text-[#f5ede9]">Senior (5–8 years)</option>
                    <option value="lead" className="bg-[#0d2f3e] text-[#f5ede9]">Lead / Principal (8+ years)</option>
                  </select>
                </div>

                {/* Years of Experience */}
                <div className="space-y-1">
                  <label htmlFor="years-exp" className="text-xs font-semibold text-[#f5ede9]">
                    Years of Experience
                  </label>
                  <input
                    id="years-exp"
                    type="number"
                    min="0"
                    max="50"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>

                {/* Preferred Industries */}
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="industries" className="text-xs font-semibold text-[#f5ede9]">
                    Preferred Industries / Target Companies
                  </label>
                  <input
                    id="industries"
                    type="text"
                    value={preferredIndustries}
                    onChange={(e) => setPreferredIndustries(e.target.value)}
                    placeholder="e.g. FinTech, Cloud SaaS, HealthTech, Accenture"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'recruiter' && (
            <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="border-b border-[#3d3a52]/80 pb-3">
                <h3 className="font-display text-base font-semibold text-[#f5ede9]">
                  Recruitment Organization Details
                </h3>
                <p className="text-xs text-[#a09098]">
                  Provide at least one detail to help configure candidate screening filters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="company-name" className="text-xs font-semibold text-[#f5ede9]">
                    Company / Agency Name *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Technologies, Global Talent Search"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>

                {/* Industry */}
                <div className="space-y-1">
                  <label htmlFor="industry" className="text-xs font-semibold text-[#f5ede9]">
                    Primary Industry
                  </label>
                  <input
                    id="industry"
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Software & Technology"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-1">
                  <label htmlFor="company-size" className="text-xs font-semibold text-[#f5ede9]">
                    Company Size
                  </label>
                  <select
                    id="company-size"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  >
                    <option value="1-10" className="bg-[#0d2f3e] text-[#f5ede9]">1–10 employees (Startup)</option>
                    <option value="11-50" className="bg-[#0d2f3e] text-[#f5ede9]">11–50 employees (Growth)</option>
                    <option value="51-200" className="bg-[#0d2f3e] text-[#f5ede9]">51–200 employees (Mid-market)</option>
                    <option value="200+" className="bg-[#0d2f3e] text-[#f5ede9]">200+ employees (Enterprise)</option>
                  </select>
                </div>

                {/* Primary Hiring Roles */}
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="hiring-roles" className="text-xs font-semibold text-[#f5ede9]">
                    Active Hiring Roles
                  </label>
                  <input
                    id="hiring-roles"
                    type="text"
                    value={hiringRoles}
                    onChange={(e) => setHiringRoles(e.target.value)}
                    placeholder="e.g. .NET Engineers, Solution Architects, DevOps"
                    className="w-full rounded-xl border border-[#3d3a52] bg-[#575068]/70 px-4 py-3 text-sm text-[#f5ede9] placeholder-[#a09098]/70 focus:outline-none focus:ring-2 focus:ring-[#b8796a]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Submit Action Trigger ── */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-4">
            <button
              type="submit"
              disabled={!selectedRole || !isFormValid || submitting}
              className={`w-full max-w-sm py-4 px-8 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center space-x-2 ${
                selectedRole && isFormValid && !submitting
                  ? 'bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] shadow-lg shadow-[#b8796a]/30 hover:shadow-[#b8796a]/40 cursor-pointer'
                  : 'bg-[#575068]/30 text-[#a09098]/60 border border-[#3d3a52]/80 cursor-not-allowed shadow-none'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <span>Continue to Dashboard</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {selectedRole && !isFormValid && (
              <p className="text-xs text-[#a09098] text-center">
                Please fill in at least one profile detail above to proceed.
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Minimal Footer */}
      <div className="max-w-2xl mx-auto w-full text-center text-xs text-[#a09098]/60 mt-12">
        <span>© 2026 CV Screener. All rights reserved.</span>
      </div>
    </main>
  )
}
