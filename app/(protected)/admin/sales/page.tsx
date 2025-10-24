'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  Download,
  Filter,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  Loader2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface SalesData {
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  totalTransactions: number
  revenueGrowth: number
  profitGrowth: number
}

export default function SalesPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalTransactions: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
  })

  // Revenue & Profit Trend Data
  const revenueData = [
    { date: 'Week 1', revenue: 125000, profit: 25000, transactions: 450 },
    { date: 'Week 2', revenue: 142000, profit: 28400, transactions: 520 },
    { date: 'Week 3', revenue: 135000, profit: 27000, transactions: 490 },
    { date: 'Week 4', revenue: 158000, profit: 31600, transactions: 580 },
  ]

  // Service Type Performance
  const serviceData = [
    { name: 'Airtime', revenue: 185000, profit: 37000, transactions: 850, color: '#6366f1' },
    { name: 'Data', revenue: 245000, profit: 49000, transactions: 1200, color: '#8b5cf6' },
    { name: 'Electricity', revenue: 95000, profit: 19000, transactions: 320, color: '#ec4899' },
    { name: 'Cable TV', revenue: 65000, profit: 13000, transactions: 210, color: '#14b8a6' },
    { name: 'Others', revenue: 35000, profit: 7000, transactions: 120, color: '#f59e0b' },
  ]

  // Profit Margin by Service
  const profitMarginData = [
    { service: 'Airtime', margin: 20 },
    { service: 'Data', margin: 20 },
    { service: 'Electricity', margin: 20 },
    { service: 'Cable TV', margin: 20 },
    { service: 'Betting', margin: 15 },
  ]

  // Daily Revenue (Last 7 Days)
  const dailyRevenueData = [
    { day: 'Mon', revenue: 35000, profit: 7000 },
    { day: 'Tue', revenue: 42000, profit: 8400 },
    { day: 'Wed', revenue: 38000, profit: 7600 },
    { day: 'Thu', revenue: 45000, profit: 9000 },
    { day: 'Fri', revenue: 52000, profit: 10400 },
    { day: 'Sat', revenue: 48000, profit: 9600 },
    { day: 'Sun', revenue: 40000, profit: 8000 },
  ]

  // Top Performing Hours
  const hourlyData = [
    { hour: '06:00', transactions: 45, revenue: 18000 },
    { hour: '09:00', transactions: 120, revenue: 48000 },
    { hour: '12:00', transactions: 180, revenue: 72000 },
    { hour: '15:00', transactions: 150, revenue: 60000 },
    { hour: '18:00', transactions: 200, revenue: 80000 },
    { hour: '21:00', transactions: 85, revenue: 34000 },
  ]

  useEffect(() => {
    fetchSalesData()
  }, [period])

  const fetchSalesData = async () => {
    setLoading(true)
    // TODO: Replace with real API call
    setTimeout(() => {
      setSalesData({
        totalRevenue: 560000,
        totalProfit: 112000,
        profitMargin: 20,
        totalTransactions: 2040,
        revenueGrowth: 15.3,
        profitGrowth: 12.8,
      })
      setLoading(false)
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales & Profit Analysis</h1>
          <p className="mt-1 text-gray-600">Track revenue, profit, and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ₦{(salesData.totalRevenue / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{salesData.revenueGrowth}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ₦{(salesData.totalProfit / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+{salesData.profitGrowth}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {salesData.profitMargin}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-gray-600 font-medium">Consistent</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {salesData.totalTransactions.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+8.2%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Profit Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
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
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
            <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Service Performance & Daily Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Type Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Service</h3>
          <div className="space-y-4">
            {serviceData.map((service, index) => {
              const totalRevenue = serviceData.reduce((sum, s) => sum + s.revenue, 0)
              const percentage = ((service.revenue / totalRevenue) * 100).toFixed(1)
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₦{(service.revenue / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-500">{percentage}% of total</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: service.color 
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{service.transactions} transactions</span>
                    <span>₦{(service.profit / 1000).toFixed(0)}K profit</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Daily Revenue (Last 7 Days) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Margin & Hourly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Margin by Service */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Margin by Service</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitMarginData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="service" type="category" stroke="#9ca3af" width={100} />
              <Tooltip />
              <Bar dataKey="margin" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Transaction Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="transactions" 
                stroke="#ec4899" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Transactions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceData.slice(0, 4).map((service, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${service.color}20` }}
                >
                  {service.name === 'Airtime' && <Smartphone className="w-5 h-5" style={{ color: service.color }} />}
                  {service.name === 'Data' && <Wifi className="w-5 h-5" style={{ color: service.color }} />}
                  {service.name === 'Electricity' && <Zap className="w-5 h-5" style={{ color: service.color }} />}
                  {service.name === 'Cable TV' && <Tv className="w-5 h-5" style={{ color: service.color }} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.transactions} txns</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold text-gray-900">₦{(service.revenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit</span>
                  <span className="font-semibold text-green-600">₦{(service.profit / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Margin</span>
                  <span className="font-semibold text-indigo-600">{((service.profit / service.revenue) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
