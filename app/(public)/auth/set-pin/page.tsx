'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { Suspense } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

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

      {/* PIN Setup Form */}
      <form onSubmit={handleSetPin} className="space-y-6 bg-black p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-100 dark:bg-emerald-900 p-4 rounded-full">
              <Lock className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Set Your Transaction PIN</h2>
          <p className="text-gray-400 mt-2">Create a 4-digit PIN for transaction confirmations</p>
        </div>

       

        {/* PIN Input - 4 Digit Boxes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
            Enter Your 4-Digit PIN
          </label>
          <div className="flex justify-center mb-2">
            <InputOTP maxLength={4} value={pin} onChange={setPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.pin && <p className="mt-2 text-sm text-red-600 text-center">{errors.pin}</p>}
        </div>

        {/* Confirm PIN Input - 4 Digit Boxes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
            Confirm Your PIN
          </label>
          <div className="flex justify-center mb-2">
            <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.confirmPin && <p className="mt-2 text-sm text-red-600 text-center">{errors.confirmPin}</p>}
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
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {isLoading ? 'Setting PIN...' : 'Complete Setup'}
        </button>
      </form>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>After this, you'll be ready to use ThePOS</p>
      </div>
    </div>
  )
}

export default function SetPinPage() {
  return (
    <div className=" ">
      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="space-y-8">
           
            <div className="bg-black p-8 rounded-xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </div>
          </div>
        }>
          <div className="space-y-8">
         
            <SetPinContent />
          </div>
        </Suspense>
      </div>
    </div>
  )
}
