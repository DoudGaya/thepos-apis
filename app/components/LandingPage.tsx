'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CreditCard,
  Home,
  Lock,
  Moon,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Wifi
} from 'lucide-react'

const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

const services = [
  {
    id: 'data',
    title: 'Data bundles',
    description: 'Competitive wholesale rates with instant delivery and clear receipts.',
    icon: Wifi
  },
  {
    id: 'airtime',
    title: 'Airtime top-ups',
    description: 'Fund any line nationwide, fast. Automated retries to guarantee success.',
    icon: Smartphone
  },
  {
    id: 'utility',
    title: 'Utility bills',
    description: 'Electricity, TV, and internet—one flow, transparent status at every step.',
    icon: Home
  }
]

const howItWorks = [
  {
    step: '1',
    title: 'Create your account',
    description: 'Verify your phone and set a secure PIN. No long forms.'
  },
  {
    step: '2',
    title: 'Fund your wallet',
    description: 'Transfer or card—instant settlement with zero hidden fees.'
  },
  {
    step: '3',
    title: 'Top up and track',
    description: 'Buy data, airtime, or pay bills. Real-time status and receipts.'
  }
]

const trustStats = [
  { label: 'successful top-ups', value: '50k+' },
  { label: 'median delivery time', value: '2s' },
  { label: 'platform uptime', value: '99.99%' }
]

const partnerInitials = ['AL', 'MX', 'KB', 'NT']

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>('light')

  const applyTheme = useCallback((mode: Theme) => {
    if (typeof document === 'undefined') return

    document.body.classList.toggle('dark', mode === 'dark')
    document.documentElement.style.colorScheme = mode
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme: Theme = stored ?? (mql.matches ? 'dark' : 'light')

    setTheme(initialTheme)
    applyTheme(initialTheme)

    const handleChange = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (saved) return
      const nextTheme: Theme = event.matches ? 'dark' : 'light'
      setTheme(nextTheme)
      applyTheme(nextTheme)
    }

    mql.addEventListener('change', handleChange)

    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [applyTheme])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
    applyTheme(nextTheme)
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen antialiased bg-white text-slate-900 selection:bg-green-200/60 selection:text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8">
            <div className="h-48 sm:h-56 lg:h-64 rounded-xl mt-6 bg-gradient-to-br from-green-600/10 via-transparent to-transparent dark:from-green-500/15 dark:via-transparent" />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-semibold">
                Instant VTU for data, airtime, and bills.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Top up in seconds at reseller rates. Reliable margins, bank-grade security, and a dashboard that gets out of your way.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-green-600 bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
                >
                  Start top-up
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
                >
                  See how it works
                  <ArrowUpRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </Link>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                  99.99% uptime
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Lock className="h-4 w-4 text-green-600" />
                  Bank-grade security
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm backdrop-blur p-5 sm:p-6 lg:p-7 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-green-600 text-white ring-1 ring-inset ring-green-500/70">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium">Quick top-up</p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Live preview</span>
                </div>

                <form className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-slate-600 dark:text-slate-300">Service</span>
                      <div className="mt-1 relative">
                        <select className="h-10 w-full appearance-none rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-3 pr-9 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                          <option>Data bundle</option>
                          <option>Airtime top-up</option>
                          <option>Utility bill</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-600 dark:text-slate-300">Phone / Account</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g., 0803 123 4567"
                        className="mt-1 h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-slate-600 dark:text-slate-300">Plan / Amount</span>
                      <div className="mt-1 relative">
                        <select className="h-10 w-full appearance-none rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-3 pr-9 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                          <option>Data • 1.5GB</option>
                          <option>Data • 3.5GB</option>
                          <option>Data • 10GB</option>
                          <option>Airtime • ₦500</option>
                          <option>Airtime • ₦1,000</option>
                          <option>Bill • ₦2,000</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-600 dark:text-slate-300">Network / Provider</span>
                      <div className="mt-1 relative">
                        <select className="h-10 w-full appearance-none rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-3 pr-9 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                          <option>MTN</option>
                          <option>Airtel</option>
                          <option>Glo</option>
                          <option>9mobile</option>
                          <option>Utility</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-green-600 bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
                  >
                    Pay and deliver
                    <Sparkles className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CreditCard className="h-4 w-4 text-green-600 dark:text-green-500" />
                      Secured checkout
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">No hidden fees</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-12 sm:py-14 lg:py-16 border-t border-slate-200/70 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-5 lg:gap-6">
            {services.map(({ id, title, description, icon: Icon }) => (
              <div
                key={id}
                className="group h-full rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-green-600/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-500/20 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-12 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl tracking-tight font-semibold">Three steps. That’s it.</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Designed to get you from intent to delivery in seconds.</p>
          </div>

          <div className="grid lg:grid-cols-3 items-stretch gap-6">
            {howItWorks.map(({ step, title, description }) => (
              <div
                key={step}
                className="relative h-full rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md bg-green-600 text-white ring-1 ring-inset ring-green-500/70 flex items-center justify-center">
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 hidden lg:flex items-center justify-between px-1">
            <span className="h-px w-1/3 bg-slate-200 dark:bg-slate-800" />
            <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="h-px w-1/3 bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section id="trust" className="py-12 sm:py-14 lg:py-16 border-t border-slate-200/70 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl sm:text-2xl tracking-tight font-semibold">Trusted where speed and reliability matter.</h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {trustStats.map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4"
                  >
                    <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{label}</div>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                    PCI-aware processing
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">256-bit TLS & encrypted vault</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                {partnerInitials.map((initial) => (
                  <div
                    key={initial}
                    className="flex items-center justify-center h-14 rounded-md border border-slate-200/70 dark:border-slate-800"
                  >
                    <span className="text-base font-semibold tracking-tight text-slate-700 dark:text-slate-200">{initial}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Lock className="h-4 w-4 text-green-600" />
                Bank-grade encryption. Real-time fraud checks.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-green-600 to-green-700 dark:from-green-600 dark:to-green-700">
            <div className="absolute inset-0 opacity-20 mix-blend-overlay">
              <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(600px 200px at 20% -10%, rgba(255,255,255,0.5) 0%, transparent 60%), radial-gradient(600px 200px at 80% 110%, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
            </div>

            <div className="relative px-6 sm:px-10 lg:px-12 py-10 sm:py-12 lg:py-14">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl tracking-tight font-semibold text-white">Ready to grow your VTU business?</h3>
                  <p className="mt-2 text-sm text-green-100">Create an account and start topping up in under 60 seconds.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-green-700/60 transition-all"
                  >
                    Create account
                    <Plus className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 rounded-md border border-white bg-white px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-green-700/60 transition-all"
                  >
                    Sign in
                    <ArrowRight className="h-4 w-4 text-green-700" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Protected by advanced risk checks
            </div>
            <div className="inline-flex items-center gap-4">
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Terms
              </Link>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Privacy
              </Link>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>© {currentYear} VTU</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  )
}
