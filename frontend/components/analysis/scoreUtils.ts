export type ScoreTone = 'excellent' | 'strong' | 'fair' | 'weak' | 'poor'

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(Math.max(Math.round(score), 0), 100)
}

export function getScoreTone(score: number): ScoreTone {
  const s = clampScore(score)
  if (s >= 85) return 'excellent'
  if (s >= 70) return 'strong'
  if (s >= 50) return 'fair'
  if (s >= 30) return 'weak'
  return 'poor'
}

export function getScoreLabel(score: number): string {
  const tone = getScoreTone(score)
  switch (tone) {
    case 'excellent':
      return 'Excellent Match'
    case 'strong':
      return 'Strong Match'
    case 'fair':
      return 'Fair Match'
    case 'weak':
      return 'Weak Match'
    case 'poor':
      return 'Poor Match'
  }
}

export function getToneClasses(score: number): {
  text: string
  bg: string
  border: string
  stroke: string
} {
  const tone = getScoreTone(score)
  switch (tone) {
    case 'excellent':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        stroke: 'stroke-emerald-400',
      }
    case 'strong':
      return {
        text: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        stroke: 'stroke-sky-400',
      }
    case 'fair':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        stroke: 'stroke-amber-400',
      }
    case 'weak':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        stroke: 'stroke-rose-400',
      }
    case 'poor':
      return {
        text: 'text-rose-400/80',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        stroke: 'stroke-rose-500/70',
      }
  }
}
