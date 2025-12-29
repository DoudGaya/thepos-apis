'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Phone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'

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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Phone Verified!</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Your phone number has been verified. Redirecting...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Verify your phone</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          We sent a 6-digit code to <br />
          <span className="font-medium text-zinc-900 dark:text-white">{phone || 'your phone'}</span>
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
              <InputOTPSlot index={0} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
              <InputOTPSlot index={1} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
              <InputOTPSlot index={2} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
              <InputOTPSlot index={4} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
              <InputOTPSlot index={5} className="h-12 w-12 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        {errors.otp && <p className="text-sm text-red-600 dark:text-red-400 text-center -mt-4">{errors.otp}</p>}

        <div className="space-y-4">
          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-5 py-3 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Resend code in <span className="font-medium text-zinc-900 dark:text-white">{resendCountdown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
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

      <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <Link href="/auth/login" className="inline-flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to log in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}
