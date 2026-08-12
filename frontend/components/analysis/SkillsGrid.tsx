interface SkillsGridProps {
  matched: string[]
  partial: string[]
  missing: string[]
}

function SkillColumn({
  title,
  skills,
  empty,
  className,
}: {
  title: string
  skills: string[]
  empty: string
  className: string
}) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <span className="rounded-full bg-gray-950 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {skills.length}
        </span>
      </div>
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">{empty}</p>
      )}
    </section>
  )
}

export default function SkillsGrid({ matched, partial, missing }: SkillsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SkillColumn
        title="Matched"
        skills={matched}
        empty="No exact matches found."
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      />
      <SkillColumn
        title="Partial"
        skills={partial}
        empty="No partial matches found."
        className="border-amber-500/30 bg-amber-500/10 text-amber-200"
      />
      <SkillColumn
        title="Missing"
        skills={missing}
        empty="No missing skills detected."
        className="border-rose-500/30 bg-rose-500/10 text-rose-200"
      />
    </div>
  )
}
