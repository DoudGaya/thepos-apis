'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, GraduationCap, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EPIN_PROVIDERS = ['WAEC', 'NECO', 'NABTEB'] as const

// Sample e-pin prices (in production, fetch from API)
const EPIN_PRICES = {
  WAEC: 3500,
  NECO: 1000,
  NABTEB: 800,
}

const PROFIT_MARGIN = 100

export default function EpinsPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: 'WAEC' as keyof typeof EPIN_PRICES,
    quantity: 1,
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        const data = await res.json()
        if (data.success) {
          setWalletBalance(data.data.balance)
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      } finally {
        setLoadingBalance(false)
      }
    }
    fetchBalance()
  }, [])

  const perPinCost = EPIN_PRICES[formData.provider]
  const vendorCost = perPinCost * formData.quantity
  const sellingPrice = vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select an e-pin provider')
      setLoading(false)
      return
    }
    if (formData.quantity < 1) {
      setError('Minimum quantity is 1')
      setLoading(false)
      return
    }
    if (formData.quantity > 10) {
      setError('Maximum quantity is 10 per transaction')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/epins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: formData.provider,
          quantity: formData.quantity,
          vendorCost,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `E-Pin purchase successful! ${formData.quantity} ${formData.provider} pin(s) purchased. Reference: ${data.data.reference}. Check your email or transaction history for pin details.`
      )

      // Update balance
      setWalletBalance(prev => prev - sellingPrice)

      // Reset form
      setFormData({ provider: 'WAEC', quantity: 1 })

    } catch (err: any) {
      setError(err.message || 'Failed to purchase e-pins')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Buy Educational E-Pins</h1>
        <p className="text-muted-foreground">WAEC, NECO, NABTEB exam pins with instant delivery.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Exam Pins
              </CardTitle>
              <CardDescription>Select exam body and quantity.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Provider Selection */}
                <div className="space-y-3">
                  <Label>Select Exam Body</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {EPIN_PROVIDERS.map((provider) => (
                      <div
                        key={provider}
                        onClick={() => setFormData({ ...formData, provider })}
                        className={`
                          cursor-pointer rounded-md border-2 p-4 flex flex-col items-center justify-center gap-1 transition-all hover:bg-muted/50
                          ${formData.provider === provider ? 'border-primary bg-primary/5' : 'border-muted'}
                        `}
                      >
                        <span className="font-semibold text-sm">{provider}</span>
                        <span className="text-xs text-muted-foreground">₦{EPIN_PRICES[provider].toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Info Banner */}
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                  <GraduationCap className="text-blue-600 mt-0.5 h-5 w-5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">{formData.provider} E-Pin</p>
                    <p className="text-blue-700 mt-1">
                      Price: ₦{perPinCost.toLocaleString()} per pin + ₦{PROFIT_MARGIN} service charge
                    </p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-3">
                  <Label htmlFor="quantity">Quantity (1 - 10)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((qty) => (
                      <Button
                        key={qty}
                        type="button"
                        variant={formData.quantity === qty ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, quantity: qty })}
                        className="w-10 h-10 p-0"
                      >
                        {qty}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    id="quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={10}
                  />
                </div>

                {/* Pricing Breakdown */}
                {formData.quantity >= 1 && (
                  <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {formData.quantity} × ₦{perPinCost.toLocaleString()}:
                      </span>
                      <span className="font-medium">₦{vendorCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Charge:</span>
                      <span className="font-medium text-green-600">+ ₦{PROFIT_MARGIN}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2 border-border/50">
                      <span className="font-bold">Total Payment:</span>
                      <span className="font-bold text-lg">₦{sellingPrice.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 text-destructive border-destructive/20 border p-3 rounded-md flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 text-green-700 border-green-200 border p-3 rounded-md flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.quantity < 1}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Processing Purchase...
                    </>
                  ) : (
                    `Purchase ${formData.quantity} Pin${formData.quantity > 1 ? 's' : ''} - ₦${sellingPrice.toLocaleString()}`
                  )}
                </Button>

                {walletBalance < sellingPrice && (
                  <p className="text-destructive text-sm text-center">
                    Insufficient balance. Please fund your wallet first.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/70">Wallet Balance</CardDescription>
              <CardTitle className="text-3xl">
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  `₦${walletBalance.toLocaleString()}`
                )}
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Wallet className="h-4 w-4" />
                <span>Available for spend</span>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>1. Select exam body (WAEC, NECO, NABTEB).</p>
              <p>2. Choose quantity.</p>
              <p>3. Review pricing.</p>
              <p>4. Pins delivered instantly via email/SMS.</p>
            </CardContent>
            <div className="px-6 pb-6 pt-2 border-t text-xs text-muted-foreground">
              <p>WAEC: ₦{EPIN_PRICES.WAEC.toLocaleString()}</p>
              <p>NECO: ₦{EPIN_PRICES.NECO.toLocaleString()}</p>
              <p>NABTEB: ₦{EPIN_PRICES.NABTEB.toLocaleString()}</p>
              <p className="mt-1">Service charge: ₦{PROFIT_MARGIN} per txn</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
