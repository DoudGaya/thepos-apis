'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react'

const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

type NavLink = {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Services', href: '/#services' },
  { label: 'How it works', href: '/#how' },
  { label: 'Trust', href: '/#trust' }
]

export function PublicNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  const applyTheme = useCallback((mode: Theme) => {
    if (typeof document === 'undefined') return

    document.body.classList.toggle('dark', mode === 'dark')
    document.documentElement.style.colorScheme = mode
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme: Theme = stored ?? (mediaQuery.matches ? 'dark' : 'light')

    setTheme(initialTheme)
    applyTheme(initialTheme)

    const handleChange = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (saved) return

      const next: Theme = event.matches ? 'dark' : 'light'
      setTheme(next)
      applyTheme(next)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [applyTheme])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }

    applyTheme(next)
  }

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white ring-1 ring-inset ring-green-500/70 transition-all duration-300 group-hover:shadow-sm group-hover:ring-green-400/80">
              <span className="text-sm font-semibold tracking-tight">V</span>
            </span>
            <span className="text-base font-semibold tracking-tight">VTU</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-slate-200" />
              ) : (
                <Sun className="h-4 w-4 text-slate-700" />
              )}
            </button>
              <Link
              href="/auth/login"
              className="hidden md:inline-flex items-center gap-2 rounded-md border bg-white px-3.5 py-2 text-sm font-medium text-black shadow-sm hover:bg-green-500 hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
            >
              Log In
              <ArrowRight className="h-4 w-4 opacity-90" />
            </Link>

            <Link
              href="/auth/register"
              className="hidden md:inline-flex items-center gap-2 rounded-md border border-green-600 bg-green-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
            >
              Get started
              <ArrowRight className="h-4 w-4 opacity-90" />
            </Link>

            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4">
            <nav className="mt-3 space-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:text-green-600 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/auth/register"
                onClick={closeMenu}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
              >
                Get started
                <ArrowRight className="h-4 w-4 opacity-90" />
              </Link>
              <Link
                href="/auth/login"
                onClick={closeMenu}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
