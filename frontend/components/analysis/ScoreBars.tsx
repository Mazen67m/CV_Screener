interface ScoreBarsProps {
  textSimilarity: number
  skillsScore: number
  experienceScore: number
}

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value * 100), 0), 100)
}

export default function ScoreBars({
  textSimilarity,
  skillsScore,
  experienceScore,
}: ScoreBarsProps) {
  const rows = [
    { label: 'Text Match', weight: '50%', value: toPercent(textSimilarity), fill: 'bg-sky-400' },
    { label: 'Skills', weight: '35%', value: toPercent(skillsScore), fill: 'bg-violet-400' },
    { label: 'Experience', weight: '15%', value: toPercent(experienceScore), fill: 'bg-emerald-400' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-gray-300">
              {row.label} <span className="text-gray-600">· {row.weight}</span>
            </span>
            <span className="font-semibold text-gray-100">{row.value}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-900">
            <div
              className={`h-full rounded-full ${row.fill} transition-transform duration-700 ease-out origin-left`}
              style={{ transform: `scaleX(${row.value / 100})` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
