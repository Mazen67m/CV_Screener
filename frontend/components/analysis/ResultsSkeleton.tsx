export default function ResultsSkeleton() {
  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-900" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <div className="flex justify-center rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div className="h-44 w-44 animate-pulse rounded-full bg-gray-900" />
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div className="mb-8 h-8 w-2/3 animate-pulse rounded bg-gray-900" />
            <div className="space-y-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-900" />
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-900" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
