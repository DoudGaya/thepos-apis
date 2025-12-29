'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { Suspense } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

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
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border p-4 shadow-lg z-50 ${colors[type]}`}>
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

function SetPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    // Get userId from URL or localStorage
    const userIdParam = searchParams.get('userId')
    if (userIdParam) {
      setUserId(userIdParam)
    } else {
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        setUserId(storedUserId)
      }
    }
  }, [searchParams])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!pin) {
      newErrors.pin = 'PIN is required'
    } else if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = 'PIN must be exactly 4 digits'
    }

    if (!confirmPin) {
      newErrors.confirmPin = 'Please confirm your PIN'
    } else if (pin !== confirmPin) {
      newErrors.confirmPin = 'PINs do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ form: data.error || 'Failed to set PIN' })
        setToast({
          type: 'error',
          message: data.error || 'Failed to set PIN',
        })
        setIsLoading(false)
        return
      }

      setToast({
        type: 'success',
        message: 'PIN set successfully! Redirecting to dashboard...',
      })

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        localStorage.removeItem('userId')
        router.push('/dashboard')
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

      {/* Error Alert */}
      {errors.form && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errors.form}</p>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup Form */}
      <form onSubmit={handleSetPin} className="space-y-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full">
              <Lock className="h-8 w-8 text-zinc-900 dark:text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Set Your Transaction PIN</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Create a 4-digit PIN for transaction confirmations</p>
        </div>

        {/* PIN Input - 4 Digit Boxes */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4 text-center">
            Enter Your 4-Digit PIN
          </label>
          <div className="flex justify-center mb-2">
            <InputOTP maxLength={4} value={pin} onChange={setPin}>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.pin && <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{errors.pin}</p>}
        </div>

        {/* Confirm PIN Input - 4 Digit Boxes */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4 text-center">
            Confirm Your PIN
          </label>
          <div className="flex justify-center mb-2">
            <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-md" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.confirmPin && <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{errors.confirmPin}</p>}
        </div>

        {/* PIN Match Indicator */}
        {pin && confirmPin && (
          pin === confirmPin ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">✓ PINs match</p>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">✗ PINs don't match</p>
            </div>
          )
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || pin.length !== 4 || confirmPin.length !== 4 || pin !== confirmPin}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-5 py-3 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Setting PIN...
            </>
          ) : (
            'Complete Setup'
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">After this, you'll be ready to use NillarPay</p>
      </div>
    </div>
  )
}

export default function SetPinPage() {
  return (
    <Suspense fallback={
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    }>
      <SetPinContent />
    </Suspense>
  )
}
