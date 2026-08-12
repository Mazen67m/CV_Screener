export type ScoreTone = 'strong' | 'moderate' | 'low'

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(Math.max(Math.round(score), 0), 100)
}

export function getScoreTone(score: number): ScoreTone {
  if (score >= 70) return 'strong'
  if (score >= 40) return 'moderate'
  return 'low'
}

export function getScoreLabel(score: number): string {
  const tone = getScoreTone(score)
  if (tone === 'strong') return 'Strong Match'
  if (tone === 'moderate') return 'Moderate Match'
  return 'Low Match'
}

export function getToneClasses(score: number): {
  text: string
  bg: string
  border: string
  stroke: string
} {
  const tone = getScoreTone(score)
  if (tone === 'strong') {
    return {
      text: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      stroke: 'stroke-emerald-400',
    }
  }
  if (tone === 'moderate') {
    return {
      text: 'text-amber-300',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      stroke: 'stroke-amber-400',
    }
  }
  return {
    text: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    stroke: 'stroke-rose-400',
  }
}
