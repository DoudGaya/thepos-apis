'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation' // Added useRouter import
import Link from 'next/link'
import {
  Wallet,
  Smartphone,
  Wifi,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface WalletData {
  balance: number
  commissionBalance: number
}

interface QuickStat {
  label: string
  value: string
  change: string
  isPositive: boolean
}

interface RecentTransaction {
  id: string
  type: string
  description: string
  amount: number
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  createdAt: string
}

function calculateTotalSpent(transactions: RecentTransaction[]): string {
  const total = transactions
    .filter(t => t.amount < 0 && (t.status === 'COMPLETED' || t.status === 'PENDING'))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return `₦${total.toLocaleString()}`
}

function calculateMonthlySpent(transactions: RecentTransaction[]): string {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const total = transactions
    .filter(t => {
      const txDate = new Date(t.createdAt)
      return t.amount < 0 && txDate >= monthStart && (t.status === 'COMPLETED' || t.status === 'PENDING')
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return `₦${total.toLocaleString()}`
}

function getTransactionDescription(tx: any): string {
  const details = tx.details || {}

  switch (tx.type) {
    case 'DATA':
      return `${details.network} ${details.planName || 'Data Bundle'}`
    case 'AIRTIME':
      return `${details.network} Airtime`
    case 'ELECTRICITY':
      return `Electricity Token`
    case 'CABLE':
    case 'CABLE_TV':
      return `Cable TV Subscription`
    case 'WALLET_FUNDING':
      return `Wallet Funding`
    default:
      return tx.type
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter() // Use router for redirection

  useEffect(() => {
    // Client-side check for profile completion
    if (session?.user) {
      const u = session.user as any
      // If phone is missing, it is definitely a new/incomplete user
      if (!u.phone) {
        router.push('/profile-completion')
      }
    }
  }, [session, router])

  const [wallet, setWallet] = useState<WalletData>({ balance: 0, commissionBalance: 0 })
  const [stats, setStats] = useState<QuickStat[]>([])
  const [transactions, setTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [walletRes, transactionsRes, referralsRes] = await Promise.all([
          fetch('/api/wallet/balance', { credentials: 'include' }),
          fetch('/api/transactions?limit=5', { credentials: 'include' }),
          fetch('/api/referrals', { credentials: 'include' })
        ])

        const walletData = walletRes.ok ? await walletRes.json() : null
        const transactionsData = transactionsRes.ok ? await transactionsRes.json() : null
        const referralsData = referralsRes.ok ? await referralsRes.json() : null

        if (walletData?.data) {
          setWallet({
            balance: walletData.data.balance || 0,
            commissionBalance: walletData.data.commissionBalance || 0,
          })
        }

        let sanitizedTransactions: RecentTransaction[] = []

        if (transactionsData?.data?.transactions) {
          const rawTransactions = Array.isArray(transactionsData.data.transactions)
            ? transactionsData.data.transactions
            : [transactionsData.data.transactions]

          sanitizedTransactions = rawTransactions.map((tx: any, index: number) => ({
            id: tx.id || `tx-${Date.now()}-${index}`,
            type: tx.type,
            description: getTransactionDescription(tx),
            amount: tx.type === 'WALLET_FUNDING' ? (tx.amount || 0) : -(tx.amount || 0),
            status: tx.status === 'SUCCESS' ? 'COMPLETED' : tx.status,
            createdAt: tx.createdAt,
          }))

          setTransactions(sanitizedTransactions)
        }

        // Stats calculation
        if (sanitizedTransactions.length > 0 || referralsData?.data?.stats) {
          const referralStats = referralsData?.data?.stats

          setStats([
            {
              label: 'Total Spent',
              value: calculateTotalSpent(sanitizedTransactions),
              change: '+12%',
              isPositive: true
            },
            {
              label: 'Transactions',
              value: (transactionsData?.data?.total || sanitizedTransactions.length).toString(),
              change: '+8%',
              isPositive: true
            },
            {
              label: 'This Month',
              value: calculateMonthlySpent(sanitizedTransactions),
              change: '-3%',
              isPositive: false
            },
            {
              label: 'Referral Earnings',
              value: `₦${(referralStats?.totalEarned || 0).toLocaleString()}`,
              change: '+25%',
              isPositive: true
            },
          ])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {session?.user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your financial activity.
        </p>
      </div>

      {/* Wallet Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Wallet Card - Spans 4 columns */}
        <Card className="col-span-4 bg-primary text-primary-foreground shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Main Wallet Balance</CardDescription>
            <CardTitle className="text-4xl font-bold">₦{wallet.balance.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mt-4">
              <Button asChild variant="secondary" className="flex-1 font-semibold">
                <Link href="/dashboard/wallet?action=fund">
                  <Plus className="mr-2 h-4 w-4" /> Fund Wallet
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground">
                <Link href="/dashboard/wallet?action=transfer">
                  <Send className="mr-2 h-4 w-4" /> Transfer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commission Wallet Card - Spans 3 columns */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Commission Balance</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold">₦{wallet.commissionBalance.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/referrals">
                  View Referrals <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              {stat.isPositive ? <ArrowUpRight className="h-4 w-4 text-muted-foreground" /> : <ArrowDownRight className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick Actions */}
        <div className="col-span-4">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/airtime">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer  border-l-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Buy Airtime</CardTitle>
                      <CardDescription>Top up any network</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/data">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer  border-l-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Wifi className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Buy Data</CardTitle>
                      <CardDescription>Get internet bundles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/electricity">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer  border-l-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Electricity</CardTitle>
                      <CardDescription>Pay bills instantly</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/transactions">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer  border-l-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">History</CardTitle>
                      <CardDescription>View transactions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest financial movements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`rounded-full p-2 ${transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {transaction.amount > 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none truncate max-w-[150px]">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                const date = new Date(transaction.createdAt);
                                if (isNaN(date.getTime())) return 'Recently';
                                return formatDistanceToNow(date, { addSuffix: true });
                              } catch (e) {
                                return 'Recently';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${transaction.amount > 0 ? 'text-green-600' : ''}`}>
                          {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{(transaction.status || 'unknown').toLowerCase()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
