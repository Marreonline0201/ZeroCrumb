import { useEffect } from 'react'

interface MeltingAnimationProps {
  onComplete: () => void
}

export function MeltingAnimation({ onComplete }: MeltingAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden animate-in fade-in">
      {/* Melting particles - using fixed positions */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400 rounded-full opacity-100 animate-melt-particle"
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 100}%`,
              animationDelay: `${(i * 100) % 1000}ms`,
            }}
          />
        ))}
      </div>

      {/* Main content melting effect */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center animate-melt-content">
          <h1 className="text-4xl font-bold text-zinc-100 mb-4">
            ZeroCrumb
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
            Your personal companion for sustainable eating and health...
          </p>
        </div>

        {/* Melting wave effect */}
        <div className="absolute inset-0 pointer-events-none animate-melt-wave" />
      </div>
    </div>
  )
}