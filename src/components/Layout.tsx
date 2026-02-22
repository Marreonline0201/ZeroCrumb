import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/upload', label: 'Upload' },
  { to: '/profile', label: 'Profile' },
  { to: '/about', label: 'About Us' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo - Left side */}
          <Link to="/" className="flex items-center gap-2 ml-2">
            <img
              src="/ZeroCrumbWhite.png"
              alt="ZeroCrumb"
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation buttons - Center - Hidden on small screens */}
          <div className="flex items-center gap-2 max-[450px]:hidden">
            <Link
              to="/"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4V3" />
                </svg>
              </div>
              <span className="text-xs text-blue-400 font-medium">Home</span>
            </Link>

            <Link
              to="/history"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-zinc-400 font-medium">History</span>
            </Link>

            <Link
              to="/upload"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center mb-1">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-emerald-400 font-medium">Upload</span>
            </Link>

            <Link
              to="/profile"
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600/30 flex items-center justify-center overflow-hidden mb-1">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-400 font-bold text-xs">
                    {user?.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400 font-medium">Profile</span>
            </Link>
          </div>

          {/* Burger menu - Right side */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 rounded-lg hover:bg-zinc-800 touch-manipulation mr-2"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <nav className={`fixed z-40 bg-zinc-900 shadow-xl transform transition-all duration-300 ease-out ${
        menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        // Mobile: expand from top (full width)
        'top-[57px] left-0 right-0 h-auto border-b border-zinc-800'
      } ${
        // Desktop: slide from right (right side only)
        'md:top-[57px] md:left-auto md:right-0 md:h-[calc(100vh-57px)] md:w-64 md:border-l md:border-r-0'
      } ${
        menuOpen
          ? 'translate-y-0 md:translate-x-0'
          : '-translate-y-full md:translate-x-full'
      }`}>
        <div className="px-4 py-6 flex flex-col gap-1 max-h-[60vh] overflow-y-auto md:max-h-none md:py-8">
          {navLinks.map(({ to, label }) => {
            // On large screens, skip items that are shown in the top nav
            const isLargeScreen = window.innerWidth >= 450
            const hideInMenu = isLargeScreen && (to === '/' || to === '/history' || to === '/upload' || to === '/profile')
            if (hideInMenu) return null

            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors touch-manipulation ${
                  location.pathname === to
                    ? 'bg-emerald-600/30 text-emerald-400'
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {user && (
            <button
              type="button"
              onClick={() => {
                signOut()
                setMenuOpen(false)
              }}
              className="px-4 py-3 rounded-lg font-medium text-left text-red-400 hover:bg-zinc-800 transition-colors touch-manipulation"
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 py-4 px-4 z-10">
        <div className="max-w-md mx-auto text-center">
          <p className="text-zinc-500 text-sm mb-1">
            © {new Date().getFullYear()} breadsticks. All rights reserved.
          </p>
          <p className="text-zinc-600 text-xs flex items-center justify-center gap-1">
            Made with <span className="text-red-500">❤️</span> using React
          </p>
        </div>
      </footer>
    </div>
  )
}
