export function LoadingAnimation() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-zinc-950 p-6">
      {/* Logo */}
      <img src="/ZeroCrumbWhite.png" alt="ZeroCrumb" className="h-12 w-auto opacity-80" />

      {/* Animated elements */}
      <div className="flex items-center gap-2">
        {/* Bouncing dots */}
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Spinning loader */}
        <div className="ml-4">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>

      {/* Loading text with fade effect */}
      <div className="text-center">
        <p className="text-zinc-400 text-sm animate-pulse">Preparing your sustainable journey...</p>
        <p className="text-zinc-500 text-xs mt-1 opacity-70">Loading ZeroCrumb</p>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: '0ms', animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '3s' }}></div>
      </div>
    </div>
  )
}