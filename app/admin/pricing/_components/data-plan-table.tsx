'use client'

import { useState } from 'react'
import { updateDataPlan } from '../actions'
import { Loader2, Search } from 'lucide-react'
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

export default function DataPlanTable({ items }: { items: DataPlanItem[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [networkFilter, setNetworkFilter] = useState('ALL')

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.size.toLowerCase().includes(search.toLowerCase()) ||
      item.planType.toLowerCase().includes(search.toLowerCase())
    const matchesNetwork = networkFilter === 'ALL' || item.network === networkFilter
    return matchesSearch && matchesNetwork
  })

  const networks = Array.from(new Set(items.map(i => i.network)))

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={networkFilter}
          onChange={(e) => setNetworkFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="ALL">All Networks</option>
          {networks.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Network</th>
                <th className="px-6 py-4">Plan Details</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Cost Price</th>
                <th className="px-6 py-4">Selling Price</th>
                <th className="px-6 py-4">Profit</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {item.network}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.size}</div>
                    <div className="text-xs text-gray-500">{item.planType} • {item.validity}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {item.vendor.vendorName}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                    {formatCurrency(item.costPrice)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">₦</span>
                      <input
                        type="number"
                        defaultValue={item.sellingPrice}
                        onBlur={(e) => handleUpdate(item.id, 'price', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-medium ${
                      item.sellingPrice - item.costPrice > 0 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(item.sellingPrice - item.costPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) => handleUpdate(item.id, 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {loading === item.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600 ml-auto" />
                    ) : (
                      <span className="text-xs text-gray-400">Saved</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No data plans found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
