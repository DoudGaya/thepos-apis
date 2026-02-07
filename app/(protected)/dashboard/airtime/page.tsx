'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Smartphone, Wallet } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { TransactionPinModal } from '@/components/transaction-pin-modal'
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
import { Separator } from '@/components/ui/separator'

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

export default function AirtimePurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    network: 'MTN',
    phone: '',
    amount: 0,
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

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

  const handleQuickAmount = (amount: number) => {
    setFormData({ ...formData, amount })
  }

  const handleInitiatePurchase = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.network) {
      setError('Please select a network')
      return
    }
    if (!formData.phone || formData.phone.length < 11) {
      setError('Please enter a valid phone number (11 digits)')
      return
    }
    if (formData.amount < 50) {
      setError('Minimum airtime amount is ₦50')
      return
    }
    if (formData.amount > 50000) {
      setError('Maximum airtime amount is ₦50,000')
      return
    }

    if (walletBalance < formData.amount) {
      setError('Insufficient wallet balance')
      return
    }

    setIsPinModalOpen(true)
  }

  const handleConfirmPurchase = async (pin: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/airtime/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          pin
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `Airtime purchase successful! ${formData.network} ₦${formData.amount.toLocaleString()} sent to ${formData.phone}. Reference: ${data.data.transaction?.reference || 'N/A'}`
      )

      // Update balance
      setWalletBalance(data.data.balance || (walletBalance - formData.amount))

      // Reset form and close modal
      setFormData({ network: 'MTN', phone: '', amount: 0 })
      setIsPinModalOpen(false)

    } catch (err: any) {
      setError(err.message || 'Failed to purchase airtime')
      setIsPinModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <TransactionPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        amount={formData.amount}
        recipient={formData.phone}
        network={formData.network}
        isLoading={loading}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Buy Airtime</h1>
        <p className="text-muted-foreground">Top up airtime for any network instantly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Purchase Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Airtime Topup
              </CardTitle>
              <CardDescription>
                Select network and enter details to proceed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInitiatePurchase} className="space-y-6">

                {/* Network Selection */}
                <div className="space-y-3">
                  <Label>Select Network</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {NETWORKS.map((network) => (
                      <div
                        key={network}
                        onClick={() => setFormData({ ...formData, network })}
                        className={`
                          cursor-pointer rounded-md border-2 p-4 flex items-center justify-center font-semibold transition-all hover:bg-muted/50
                          ${formData.network === network ? 'border-primary bg-primary/5' : 'border-muted'}
                        `}
                      >
                        {network}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                    placeholder="Enter phone number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>input]:outline-none [&>input]:bg-transparent [&>input]:w-full"
                  />
                </div>

                {/* Amount Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label>Amount (₦)</Label>
                    <span className="text-xs text-muted-foreground">Min: ₦50 - Max: ₦50,000</span>
                  </div>

                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                    min={50}
                    max={50000}
                    className="text-lg font-semibold"
                  />

                  {/* Quick Amounts */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(amount)}
                        className={formData.amount === amount ? 'border-primary bg-primary/5 text-primary' : ''}
                      >
                        ₦{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Price Info */}
                {formData.amount >= 50 && (
                  <div className="bg-muted p-4 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Airtime Value</span>
                      <span className="font-medium">₦{formData.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 mt-2 border-border/50">
                      <span className="font-semibold">You Pay</span>
                      <span className="font-bold text-lg">₦{formData.amount.toLocaleString()}</span>
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

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || loadingBalance || walletBalance < formData.amount || formData.amount < 50}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>

                {walletBalance < formData.amount && formData.amount >= 50 && (
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
          {/* Wallet Balance Widget */}
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

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <p className="text-muted-foreground">Select your preferred mobile network.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <p className="text-muted-foreground">Enter the 11-digit phone number.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <p className="text-muted-foreground">Input amount or choose quick topup.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">4</div>
                <p className="text-muted-foreground">Authorize with your secure PIN.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
