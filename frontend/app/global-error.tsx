'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d2f3e',
          color: '#f5ede9',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              opacity: 0.7,
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#b8796a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
