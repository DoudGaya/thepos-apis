import { prisma } from '@/lib/prisma'
import { DashboardStats } from './_components/dashboard-stats'
import { RevenueChart, DistributionChart } from './_components/dashboard-charts'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    period?: string
  }>
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const period = resolvedParams.period || 'month'

  // Calculate date range
  let startDate: Date | undefined
  const now = new Date()

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0))
      break
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7))
      break
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1))
      break
    default:
      startDate = undefined
  }

  const whereDate = startDate ? { createdAt: { gte: startDate } } : {}

  // Fetch Data in Parallel
  const [
    totalUsers,
    newUsers,
    activeUsers,
    transactions,
    revenueByType,
    walletBalance,
    recentTransactions,
    pendingCount,
    failedCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: whereDate }),
    prisma.user.count({
      where: {
        ...whereDate,
        transactions: { some: { status: 'COMPLETED' } },
      },
    }),
    prisma.transaction.aggregate({
      where: { ...whereDate, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { ...whereDate, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.aggregate({
      _sum: { credits: true },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    }),
    prisma.transaction.count({ where: { ...whereDate, status: 'PENDING' } }),
    prisma.transaction.count({ where: { ...whereDate, status: 'FAILED' } })
  ])

  const stats = {
    users: {
      total: totalUsers,
      new: newUsers,
      active: activeUsers
    },
    transactions: {
      total: (transactions._count || 0) + pendingCount + failedCount,
      completed: transactions._count || 0,
      pending: pendingCount,
      failed: failedCount
    },
    revenue: {
      total: transactions._sum.amount || 0,
      profit: (transactions._sum.amount || 0) * 0.03 // Estimated 3%
    },
    wallet: {
      totalBalance: walletBalance._sum.credits || 0
    }
  }

  const chartData = revenueByType.map(item => ({
    type: item.type,
    revenue: item._sum.amount || 0,
    count: item._count
  })).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your system performance and business metrics.
          </p>
        </div>
        
        <Tabs defaultValue={period} className="w-auto">
          <TabsList className="grid w-full grid-cols-4">
            {['today', 'week', 'month', 'all'].map((p) => (
              <TabsTrigger key={p} value={p} asChild>
                <Link href={`/admin?period=${p}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>
              Breakdown of revenue across different service types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>
              Transaction count by service type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest transactions across all services
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/transactions">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="font-medium">
                      {tx.user.firstName} {tx.user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        tx.status === 'COMPLETED' || tx.status === 'SUCCESS'
                          ? 'default'
                          : tx.status === 'PENDING'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={
                        tx.status === 'COMPLETED' || tx.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : tx.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                          : ''
                      }
                    >
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No recent transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
