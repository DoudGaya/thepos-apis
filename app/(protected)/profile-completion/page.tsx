'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, User, Loader2 } from 'lucide-react'

// Toast Component (Vercel Style)
function Toast({ type, message, onClose, autoClose = 4000 }: { type: 'success' | 'error' | 'info' | 'warning'; message: string; onClose: () => void; autoClose?: number }) {
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(onClose, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  }

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border p-4 shadow-lg z-50 animate-in slide-in-from-top-2 ${colors[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ProfileCompletionPage() {
  const { data: session, update: updateSession, status } = useSession()
  const router = useRouter()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Check if user has already completed their profile
  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session?.user) {
      router.push('/auth/login')
      return
    }

    // If user already has firstName, lastName and phone, redirect to dashboard
    const userWithData = session.user as any
    if (userWithData.firstName && userWithData.lastName && userWithData.phone) {
      router.push('/dashboard')
      return
    }
    
    // Pre-fill existing data
    if (userWithData.firstName) setFirstName(userWithData.firstName)
    if (userWithData.lastName) setLastName(userWithData.lastName)
    if (userWithData.phone) setPhone(userWithData.phone)

    setIsCheckingProfile(false)
  }, [session, status, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ form: data.error || 'Failed to update profile' })
        setToast({
          type: 'error',
          message: data.error || 'Failed to update profile',
        })
        setLoading(false)
        return
      }

      // Update the session with new profile data
      setSuccess(true)
      setToast({
        type: 'success',
        message: 'Profile completed successfully!',
      })
      
      // Update client session with new profile information
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        },
      })

      // Brief delay, then redirect to dashboard
      // The JWT callback will refresh firstName/lastName from DB automatically
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push('/dashboard')
    } catch (err) {
      console.error('Profile completion error:', err)
      const message = 'An unexpected error occurred. Please try again.'
      setErrors({ form: message })
      setToast({
        type: 'error',
        message: message,
      })
      setLoading(false)
    }
  }

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white mx-auto" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mb-6">
          <User className="h-8 w-8 text-zinc-900 dark:text-white" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          We need a few more details to get you entirely set up.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:px-10">
          {success ? (
            <div className="text-center space-y-4 py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">All Set!</h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Your profile has been completed. Redirecting you to the dashboard...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error Alert */}
              {errors.form && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">Update Failed</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errors.form}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all ${
                      errors.firstName ? 'border-red-300 dark:border-red-700' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                    disabled={loading}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all ${
                      errors.lastName ? 'border-red-300 dark:border-red-700' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                    disabled={loading}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-zinc-500 dark:text-zinc-400">🇳🇬</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="080 1234 5678"
                    className={`w-full pl-12 pr-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all ${
                      errors.phone ? 'border-red-300 dark:border-red-700' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Saving Profile...
                    </>
                  ) : (
                    'Continue to Dashboard'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500 dark:text-zinc-400">
                  Having trouble?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/help"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
