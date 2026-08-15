/**
 * Returns Tailwind CSS classes for the JD input border and background
 * based on the validation/typing state.
 *
 * Extracted into its own module so it can be imported by tests without
 * pulling in React / Clerk dependencies from JdInputZone.tsx.
 *
 * @param state The current JdState
 */
export type JdState = 'default' | 'valid' | 'too_short' | 'too_long'

export function getJdZoneStyles(state: JdState): string {
  switch (state) {
    case 'valid':
      return 'border-emerald-500 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.1)] focus-within:border-emerald-400'
    case 'too_short':
      return 'border-amber-500/60 bg-amber-950/5 shadow-[0_0_15px_rgba(245,158,11,0.05)] focus-within:border-amber-500'
    case 'too_long':
      return 'border-rose-500 bg-rose-950/10 shadow-[0_0_20px_rgba(244,63,94,0.1)] focus-within:border-rose-400'
    case 'default':
    default:
      return 'border-[#3d3a52] bg-[#575068]/40 hover:border-[#575068] focus-within:border-[#b8796a]/80 focus-within:bg-[#575068]/60'
  }
}
