import { clampScore, getScoreLabel, getToneClasses } from './scoreUtils'

interface ScoreGaugeProps {
  score: number
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const safeScore = clampScore(score)
  const tone = getToneClasses(safeScore)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safeScore / 100)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid h-44 w-44 place-items-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            className="stroke-gray-900"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`${tone.stroke} transition-[stroke-dashoffset] duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black tracking-tight text-gray-50">{safeScore}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            score
          </span>
        </div>
      </div>
      <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
        {getScoreLabel(safeScore)}
      </span>
    </div>
  )
}
