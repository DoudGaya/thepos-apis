'use client'

import { TrendingDownIcon, TrendingUpIcon, Users, CreditCard, Wallet, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from '@/lib/utils'

interface StatsProps {
  stats: {
    users: { total: number; new: number; active: number }
    transactions: { total: number; pending: number; failed: number; completed: number }
    revenue: { total: number; profit: number }
    wallet: { totalBalance: number }
  }
}

export function DashboardStats({ stats }: StatsProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.revenue.total),
      description: "Transaction value",
      trend: stats.revenue.total > 0 ? "+12.5%" : "0%",
      trendUp: stats.revenue.total > 0,
      footer: `Est. profit: ${formatCurrency(stats.revenue.profit)}`,
      icon: Wallet,
      color: "emerald",
    },
    {
      title: "Transactions",
      value: stats.transactions.total.toLocaleString(),
      description: "Total processed",
      trend: stats.transactions.total > 0 
        ? `${Math.round((stats.transactions.completed / Math.max(stats.transactions.total, 1)) * 100)}% success` 
        : "0%",
      trendUp: stats.transactions.completed > stats.transactions.failed,
      footer: `${stats.transactions.completed} completed, ${stats.transactions.pending} pending`,
      icon: CreditCard,
      color: "blue",
    },
    {
      title: "Active Users",
      value: stats.users.active.toLocaleString(),
      description: `of ${stats.users.total} total`,
      trend: stats.users.new > 0 ? `+${stats.users.new} new` : "No new",
      trendUp: stats.users.new > 0,
      footer: `${stats.users.total} registered accounts`,
      icon: Users,
      color: "purple",
    },
    {
      title: "User Wallets",
      value: formatCurrency(stats.wallet.totalBalance),
      description: "Total balances",
      trend: stats.wallet.totalBalance > 0 ? "Active" : "Empty",
      trendUp: stats.wallet.totalBalance > 0,
      footer: "Combined user liabilities",
      icon: Activity,
      color: "orange",
    },
  ]

  const colorClasses = {
    emerald: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    blue: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    purple: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    orange: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-card to-card/80">
          <div className={`absolute right-4 top-4 rounded-xl p-2.5 ${colorClasses[card.color as keyof typeof colorClasses]}`}>
            <card.icon className="h-5 w-5" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              {card.title}
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums tracking-tight">
              {card.value}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardHeader>
          <CardFooter className="flex items-center justify-between pt-0">
            <span className="text-xs text-muted-foreground">{card.footer}</span>
            <Badge 
              variant="outline" 
              className={`flex gap-1 rounded-md text-[10px] font-medium ${
                card.trendUp 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' 
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
              }`}
            >
              {card.trendUp ? (
                <TrendingUpIcon className="size-3" />
              ) : (
                <TrendingDownIcon className="size-3" />
              )}
              {card.trend}
            </Badge>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
