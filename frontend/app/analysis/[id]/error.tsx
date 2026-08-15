'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-[#0d2f3e] p-6 text-[#f5ede9] md:p-8">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <h1 className="text-2xl font-bold font-display">Something went wrong</h1>
        <p className="text-sm text-[#a09098]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#b8796a] hover:bg-[#d9998a] px-5 py-3 text-sm font-semibold text-[#f5ede9] transition shadow-md shadow-[#b8796a]/25"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
