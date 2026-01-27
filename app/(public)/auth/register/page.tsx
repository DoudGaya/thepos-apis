'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

/**
 * Phase 1: Quick Signup (Minimal Data)
 * Collect only email and phone, then send OTP
 */
function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    acceptTerms: false,
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const validateForm = () => {
    // Validate email
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Validate phone
    if (!formData.phone) {
      setError('Please enter a valid phone number')
      return false
    }

    // Validate terms acceptance
    if (!formData.acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy')
      return false
    }

    return true
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError('')
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Google signup error:', error)
      setError('Failed to sign up with Google.')
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Clean phone number (remove all non-digits)
      const cleanPhone = formData.phone.replace(/\D/g, '')

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          phone: cleanPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setSuccess('OTP sent successfully! Redirecting to verification...')

      // Redirect to OTP verification after 1 second
      setTimeout(() => {
        router.push(`/auth/verify-otp?phone=${encodeURIComponent(cleanPhone)}`)
      }, 1000)
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 pt-24">
      <div className="mx-auto w-full ">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Create an account</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Start trading in seconds. No password required.</p>
          </div>

          {/* Success Alert */}
          {success && (
            <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Success!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Registration Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Social Login */}
          <div className="grid gap-4 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign up with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or sign up with email</span>
            </div>
          </div>

          {/* Registration Form - Minimal Fields */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <PhoneInput
                  international
                  defaultCountry="NG"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-white transition-all [&>input]:w-full [&>input]:bg-transparent [&>input]:border-none [&>input]:focus:ring-0 [&>input]:p-3 [&>input]:pl-3 [&>.PhoneInputCountry]:pl-3 [&>.PhoneInputCountry]:pr-2"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter your phone number with country code</p>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="h-4 w-4 text-zinc-900 focus:ring-zinc-900 border-zinc-300 rounded mt-1"
              />
              <label htmlFor="acceptTerms" className="text-sm text-zinc-600 dark:text-zinc-400">
                I agree to the{' '}
                <Link href="/terms" className="font-medium text-zinc-900 dark:text-white hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium text-zinc-900 dark:text-white hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-5 py-3 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Continue'
                )}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-zinc-900 dark:text-white hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              We'll send you a 6-digit OTP to verify your phone number. No password needed yet!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
