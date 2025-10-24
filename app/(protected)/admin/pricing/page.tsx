'use client'

import { useState, useEffect } from 'react'
import { 
  Save,
  RefreshCw,
  DollarSign,
  Percent,
  Edit2,
  Check,
  X,
  Loader2,
  TrendingUp,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  Target,
} from 'lucide-react'

interface PricingItem {
  id: string
  service: string
  category: string
  description: string
  costPrice: number
  sellingPrice: number
  discount: number
  profitMargin: number
  isActive: boolean
}

export default function PricingPage() {
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PricingItem>>({})
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    // TODO: Replace with real API call
    setTimeout(() => {
      const mockPricing: PricingItem[] = [
        {
          id: '1',
          service: 'Airtime',
          category: 'VTU',
          description: 'All Networks Airtime',
          costPrice: 97.5,
          sellingPrice: 100,
          discount: 2.5,
          profitMargin: 2.5,
          isActive: true,
        },
        {
          id: '2',
          service: 'MTN Data',
          category: 'DATA',
          description: 'MTN SME Data Plans',
          costPrice: 220,
          sellingPrice: 240,
          discount: 0,
          profitMargin: 9.1,
          isActive: true,
        },
        {
          id: '3',
          service: 'Airtel Data',
          category: 'DATA',
          description: 'Airtel Data Plans',
          costPrice: 225,
          sellingPrice: 245,
          discount: 0,
          profitMargin: 8.9,
          isActive: true,
        },
        {
          id: '4',
          service: 'Glo Data',
          category: 'DATA',
          description: 'Glo Data Plans',
          costPrice: 215,
          sellingPrice: 235,
          discount: 0,
          profitMargin: 9.3,
          isActive: true,
        },
        {
          id: '5',
          service: '9mobile Data',
          category: 'DATA',
          description: '9mobile Data Plans',
          costPrice: 210,
          sellingPrice: 230,
          discount: 0,
          profitMargin: 9.5,
          isActive: true,
        },
        {
          id: '6',
          service: 'Electricity',
          category: 'BILLS',
          description: 'Electricity Bill Payment',
          costPrice: 98,
          sellingPrice: 100,
          discount: 0,
          profitMargin: 2.0,
          isActive: true,
        },
        {
          id: '7',
          service: 'DSTV',
          category: 'CABLE',
          description: 'DSTV Subscription',
          costPrice: 98.5,
          sellingPrice: 100,
          discount: 0,
          profitMargin: 1.5,
          isActive: true,
        },
        {
          id: '8',
          service: 'GOTV',
          category: 'CABLE',
          description: 'GOTV Subscription',
          costPrice: 98.5,
          sellingPrice: 100,
          discount: 0,
          profitMargin: 1.5,
          isActive: true,
        },
      ]
      setPricingItems(mockPricing)
      setLoading(false)
    }, 500)
  }

  const startEdit = (item: PricingItem) => {
    setEditingId(item.id)
    setEditValues({
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      discount: item.discount,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = async (id: string) => {
    setSaveLoading(true)
    // TODO: API call to update pricing
    setTimeout(() => {
      setPricingItems(prev => prev.map(item => {
        if (item.id === id && editValues.sellingPrice && editValues.costPrice) {
          const profitMargin = ((editValues.sellingPrice - editValues.costPrice) / editValues.sellingPrice) * 100
          return {
            ...item,
            costPrice: editValues.costPrice,
            sellingPrice: editValues.sellingPrice,
            discount: editValues.discount || 0,
            profitMargin,
          }
        }
        return item
      }))
      setSaveLoading(false)
      setEditingId(null)
      setEditValues({})
    }, 500)
  }

  const getServiceIcon = (category: string) => {
    switch (category) {
      case 'VTU': return <Smartphone className="w-5 h-5" />
      case 'DATA': return <Wifi className="w-5 h-5" />
      case 'BILLS': return <Zap className="w-5 h-5" />
      case 'CABLE': return <Tv className="w-5 h-5" />
      default: return <DollarSign className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'VTU': return 'bg-blue-100 text-blue-700'
      case 'DATA': return 'bg-purple-100 text-purple-700'
      case 'BILLS': return 'bg-yellow-100 text-yellow-700'
      case 'CABLE': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const stats = {
    totalServices: pricingItems.length,
    activeServices: pricingItems.filter(p => p.isActive).length,
    avgProfitMargin: (pricingItems.reduce((sum, p) => sum + p.profitMargin, 0) / pricingItems.length).toFixed(1),
    highestMargin: Math.max(...pricingItems.map(p => p.profitMargin)).toFixed(1),
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="mt-1 text-gray-600">Manage service pricing, discounts, and profit margins</p>
        </div>
        <button 
          onClick={fetchPricing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <p className="text-sm text-gray-600">Total Services</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.activeServices}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Avg Margin</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgProfitMargin}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-600">Highest Margin</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.highestMargin}%</p>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pricingItems.map((item) => {
                const isEditing = editingId === item.id
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(item.category).split(' ')[0]}20`}>
                          {getServiceIcon(item.category)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.service}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.costPrice}
                          onChange={(e) => setEditValues({ ...editValues, costPrice: parseFloat(e.target.value) })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                          step="0.01"
                        />
                      ) : (
                        <p className="font-medium text-gray-900">₦{item.costPrice.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.sellingPrice}
                          onChange={(e) => setEditValues({ ...editValues, sellingPrice: parseFloat(e.target.value) })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                          step="0.01"
                        />
                      ) : (
                        <p className="font-semibold text-gray-900">₦{item.sellingPrice.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.discount}
                          onChange={(e) => setEditValues({ ...editValues, discount: parseFloat(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                          step="0.1"
                        />
                      ) : (
                        <p className="text-gray-900">{item.discount}%</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              style={{ width: `${Math.min(item.profitMargin * 5, 100)}%` }}
                            />
                          </div>
                        </div>
                        <p className="font-semibold text-green-600 w-12">{item.profitMargin.toFixed(1)}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <X className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={saveLoading}
                            className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saveLoading}
                            className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit Margin Guide */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">Low Margin (&lt; 5%)</span>
            </div>
            <p className="text-xs text-gray-600">Consider reviewing costs or increasing prices</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">Good Margin (5-15%)</span>
            </div>
            <p className="text-xs text-gray-600">Healthy profit margin for most services</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">High Margin (&gt; 15%)</span>
            </div>
            <p className="text-xs text-gray-600">Excellent profit margin, monitor competition</p>
          </div>
        </div>
      </div>
    </div>
  )
}
