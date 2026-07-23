import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/api'

/**
 * Server-side layout that guards every route under /analysis.
 * Checks auth and role registration (onboarding) identical to DashboardLayout.
 */
export default async function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  // Guard: redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Layer 1 Clerk session metadata check
  const roleFromClerk = (user.publicMetadata as { role?: string }).role ?? null

  if (roleFromClerk) {
    return <>{children}</>
  }

  // Layer 2 Backend DB check fallback
  try {
    const { getToken } = await auth()
    const token = await getToken()
    if (token) {
      const profile = await getMe(token)
      if (profile.role) {
        return <>{children}</>
      }
    }
  } catch {
    // If backend is down/unreachable, fall through to redirect
  }

  // Un-onboarded user -> redirect to onboarding
  redirect('/onboarding')
}
