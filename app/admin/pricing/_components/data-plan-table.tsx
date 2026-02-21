'use client'

import { useState } from 'react'
import { updateDataPlan } from '../actions'
import { Loader2, Search, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DataPlanItem {
  id: string
  network: string
  planType: string
  size: string
  validity: string
  costPrice: number
  sellingPrice: number
  isActive: boolean
  vendor: {
    vendorName: string
  }
}

const PLAN_TYPES = ['ALL', 'SME', 'GIFTING', 'CG', 'DATA COUPON']

export default function DataPlanTable({ items }: { items: DataPlanItem[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [networkFilter, setNetworkFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('ALL')

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.size.toLowerCase().includes(search.toLowerCase()) ||
      item.planType.toLowerCase().includes(search.toLowerCase())
    const matchesNetwork = networkFilter === 'ALL' || item.network === networkFilter
    const matchesTab = activeTab === 'ALL' || 
      (activeTab === 'SME' && item.planType === 'SME') ||
      (activeTab === 'GIFTING' && item.planType === 'GIFTING') ||
      (activeTab === 'CG' && (item.planType === 'CG' || item.planType === 'CORPORATE GIFTING')) ||
      (activeTab === 'DATA COUPON' && item.planType === 'DATA COUPON')
    
    return matchesSearch && matchesNetwork && matchesTab
  })

  const networks = Array.from(new Set(items.map(i => i.network))).sort()

  const handleUpdate = async (id: string, field: 'price' | 'active', value: any) => {
    setLoading(id)
    const item = items.find(i => i.id === id)
    if (!item) return

    const price = field === 'price' ? parseFloat(value) : item.sellingPrice
    const active = field === 'active' ? value : item.isActive

    try {
      await updateDataPlan(id, price, active)
    } catch (error) {
      console.error('Failed to update plan', error)
      alert('Failed to update plan')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {PLAN_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === type
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {type === 'CG' ? 'Corporate' : type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans (e.g. 1GB)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          >
            <option value="ALL">All Networks</option>
            {networks.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Network</th>
                <th className="px-6 py-4">Plan Details</th>
                <th className="px-6 py-4 hidden sm:table-cell">Vendor</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Selling Price</th>
                <th className="px-6 py-4 text-right hidden sm:table-cell">Profit</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${item.network === 'MTN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' : ''}
                      ${item.network === 'GLO' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500' : ''}
                      ${item.network === 'AIRTEL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500' : ''}
                      ${item.network === '9MOBILE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500' : ''}
                    `}>
                      {item.network}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{item.size}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.planType} • {item.validity}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {item.vendor.vendorName}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-right">
                    {formatCurrency(item.costPrice)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-400 text-xs">₦</span>
                      <input
                        type="number"
                        defaultValue={item.sellingPrice}
                        onBlur={(e) => handleUpdate(item.id, 'price', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-right"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell">
                    <span className={`font-mono font-medium ${
                      item.sellingPrice - item.costPrice > 0 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(item.sellingPrice - item.costPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer justify-center">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) => handleUpdate(item.id, 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {loading === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600 ml-auto" />
                    ) : (
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Saved</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search className="h-8 w-8 mb-2 text-gray-400" />
                      <p className="font-medium">No plans found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-4">
        Showing {filteredItems.length} of {items.length} total plans
      </div>
    </div>
  )
}
