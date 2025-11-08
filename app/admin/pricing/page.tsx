"use client"

import React, { useEffect, useState } from 'react'

interface PricingService {
  id: string
  name: string
  discount: number
  profitMargin: number
  minAmount: number
  maxAmount: number
  status: string
  providers: string[]
  stats: {
    last30Days: {
      transactions: number
      revenue: number
      profit: number
    }
  }
}

interface PricingSummary {
  totalRevenue: number
  totalProfit: number
  totalTransactions: number
  averageMargin: number
}

export default function AdminPricingPage() {
  const [services, setServices] = useState<PricingService[]>([])
  const [summary, setSummary] = useState<PricingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<PricingService>>({})

  useEffect(() => {
    fetchPricingData()
  }, [])

  const fetchPricingData = async () => {
    try {
      const response = await fetch('/api/admin/pricing')
      const result = await response.json()

      if (result.success) {
        setServices(result.data.services)
        setSummary(result.data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePricing = async (serviceId: string, updates: Partial<PricingService>) => {
    setUpdating(serviceId)
    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          ...updates,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('Pricing updated successfully')
        fetchPricingData() // Refresh data
        setEditMode(null)
        setEditData({})
      } else {
        alert('Failed to update pricing')
      }
    } catch (error) {
      console.error('Failed to update pricing:', error)
      alert('Failed to update pricing')
    } finally {
      setUpdating(null)
    }
  }

  const startEdit = (service: PricingService) => {
    setEditMode(service.id)
    setEditData({
      discount: service.discount,
      profitMargin: service.profitMargin,
      minAmount: service.minAmount,
      maxAmount: service.maxAmount,
      status: service.status,
    })
  }

  const cancelEdit = () => {
    setEditMode(null)
    setEditData({})
  }

  const saveEdit = (serviceId: string) => {
    updatePricing(serviceId, editData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pricing data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pricing Management</h1>
          <p className="text-sm text-gray-600">Configure profit margins and pricing for all services</p>
        </div>
        <button
          onClick={fetchPricingData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue (30d)</h3>
            <p className="text-2xl font-bold text-green-600">
              ₦{summary.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Profit (30d)</h3>
            <p className="text-2xl font-bold text-blue-600">
              ₦{summary.totalProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Transactions (30d)</h3>
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalTransactions.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Average Margin</h3>
            <p className="text-2xl font-bold text-purple-600">
              {summary.averageMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Service Pricing Configuration</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last 30 Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.providers.slice(0, 3).join(', ')}
                        {service.providers.length > 3 && ` +${service.providers.length - 3} more`}
                      </div>
                    </div>
                  </td>

                  {/* Discount */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === service.id ? (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.1"
                        value={editData.discount ?? service.discount}
                        onChange={(e) => setEditData({ ...editData, discount: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{service.discount}%</span>
                    )}
                  </td>

                  {/* Profit Margin */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === service.id ? (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.1"
                        value={editData.profitMargin ?? service.profitMargin}
                        onChange={(e) => setEditData({ ...editData, profitMargin: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{service.profitMargin}%</span>
                    )}
                  </td>

                  {/* Amount Range */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === service.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={editData.minAmount ?? service.minAmount}
                          onChange={(e) => setEditData({ ...editData, minAmount: parseInt(e.target.value) || 1 })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          min="1"
                          value={editData.maxAmount ?? service.maxAmount}
                          onChange={(e) => setEditData({ ...editData, maxAmount: parseInt(e.target.value) || 1 })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">
                        ₦{service.minAmount.toLocaleString()} - ₦{service.maxAmount.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editMode === service.id ? (
                      <select
                        value={editData.status ?? service.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status}
                      </span>
                    )}
                  </td>

                  {/* Stats */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{service.stats.last30Days.transactions} txns</div>
                      <div className="text-green-600">₦{service.stats.last30Days.revenue.toLocaleString()}</div>
                      <div className="text-blue-600">₦{service.stats.last30Days.profit.toLocaleString()}</div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editMode === service.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(service.id)}
                          disabled={updating === service.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {updating === service.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(service)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Bulk Actions</h3>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const confirmed = confirm('This will reset all profit margins to default values. Continue?')
              if (confirmed) {
                // Bulk update logic would go here
                alert('Bulk update functionality not yet implemented')
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => {
              // Export pricing data
              const dataStr = JSON.stringify({ services, summary }, null, 2)
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
              const exportFileDefaultName = 'pricing-config.json'
              const linkElement = document.createElement('a')
              linkElement.setAttribute('href', dataUri)
              linkElement.setAttribute('download', exportFileDefaultName)
              linkElement.click()
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Export Configuration
          </button>
        </div>
      </div>
    </div>
  )
}