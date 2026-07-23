import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/api'

/**
 * Server-side layout that guards every route under /dashboard.
 *
 * Role resolution strategy (two-layer, handles Clerk sync failures):
 *   Layer 1: Read `publicMetadata.role` from Clerk — fast, no network call.
 *   Layer 2: If layer 1 returns no role, call GET /api/auth/me as the
 *            authoritative fallback. This covers the split-brain scenario
 *            where the DB write succeeded but the Clerk metadata sync failed.
 *
 * Flow:
 *   Unauthenticated          → /login   (Clerk middleware handles this first)
 *   Authenticated, no role   → /onboarding  (both layers confirm no role)
 *   Authenticated, has role  → render dashboard
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  // Middleware already redirects unauthenticated users, but defend in depth.
  if (!user) {
    redirect('/login')
  }

  // Layer 1: Fast path — role is in Clerk session metadata (set by .NET after role selection).
  const roleFromClerk = (user.publicMetadata as { role?: string }).role ?? null

  if (roleFromClerk) {
    return <>{children}</>
  }

  // Layer 2: Fallback — Clerk metadata may be stale if the sync call failed after
  // the DB write. Call the .NET backend to get the authoritative role from the DB.
  try {
    const { getToken } = await auth()
    const token = await getToken()
    if (token) {
      const profile = await getMe(token)
      if (profile.role) {
        // DB has a role but Clerk metadata is stale — let the user in.
        // The next Clerk metadata sync will repair this eventually.
        return <>{children}</>
      }
    }
  } catch {
    // If the backend is unreachable, fall through to /onboarding.
    // Onboarding will re-check and surface the error there.
  }

  // Both layers agree: user has no role yet — send to onboarding.
  redirect('/onboarding')
}
