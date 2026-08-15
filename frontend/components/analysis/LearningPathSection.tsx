'use client'

import React, { useState } from 'react'

interface LearningPathSectionProps {
  missingSkills: string[]
}

// Synthetic curated recommendations for common tech skills
// TODO: Wire to backend API learning path recommendations endpoint when available
const RESOURCE_MAP: Record<string, { title: string; type: 'Course' | 'Doc' | 'Article'; desc: string; url: string }[]> = {
  Docker: [
    { title: 'Docker Getting Started Guide', type: 'Doc', desc: 'Container fundamentals, Dockerfiles, and compose configurations.', url: '#' },
    { title: 'Production Containers with Kubernetes', type: 'Course', desc: 'Multi-stage builds and container lifecycle management.', url: '#' },
  ],
  Kubernetes: [
    { title: 'Kubernetes Official Fundamentals', type: 'Doc', desc: 'Pods, Services, Deployments, and Ingress routing architecture.', url: '#' },
    { title: 'CKA Certified Administrator Track', type: 'Course', desc: 'Cluster operations and cloud deployment strategies.', url: '#' },
  ],
  GraphQL: [
    { title: 'GraphQL Schemas & Resolvers Core', type: 'Doc', desc: 'Query design, mutations, subscriptions, and federation.', url: '#' },
    { title: 'Building Scalable APIs with GraphQL & Node', type: 'Course', desc: 'DataLoader pattern and query optimization.', url: '#' },
  ],
  TypeScript: [
    { title: 'TypeScript Handbook v5', type: 'Doc', desc: 'Generics, utility types, and strict mode migration.', url: '#' },
    { title: 'Advanced TypeScript Patterns', type: 'Article', desc: 'Conditional types and type-level programming.', url: '#' },
  ],
  React: [
    { title: 'React 19 Server Components & Actions', type: 'Doc', desc: 'Modern async components and state primitives.', url: '#' },
  ],
}

function getDefaultResources(skill: string) {
  return [
    {
      title: `${skill} Mastery & Core Concepts`,
      type: 'Doc' as const,
      desc: `Understand the foundational principles, syntax, and production patterns of ${skill}.`,
      url: '#',
    },
    {
      title: `Hands-on Project with ${skill}`,
      type: 'Course' as const,
      desc: `Build and deploy a real-world project demonstrating ${skill} proficiency on your CV.`,
      url: '#',
    },
  ]
}

export default function LearningPathSection({ missingSkills }: LearningPathSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!missingSkills || missingSkills.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[#3d3a52]/80 bg-[#575068]/40 p-6 sm:p-8 backdrop-blur-md transition-all">
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8796a] rounded-xl"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#575068]/80 border border-[#3d3a52] text-[#d9998a]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-semibold text-[#f5ede9] group-hover:text-[#d9998a] transition-colors">
              Recommended Learning Path
            </h3>
            <p className="text-xs text-[#a09098]">
              Targeted curriculum to bridge {missingSkills.length} identified skill gaps
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-[#d9998a] group-hover:text-[#f5ede9]">
          <span>{isOpen ? 'Hide Recommendations ↑' : 'View Recommendations ↓'}</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Recommendations Content */}
      {isOpen && (
        <div className="mt-6 pt-6 border-t border-[#3d3a52]/80 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {missingSkills.map((skill) => {
            const resources = RESOURCE_MAP[skill] ?? getDefaultResources(skill)

            return (
              <div key={skill} className="rounded-xl border border-[#3d3a52]/60 bg-[#575068]/60 p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="font-display text-sm font-semibold text-rose-300">
                    {skill}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Gap
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources.map((res, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#3d3a52]/40 bg-[#0d2f3e]/40 p-3 flex flex-col justify-between space-y-2 hover:border-[#575068] transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#f5ede9] line-clamp-1">
                            {res.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              res.type === 'Course'
                                ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                                : res.type === 'Doc'
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {res.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#a09098] line-clamp-2">
                          {res.desc}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#d9998a] hover:text-[#f5ede9] transition-colors inline-flex items-center space-x-1">
                        <span>Explore resource</span>
                        <span>→</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
