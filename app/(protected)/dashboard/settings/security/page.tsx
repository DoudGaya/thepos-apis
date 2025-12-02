'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export default function SecuritySettingsPage() {
  const { data: session } = useSession()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)
  const [checkingPin, setCheckingPin] = useState(true)

  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const res = await fetch('/api/auth/check-pin', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setHasPinSet(data.data.hasPinSet)
        }
      } catch (err) {
        console.error('Failed to check PIN status:', err)
      } finally {
        setCheckingPin(false)
      }
    }
    checkPinStatus()
  }, [])

  const validatePin = (pinValue: string): string | null => {
    if (!pinValue) {
      return 'PIN is required'
    }
    if (!/^\d{4}$/.test(pinValue)) {
      return 'PIN must be exactly 4 digits'
    }
    if (/^(\d)\1{3}$/.test(pinValue)) {
      return 'PIN cannot be all the same digit'
    }
    // Check for consecutive sequences
    for (let i = 0; i < 3; i++) {
      const digit = parseInt(pinValue[i])
      if (digit + 1 === parseInt(pinValue[i + 1])) {
        let count = 1
        for (let j = i + 1; j < 4; j++) {
          if (parseInt(pinValue[j - 1]) + 1 === parseInt(pinValue[j])) {
            count++
          }
        }
        if (count >= 3) return 'PIN cannot contain consecutive numbers'
      }
    }
    return null
  }

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const pinError = validatePin(pin)
    if (pinError) {
      setError(pinError)
      return
    }

    if (!confirmPin) {
      setError('Please confirm your PIN')
      return
    }

    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: session?.user?.id, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to set PIN')
      }

      setSuccess('PIN set successfully! You can now purchase data bundles.')
      setPin('')
      setConfirmPin('')
      setHasPinSet(true)
    } catch (err: any) {
      console.error('PIN setup error:', err)
      setError(err.message || 'Failed to set PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingPin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-900 mb-4" />
          <p className="text-gray-600">Loading security settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ArrowLeft size={20} />
            Back to Profile
          </Link>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-100 p-4 rounded-full">
                <Lock className="h-8 w-8 text-gray-900" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">Transaction PIN</h1>
            <p className="text-gray-600 text-center mt-2">
              {hasPinSet ? 'Update your 4-digit PIN' : 'Create a 4-digit PIN to secure your transactions'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">PIN Requirements:</p>
              <ul className="space-y-1 text-xs">
                <li>✓ Exactly 4 digits (0-9)</li>
                <li>✓ Cannot be all the same digit (e.g., 0000)</li>
                <li>✓ Cannot contain consecutive numbers (e.g., 0123)</li>
                <li>✓ Keep it secure and don't share with anyone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle2 className="text-green-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* PIN Form */}
        <form onSubmit={handleSetPin} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* PIN Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Enter Your PIN
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={setPin}
                containerClassName="gap-2"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={1} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={2} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={3} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Confirm PIN Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Confirm PIN
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={confirmPin}
                onChange={setConfirmPin}
                containerClassName="gap-2"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={1} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={2} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                  <InputOTPSlot index={3} className="w-14 h-14 text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 transition-all" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Setting PIN...
              </>
            ) : (
              <>
                <Lock size={20} />
                {hasPinSet ? 'Update PIN' : 'Create PIN'}
              </>
            )}
          </button>

          {hasPinSet && (
            <p className="text-xs text-center text-gray-500">
              Your PIN is securely encrypted and stored. Only you can use it to authorize transactions.
            </p>
          )}
        </form>

        {/* PIN Status */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">PIN Status:</span>
            <span className={`ml-2 ${hasPinSet ? 'text-green-600 font-semibold' : 'text-yellow-600'}`}>
              {hasPinSet ? '✓ PIN is set' : '⚠ PIN not set'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
