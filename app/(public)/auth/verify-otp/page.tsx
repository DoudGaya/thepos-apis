'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Phone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'

// Toast Component
function Toast({ type, message, onClose, autoClose = 4000 }: { type: 'success' | 'error' | 'info' | 'warning'; message: string; onClose: () => void; autoClose?: number }) {
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(onClose, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  const bgColorClass: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  }

  const textColorClass: Record<string, string> = {
    success: 'text-emerald-800 dark:text-emerald-300',
    error: 'text-red-800 dark:text-red-300',
    info: 'text-blue-800 dark:text-blue-300',
    warning: 'text-yellow-800 dark:text-yellow-300',
  }

  const iconColorClass: Record<string, string> = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
  }

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border ${bgColorClass[type]} p-4 shadow-lg z-50 animate-in slide-in-from-top-2`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${iconColorClass[type]} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm ${textColorClass[type]} flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`${textColorClass[type]} hover:opacity-70 transition-opacity`}
          aria-label="Close"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Countdown timer
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    // Get phone from URL or storage
    const phoneParam = searchParams.get('phone')
    if (phoneParam) {
      setPhone(phoneParam)
    } else {
      const storedPhone = localStorage.getItem('verifyPhone')
      if (storedPhone) {
        setPhone(storedPhone)
      }
    }
  }, [searchParams])

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCountdown])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!otp) {
      newErrors.otp = 'OTP is required'
    } else if (!/^\d{6}$/.test(otp)) {
      newErrors.otp = 'OTP must be exactly 6 digits'
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          code: otp,
          type: 'REGISTER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ otp: data.error || 'OTP verification failed' })
        setToast({
          type: 'error',
          message: data.error || 'Invalid or expired OTP',
        })
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setToast({
        type: 'success',
        message: 'Phone verified successfully!',
      })

      // Store user data for next steps
      const nextStep = data.nextStep || 'SET_PASSWORD'
      localStorage.setItem('userId', data.user?.id || '')
      localStorage.setItem('userEmail', data.user?.email || '')
      localStorage.removeItem('verifyPhone')

      // Redirect based on what's needed next
      setTimeout(() => {
        if (nextStep === 'SET_PASSWORD' || data.requiresPasswordSetup) {
          // User needs to set password
          router.push(`/auth/set-password?userId=${data.user?.id}`)
        } else if (nextStep === 'SET_PIN' || data.requiresPinSetup) {
          // User has password, needs to set PIN
          router.push(`/auth/set-pin?userId=${data.user?.id}`)
        } else {
          // All set, go to dashboard
          router.push('/dashboard')
        }
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setErrors({ form: errorMessage })
      setToast({
        type: 'error',
        message: errorMessage,
      })
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!phone) {
      setErrors({ phone: 'Phone number is required' })
      return
    }

    setIsResending(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          type: 'REGISTER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ form: data.error || 'Failed to resend OTP' })
        setToast({
          type: 'error',
          message: data.error || 'Failed to resend OTP',
        })
        setIsResending(false)
        return
      }

      setOtp('') // Clear previous OTP
      setResendCountdown(60) // 60 second cooldown
      setToast({
        type: 'success',
        message: 'OTP sent successfully!',
      })
      setIsResending(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend OTP'
      setErrors({ form: errorMessage })
      setToast({
        type: 'error',
        message: errorMessage,
      })
      setIsResending(false)
    }
  }

  if (success) {
    return (
      <div className="antialiased duration-300 flex items-center justify-center py-12">
        <main className="mx-auto max-w-md w-full px-4 sm:px-6">
          <div className="border-y-2 border-gray-800 p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Phone Verified!</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Your phone number has been verified. Redirecting...
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="antialiased duration-300 flex items-center justify-center py-12">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <main className="mx-auto max-w-md w-full px-4 sm:px-6">
        <div className="border-y-2 border-gray-800 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verify your phone</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              We sent a 6-digit code to <br/>
              <span className="font-medium text-slate-900 dark:text-white">{phone || 'your phone'}</span>
            </p>
          </div>

          {/* Error Alert */}
          {errors.form && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Verification Failed</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errors.form}</p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleVerifyOTP} className="space-y-8">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                  <InputOTPSlot index={1} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                  <InputOTPSlot index={2} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                  <InputOTPSlot index={4} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                  <InputOTPSlot index={5} className="h-12 w-12 border-slate-200 dark:border-slate-700" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {errors.otp && <p className="text-sm text-red-600 dark:text-red-400 text-center -mt-4">{errors.otp}</p>}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 text-white font-medium shadow-lg hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className="text-center">
                {resendCountdown > 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Resend code in <span className="font-medium text-slate-900 dark:text-white">{resendCountdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResending}
                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-50"
                  >
                    {isResending ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Didn't receive the code? Resend"
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link href="/auth/login" className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}
