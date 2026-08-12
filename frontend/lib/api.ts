import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5263'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface UserProfile {
  id: string
  clerkId: string
  email: string
  role: 'job_seeker' | 'recruiter' | null
  createdAt: string
}

export async function getMe(token: string): Promise<UserProfile> {
  const res = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function setRole(
  role: 'job_seeker' | 'recruiter',
  token: string
): Promise<UserProfile> {
  const res = await api.post(
    '/auth/role',
    { role },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

export interface AnalyzeRequest {
  cvText: string
  jdText: string
  jobTitle?: string
}

export interface SkillBreakdown {
  matched: string[]
  partial: string[]
  missing: string[]
}

export interface ExperienceBreakdown {
  cvYears: number
  requiredYears: number
  score: number
}

export interface AnalyzeResponse {
  id: string
  jobTitle: string | null
  overallScore: number
  textSimilarity: number
  skillsScore: number
  experienceScore: number
  cvText: string
  jdText: string
  skills: SkillBreakdown
  experience: ExperienceBreakdown
  createdAt: string
}

export interface AnalyzeCreatedResponse extends AnalyzeResponse {
  isFromCache: boolean
}

export interface HistoryItem {
  id: string
  jobTitle: string | null
  overallScore: number
  matchedSkillsCount: number
  missingSkillsCount: number
  createdAt: string
}

export async function analyzeCV(
  req: AnalyzeRequest,
  token: string
): Promise<AnalyzeCreatedResponse> {
  const res = await api.post<AnalyzeCreatedResponse>('/analysis/analyze', req, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function getHistory(token: string): Promise<HistoryItem[]> {
  const res = await api.get<HistoryItem[]>('/analysis/history', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function getAnalysis(
  id: string,
  token: string
): Promise<AnalyzeResponse> {
  const res = await api.get<AnalyzeResponse>(`/analysis/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function getSharedAnalysis(id: string): Promise<AnalyzeResponse> {
  const res = await api.get<AnalyzeResponse>(`/share/${id}`)
  return res.data
}
