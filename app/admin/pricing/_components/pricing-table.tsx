'use client'

import { useState } from 'react'
import { updatePricing } from '../actions'
import { Save, Loader2 } from 'lucide-react'

interface PricingItem {
  id: string
  service: string
  network: string
  profitMargin: number
  isActive: boolean
}

export default function PricingTable({ items }: { items: PricingItem[] }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpdate = async (id: string, field: 'margin' | 'active', value: any) => {
    setLoading(id)
    const item = items.find(i => i.id === id)
    if (!item) return

    const margin = field === 'margin' ? parseFloat(value) : item.profitMargin
    const active = field === 'active' ? value : item.isActive

    try {
      await updatePricing(id, margin, active)
    } catch (error) {
      console.error('Failed to update pricing', error)
      alert('Failed to update pricing')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4">Network</th>
              <th className="px-6 py-4">Profit Margin (%)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {item.service}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {item.network}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={item.profitMargin}
                      onBlur={(e) => handleUpdate(item.id, 'margin', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
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
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No general pricing rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
