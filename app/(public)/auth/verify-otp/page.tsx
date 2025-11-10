'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react'
import { Suspense } from 'react'

// Toast Component
function Toast({ type, message, onClose, autoClose = 4000 }: { type: 'success' | 'error' | 'info' | 'warning'; message: string; onClose: () => void; autoClose?: number }) {
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(onClose, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  const bgColorClass: Record<string, string> = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  }

  const textColorClass: Record<string, string> = {
    success: 'text-green-700',
    error: 'text-red-700',
    info: 'text-blue-700',
    warning: 'text-yellow-700',
  }

  const iconColorClass: Record<string, string> = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
  }

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border ${bgColorClass[type]} p-4 shadow-lg z-50`}>
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
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-900">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Phone Verified!</h2>
        <p className="text-gray-600">
          Your phone number has been verified. Redirecting to login...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    

      {/* Error Alert */}
      {errors.form && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerifyOTP} className="space-y-6 bg-black p-8 rounded-xl shadow-lg">
        {/* Info Alert */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Complete Registration</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Enter the 6-digit OTP sent to your phone. If you didn't receive it, you can request a new one below.
              </p>
            </div>
          </div>
        </div>

        {/* Phone Number Display */}
        <div className="bg-gray-950 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-white mr-2" />
            <span className="text-sm text-green-200">
              Verification code sent to: <strong>{phone || 'your phone'}</strong>
            </span>
          </div>
        </div>

        {/* OTP Input */}
        <div>
          <label htmlFor="otp" className="block text-sm font-medium text-gray-950">
            6-Digit Code
          </label>
          <div className="mt-1">
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              required
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(value)
              }}
              className={`block w-full px-4 py-2 border-2 bg-gray-950 rounded-lg text-center text-2xl font-bold letter-spacing-xl focus:ring-2  focus:border-transparent transition-all ${
                errors.otp ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="000000"
            />
          </div>
          {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp}</p>}
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-gradient-to-r bg-green-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>

        {/* Resend OTP Section */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-4">
            {resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Didn't receive the code?"}
          </p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={isResending || resendCountdown > 0}
            className="w-full py-2 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isResending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-600">
        <p>
          Need help?{' '}
          <a href="/auth/login" className="text-indigo-600 hover:underline">
            Try logging in
          </a>
        </p>
      </div>


    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <div className=" flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ThePOS
              </h1>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Verify Your Account
              </h2>
            </div>
            <div className="bg-black p-8 rounded-xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          </div>
        }>
          <VerifyOTPContent />
        </Suspense>
      </div>
    </div>
  )
}
