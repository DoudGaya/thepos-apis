'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react'
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

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ form: data.error || 'Failed to set password' })
        setToast({
          type: 'error',
          message: data.error || 'Failed to set password',
        })
        setIsLoading(false)
        return
      }

      setToast({
        type: 'success',
        message: 'Password set successfully! Redirecting to PIN setup...',
      })

      // Redirect to PIN setup after a short delay
      setTimeout(() => {
        router.push(`/auth/set-pin?userId=${userId}`)
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

      {/* Password Setup Form */}
      <form onSubmit={handleSetPassword} className="space-y-6 bg-black p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Create Your Password</h2>
          <p className="text-gray-400 mt-2">Set a strong password to secure your account</p>
        </div>

      

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`w-full px-4 py-3 border-2 bg-gray-950 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-transparent transition-all ${
                errors.password ? 'border-red-300' : 'border-gray-600/70'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={`w-full px-4 py-3 border-2 bg-gray-950 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-transparent transition-all ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-600/70'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
        >
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {isLoading ? 'Setting Password...' : 'Continue'}
        </button>
      </form>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-600">
        <p>Next step: Set your 4-digit transaction PIN</p>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="">
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
          
            <SetPasswordContent />
          </div>
        </Suspense>
      </div>
    </div>
  )
}
