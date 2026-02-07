'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  CreditCard,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import Script from 'next/script'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

declare global {
  interface Window {
    PaystackPop: any
  }
}

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  reference: string
  details: any
  createdAt: string
}

export default function WalletPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showFundModal, setShowFundModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [fundingMethod, setFundingMethod] = useState<'card' | 'transfer'>('card')
  const [fundAmount, setFundAmount] = useState('')
  const [transferData, setTransferData] = useState({ phone: '', amount: '', pin: '' })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Virtual account details (Placeholder)
  const virtualAccount = {
    accountNumber: '8012345678', // Replace with real data if available
    accountName: session?.user?.name || 'User Name',
    bankName: 'Wema Bank',
  }

  useEffect(() => {
    if (action === 'fund') setShowFundModal(true)
    if (action === 'transfer') setShowTransferModal(true)
  }, [action])

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoadingData(true)
        setError('')

        // Fetch wallet balance
        const balanceResponse = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        const balanceData = await balanceResponse.json()

        if (balanceResponse.ok) {
          setWalletBalance(balanceData.data?.balance || 0)
        } else {
          setError(balanceData.error || 'Failed to fetch balance')
        }

        // Fetch recent transactions
        const transactionsResponse = await fetch('/api/transactions?limit=20', {
          credentials: 'include'
        })
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json()
          setTransactions(transactionsData.data?.transactions || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    if (session) {
      fetchWalletData()
    }
  }, [session])

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(virtualAccount.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFundWithCard = async () => {
    if (!fundAmount || parseFloat(fundAmount) < 100) {
      setError('Minimum funding amount is ₦100')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: parseFloat(fundAmount) }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Payment initialization failed')

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: data.data.publicKey,
          email: session?.user?.email,
          amount: parseFloat(fundAmount) * 100,
          ref: data.data.reference,
          currency: 'NGN',
          onClose: () => {
            setLoading(false)
            setError('Payment cancelled')
          },
          callback: (response: any) => {
            // Verify payment
            setSuccess('Payment successful! Verifying...')
            fetch('/api/wallet/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ reference: response.reference }),
            })
              .then(res => res.json())
              .then(verifyData => {
                if (verifyData.success) {
                  setSuccess('Wallet funded successfully!')
                  setWalletBalance(prev => prev + parseFloat(fundAmount))
                  setShowFundModal(false)
                  setFundAmount('')
                  window.location.reload()
                } else {
                  setError('Payment verification failed. Please contact support.')
                }
              })
              .catch(() => setError('Payment verification failed'))
              .finally(() => setLoading(false))
          },
        })
        handler.openIframe()
      } else {
        throw new Error('Paystack SDK not loaded')
      }
    } catch (error: any) {
      setError(error.message || 'Payment initialization failed')
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferData.phone || !transferData.amount || !transferData.pin) {
      setError('Please fill all fields')
      return
    }

    if (parseFloat(transferData.amount) > walletBalance) {
      setError('Insufficient balance')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: transferData.phone,
          amount: parseFloat(transferData.amount),
          pin: transferData.pin,
          description: 'Wallet Transfer'
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Transfer failed')

      setSuccess('Transfer successful!')
      setWalletBalance(prev => prev - parseFloat(transferData.amount))
      setShowTransferModal(false)
      setTransferData({ phone: '', amount: '', pin: '' })
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      setError(error.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet Management</h1>
          <p className="text-muted-foreground">View your balance, fund wallet, and manage transactions.</p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive border-destructive/20 border p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 border-green-200 border p-4 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* Wallet Balance Card */}
          <Card className="col-span-4 bg-primary text-primary-foreground shadow-lg border-0 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/70">Total Balance</CardDescription>
              <CardTitle className="text-5xl font-bold tracking-tight">
                {loadingData ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : (
                  `₦${walletBalance.toLocaleString()}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 font-semibold"
                  onClick={() => setShowFundModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Fund Wallet
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-primary-foreground/20 hover:bg-primary-foreground/10 hover:text-primary-foreground text-primary-foreground"
                  onClick={() => setShowTransferModal(true)}
                >
                  <Send className="mr-2 h-4 w-4" /> Transfer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Virtual Account Card */}
          <Card className="col-span-3 flex flex-col justify-center">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Virtual Account</CardTitle>
                  <CardDescription>Instant funding via transfer</CardDescription>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Account Number</p>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
                  <span className="font-mono text-xl font-bold">{virtualAccount.accountNumber}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyAccount}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Bank Name</p>
                  <p className="font-semibold">{virtualAccount.bankName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Account Name</p>
                  <p className="font-semibold truncate">{virtualAccount.accountName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Your recent financial activities.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {loadingData ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const isCredit = tx.amount > 0 || tx.type === 'WALLET_FUNDING'
                    const amount = Math.abs(tx.amount)
                    const description = tx.details?.description || tx.type.replace('_', ' ')

                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {isCredit ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium leading-none capitalize">{description.toLowerCase()}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}</span>
                              <Separator orientation="vertical" className="h-3" />
                              <span>Ref: {tx.reference}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isCredit ? 'text-green-600' : 'text-primary'}`}>
                            {isCredit ? '+' : '-'}₦{amount.toLocaleString()}
                          </p>
                          <Badge variant={tx.status === 'COMPLETED' ? 'default' : tx.status === 'PENDING' ? 'secondary' : 'destructive'} className="mt-1 text-[10px] h-5">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-4 opacity-20" />
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Fund Wallet Dialog */}
        <Dialog open={showFundModal} onOpenChange={setShowFundModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Fund Wallet</DialogTitle>
              <DialogDescription>Add money to your wallet instantly.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="card" onValueChange={(v) => setFundingMethod(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card">Pay via Card</TabsTrigger>
                <TabsTrigger value="transfer">Bank Transfer</TabsTrigger>
              </TabsList>
              <TabsContent value="card" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount (min 100)"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum: ₦100</p>
                </div>
                <Button onClick={handleFundWithCard} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pay Now
                </Button>
              </TabsContent>
              <TabsContent value="transfer" className="space-y-4 py-4">
                <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Virtual Account Details</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p><span className="font-semibold">Bank:</span> {virtualAccount.bankName}</p>
                        <p><span className="font-semibold">Account:</span> {virtualAccount.accountNumber}</p>
                        <p><span className="font-semibold">Name:</span> {virtualAccount.accountName}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Transfers are automatically detected and credited.</p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Transfer Money</DialogTitle>
              <DialogDescription>Send money to another user.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recipient Phone</Label>
                <PhoneInput
                  international
                  defaultCountry="NG"
                  value={transferData.phone}
                  onChange={(value) => setTransferData({ ...transferData, phone: value || '' })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-amount">Amount (₦)</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-right text-muted-foreground">Balance: ₦{walletBalance.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">Transaction PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  maxLength={4}
                  placeholder="****"
                  value={transferData.pin}
                  onChange={(e) => setTransferData({ ...transferData, pin: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleTransfer} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer Funds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
