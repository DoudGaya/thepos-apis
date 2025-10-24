'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Database,
  Smartphone,
  Wifi,
  Zap,
  Package,
  Calendar,
  Eye,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  totalUsers: number
  totalRevenue: number
  totalTransactions: number
  totalProfit: number
  activeUsers: number
  newUsersToday: number
  revenueToday: number
  transactionsToday: number
}

// Mock data for charts
const revenueData = [
  { name: 'Jan', revenue: 65000, profit: 13000 },
  { name: 'Feb', revenue: 78000, profit: 15600 },
  { name: 'Mar', revenue: 85000, profit: 17000 },
  { name: 'Apr', revenue: 92000, profit: 18400 },
  { name: 'May', revenue: 105000, profit: 21000 },
  { name: 'Jun', revenue: 118000, profit: 23600 },
]

const transactionTypeData = [
  { name: 'Airtime', value: 35, color: '#6366f1' },
  { name: 'Data', value: 45, color: '#8b5cf6' },
  { name: 'Electricity', value: 12, color: '#ec4899' },
  { name: 'Cable TV', value: 8, color: '#14b8a6' },
]

const dailyTransactions = [
  { hour: '00:00', transactions: 12 },
  { hour: '04:00', transactions: 8 },
  { hour: '08:00', transactions: 45 },
  { hour: '12:00', transactions: 78 },
  { hour: '16:00', transactions: 62 },
  { hour: '20:00', transactions: 35 },
  { hour: '23:59', transactions: 18 },
]

interface RecentTransaction {
  id: string
  user: string
  type: string
  amount: number
  profit: number
  status: string
  createdAt: string
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    totalProfit: 0,
    activeUsers: 0,
    newUsersToday: 0,
    revenueToday: 0,
    transactionsToday: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch real data from API
    setTimeout(() => {
      setStats({
        totalUsers: 1234,
        totalRevenue: 543000,
        totalTransactions: 8765,
        totalProfit: 108600,
        activeUsers: 456,
        newUsersToday: 23,
        revenueToday: 45000,
        transactionsToday: 156,
      })

      setRecentTransactions([
        {
          id: '1',
          user: 'John Doe',
          type: 'DATA',
          amount: 1000,
          profit: 200,
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: '2',
          user: 'Jane Smith',
          type: 'AIRTIME',
          amount: 500,
          profit: 100,
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: '3',
          user: 'Bob Johnson',
          type: 'ELECTRICITY',
          amount: 5000,
          profit: 100,
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ])

      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalUsers.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{stats.newUsersToday} today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ₦{(stats.totalRevenue / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">₦{(stats.revenueToday / 1000).toFixed(0)}K today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalTransactions.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{stats.transactionsToday} today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-100">Total Profit</p>
              <p className="text-3xl font-bold mt-2">
                ₦{(stats.totalProfit / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12.5% this month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Types */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={transactionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {transactionTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Transaction Activity</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyTransactions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="transactions" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <Link
              href="/admin/transactions"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.map((txn) => (
              <div key={txn.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      {txn.type === 'DATA' && <Wifi className="w-5 h-5 text-indigo-600" />}
                      {txn.type === 'AIRTIME' && <Smartphone className="w-5 h-5 text-indigo-600" />}
                      {txn.type === 'ELECTRICITY' && <Zap className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{txn.user}</p>
                      <p className="text-sm text-gray-500">{txn.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₦{txn.amount.toLocaleString()}</p>
                    <p className="text-sm text-green-600">+₦{txn.profit} profit</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">Manage Users</span>
                </div>
              </Link>
              <Link
                href="/admin/pricing"
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">Update Pricing</span>
                </div>
              </Link>
              <Link
                href="/admin/vendors"
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">Check Vendors</span>
                </div>
              </Link>
              <Link
                href="/admin/notifications"
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">Send Notification</span>
                </div>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">System Status</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">API Status</span>
                <span className="text-green-600 font-medium">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database</span>
                <span className="text-green-600 font-medium">● Healthy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users</span>
                <span className="text-gray-900 font-semibold">{stats.activeUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
