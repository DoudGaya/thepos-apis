"use client"

import React, { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface SalesData {
  period: string
  groupBy: string
  summary: {
    totalRevenue: number
    totalProfit: number
    overallMargin: number
    totalTransactions: number
    averageTransaction: number
  }
  revenueByService: Array<{
    type: string
    revenue: number
    profit: number
    profitMargin: number
    transactions: number
    averageTransaction: number
  }>
  timeSeries: Array<{
    date: string
    revenue: number
    transactions: number
    profit: number
  }>
  peakHours: Array<{
    hour: number
    revenue: number
    transactions: number
  }>
  topPerformingService: any
}

interface StatsData {
  period: string
  users: {
    total: number
    new: number
    active: number
    growth: number
  }
  transactions: {
    total: number
    pending: number
    failed: number
    completed: number
  }
  revenue: {
    total: number
    profit: number
    profitMargin: number
    growth: number
    byType: Array<{
      type: string
      revenue: number
      count: number
    }>
  }
  wallet: {
    totalBalance: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AdminAnalyticsPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [groupBy, setGroupBy] = useState('day')

  useEffect(() => {
    fetchAnalyticsData()
  }, [period, groupBy])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const [salesResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/sales?period=${period}&groupBy=${groupBy}`),
        fetch(`/api/admin/stats?period=${period}`)
      ])

      const [salesResult, statsResult] = await Promise.all([
        salesResponse.json(),
        statsResponse.json()
      ])

      if (salesResult.success) {
        setSalesData(salesResult.data)
      }
      if (statsResult.success) {
        setStatsData(statsResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    if (groupBy === 'hour') {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (groupBy === 'day') {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } else if (groupBy === 'month') {
      return new Date(dateStr + '-01').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
    }
    return dateStr
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics & Reports</h1>
          <p className="text-sm text-gray-600">Comprehensive business intelligence and performance metrics</p>
        </div>
        <div className="flex gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="hour">By Hour</option>
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="month">By Month</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {statsData && salesData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(salesData.summary.totalRevenue)}
            </p>
            <p className="text-sm text-gray-500">
              {statsData.revenue.growth >= 0 ? '+' : ''}{statsData.revenue.growth.toFixed(1)}% vs previous period
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Profit</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(salesData.summary.totalProfit)}
            </p>
            <p className="text-sm text-gray-500">
              {salesData.summary.overallMargin.toFixed(1)}% margin
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Transactions</h3>
            <p className="text-2xl font-bold text-gray-900">
              {salesData.summary.totalTransactions.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              Avg: {formatCurrency(salesData.summary.averageTransaction)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
            <p className="text-2xl font-bold text-gray-900">
              {statsData.users.active.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              {statsData.users.new} new this period
            </p>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Revenue Trend</h3>
          {salesData && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by Service Type */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Revenue by Service</h3>
          {salesData && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData.revenueByService}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                <Bar dataKey="profit" fill="#3B82F6" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Transaction Volume</h3>
          {salesData && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), 'Transactions']}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Transactions"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Service Distribution</h3>
          {salesData && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesData.revenueByService}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {salesData.revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Peak Hours */}
      {salesData && salesData.peakHours.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Peak Hours</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {salesData.peakHours.map((hour, index) => (
              <div key={hour.hour} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {hour.hour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(hour.revenue)}
                </div>
                <div className="text-sm text-gray-500">
                  {hour.transactions} transactions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Service Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Service Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Transaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData?.revenueByService.map((service) => (
                <tr key={service.type}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {service.type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(service.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {formatCurrency(service.profit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.profitMargin.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.transactions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(service.averageTransaction)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Export Reports</h3>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const data = {
                salesData,
                statsData,
                generatedAt: new Date().toISOString(),
                period,
                groupBy,
              }
              const dataStr = JSON.stringify(data, null, 2)
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
              const exportFileDefaultName = `analytics-report-${period}-${new Date().toISOString().slice(0, 10)}.json`
              const linkElement = document.createElement('a')
              linkElement.setAttribute('href', dataUri)
              linkElement.setAttribute('download', exportFileDefaultName)
              linkElement.click()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export JSON Report
          </button>
          <button
            onClick={() => {
              // CSV export would be implemented here
              alert('CSV export functionality coming soon')
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}