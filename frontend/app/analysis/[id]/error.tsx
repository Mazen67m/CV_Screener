'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white md:p-8">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-gray-500">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
