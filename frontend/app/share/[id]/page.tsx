interface SharePageProps {
  params: Promise<{ id: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-gray-500 mb-2">Shared Analysis</p>
        <h1 className="text-3xl font-bold mb-6">CV Match Result</h1>

        {/* Placeholder — will be built in F-14 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">
            Analysis ID: <span className="text-gray-300 font-mono">{id}</span>
          </p>
          <p className="text-gray-600 mt-2 text-sm">
            Full result view will be implemented in Phase 2.
          </p>
        </div>
      </div>
    </main>
  )
}
