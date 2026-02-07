'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Wifi, Wallet, Lock, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDataSize } from '@/lib/constants/data-plans'
import { TransactionPinModal } from '@/components/transaction-pin-modal'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
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
import { Badge } from '@/components/ui/badge'

const NETWORKS = [
  { code: 'MTN', name: 'MTN', color: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  { code: 'GLO', name: 'Glo', color: 'bg-green-500', hover: 'hover:bg-green-600' },
  { code: 'AIRTEL', name: 'Airtel', color: 'bg-red-500', hover: 'hover:bg-red-600' },
  { code: '9MOBILE', name: '9mobile', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
] as const

// Filter for popular plans to show at the top
const isPopularPlan = (plan: DataPlan) => {
  const popularSizes = [1024, 2048, 5120] // 1GB, 2GB, 5GB
  return popularSizes.includes(plan.dataCapacity)
}

type Network = typeof NETWORKS[number]['code']

interface DataPlan {
  id: string
  name: string
  network: string
  costPrice: number
  sellingPrice: number
  profit: number
  validity: string
  description: string
  dataCapacity: number
  isAvailable: boolean
}

export default function DataPurchasePage() {
  const { data: session } = useSession()
  const [selectedNetwork, setSelectedNetwork] = useState<Network>('MTN')
  const [phone, setPhone] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)
  const [checkingPin, setCheckingPin] = useState(false)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance', { credentials: 'include' })
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
  }, [success])

  useEffect(() => {
    const checkPinStatus = async () => {
      setCheckingPin(true)
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

  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true)
      setSelectedPlan(null)
      try {
        const res = await fetch(`/api/data/plans?network=${selectedNetwork}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setPlans(data.data.plans || [])
        } else {
          setError(data.message || 'Failed to fetch plans')
        }
      } catch (err: any) {
        console.error('Failed to fetch plans:', err)
        setError('Failed to load data plans. Please try again.')
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [selectedNetwork])

  const handleBuyClick = () => {
    setError('')
    setSuccess('')
    if (!phone || phone.length < 11) {
      setError('Please enter a valid 11-digit phone number')
      return
    }
    if (!selectedPlan) {
      setError('Please select a data plan')
      return
    }
    if (!hasPinSet) {
      setError('Transaction PIN not set. Please set up your PIN before making purchases.')
      return
    }
    if (walletBalance < selectedPlan.sellingPrice) {
      setError(`Insufficient balance. Required: ₦${selectedPlan.sellingPrice.toLocaleString()}, Available: ₦${walletBalance.toLocaleString()}`)
      return
    }
    setShowPinModal(true)
  }

  const handlePurchase = async (pin: string) => {
    if (!selectedPlan) {
      setError('Please select a data plan')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/data/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ network: selectedNetwork, phone, planId: selectedPlan.id, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Purchase failed')
      }
      setSuccess(`${selectedPlan.name} data bundle purchased successfully! Delivery in progress...`)
      setShowPinModal(false)
      setPhone('')
      setSelectedPlan(null)
      if (data.data?.wallet?.newBalance !== undefined) {
        setWalletBalance(data.data.wallet.newBalance)
      }
    } catch (err: any) {
      console.error('Purchase error:', err)
      setError(err.message || 'Purchase failed. Please try again.')
      setShowPinModal(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Buy Data Bundle</h1>
        <p className="text-muted-foreground">Purchase internet data plans for any network.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Data Subscription
              </CardTitle>
              <CardDescription>Select network, enter phone, and choose a plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Network Selection */}
              <div className="space-y-3">
                <Label>Select Network</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {NETWORKS.map((network) => (
                    <div
                      key={network.code}
                      onClick={() => setSelectedNetwork(network.code)}
                      className={`
                          cursor-pointer rounded-md border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-muted/50
                          ${selectedNetwork === network.code ? 'border-primary bg-primary/5' : 'border-muted'}
                        `}
                    >
                      <div className={`w-8 h-8 rounded-full ${network.color} flex items-center justify-center text-white`} />
                      <span className="font-semibold text-sm">{network.name}</span>
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
                  value={phone}
                  onChange={(value) => setPhone(value || '')}
                  placeholder="Enter phone number"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>input]:outline-none [&>input]:bg-transparent [&>input]:w-full"
                />
                <p className="text-[0.8rem] text-muted-foreground">Enter the number you want to subscribe for.</p>
              </div>

              {/* Data Plans */}
              <div className="space-y-3">
                <Label>Available Plans</Label>

                {loadingPlans ? (
                  <div className="flex flex-col items-center justify-center py-12 border rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Loading plans...</p>
                  </div>
                ) : plans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border rounded-md text-muted-foreground">
                    <Wifi className="h-10 w-10 mb-2 opacity-20" />
                    <p>No plans available for {selectedNetwork}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {plans.map((plan) => {
                      const isPopular = isPopularPlan(plan)
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          className={`
                                cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 relative overflow-hidden
                                ${selectedPlan?.id === plan.id ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}
                              `}
                        >
                          {isPopular && (
                            <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] h-5 px-1.5">Popular</Badge>
                          )}
                          <div className="flex justify-between items-start mb-1 pr-6">
                            <div>
                              <p className="font-bold text-lg">{formatDataSize(plan.dataCapacity)}</p>
                              <p className="text-xs text-muted-foreground">{plan.validity}</p>
                            </div>
                            <p className="font-bold">₦{plan.sellingPrice.toLocaleString()}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{plan.network} {plan.name}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Purchase Summary Alert */}
              {selectedPlan && (
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm block">
                  <h4 className="font-semibold mb-2">Purchase Summary</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-medium">{selectedNetwork}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{phone || 'Not entered'}</span>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">{formatDataSize(selectedPlan.dataCapacity)} - {selectedPlan.validity}</span>
                    <span className="text-muted-foreground font-semibold pt-2">Total:</span>
                    <span className="font-bold pt-2">₦{selectedPlan.sellingPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Messages */}
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
              {!hasPinSet && !checkingPin && (
                <div className="bg-yellow-50 text-yellow-800 border-yellow-200 border p-3 rounded-md flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <div>
                    <p className="font-semibold">PIN Required</p>
                    <p>You need to set up a transaction PIN in your profile to make purchases.</p>
                    <Link href="/dashboard/profile" className="underline font-medium mt-1 inline-block">Go to Profile</Link>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleBuyClick}
                disabled={!phone || !selectedPlan || loading || loadingPlans || !hasPinSet || walletBalance < (selectedPlan?.sellingPrice || 0)}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {selectedPlan ? `Pay ₦${selectedPlan.sellingPrice.toLocaleString()}` : "Buy Data Bundle"}
                  </>
                )}
              </Button>
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
              <p>1. Select network and plan carefully.</p>
              <p>2. Ensure the phone number is correct.</p>
              <p>3. Funds are deducted instantly.</p>
              <p>4. Data delivery is usually instant but can take up to 5 minutes.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={handlePurchase}
        amount={selectedPlan?.sellingPrice || 0}
        recipient={phone}
        network={selectedNetwork}
        isLoading={loading}
      />
    </div>
  )
}
