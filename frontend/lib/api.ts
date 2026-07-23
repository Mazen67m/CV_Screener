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
