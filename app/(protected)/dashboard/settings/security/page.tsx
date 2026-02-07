'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Lock, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
    if (!pinValue) return 'PIN is required'
    if (!/^\d{4}$/.test(pinValue)) return 'PIN must be exactly 4 digits'
    if (/^(\d)\1{3}$/.test(pinValue)) return 'PIN cannot be all the same digit'

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </Button>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Transaction PIN</CardTitle>
          <CardDescription>
            {hasPinSet ? 'Update your 4-digit PIN' : 'Create a 4-digit PIN to secure your transactions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Info Box */}
          <div className="bg-blue-50/50 text-blue-900 text-sm p-4 rounded-lg border border-blue-100 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="font-semibold">PIN Requirements:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
                <li>Exactly 4 digits (0-9)</li>
                <li>Cannot be all same digit (e.g. 0000)</li>
                <li>No simple sequences (e.g. 1234)</li>
                <li>Keep it secret!</li>
              </ul>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2 border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}

          <form onSubmit={handleSetPin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Enter PIN
                </label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={pin}
                    onChange={setPin}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Confirm PIN
                </label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={confirmPin}
                    onChange={setConfirmPin}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {hasPinSet ? 'Update PIN' : 'Set PIN'}
                </>
              )}
            </Button>
          </form>

        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t pt-6 bg-muted/20">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${hasPinSet ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>Status: {hasPinSet ? 'PIN is set' : 'PIN not set'}</span>
          </div>
          <p className="text-xs text-center text-muted-foreground px-4">
            Your PIN is securely encrypted. Only you can use it to authorize transactions.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
