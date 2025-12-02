'use client'

import { useState } from 'react'
import { updateRouting } from '../actions'
import { Save, AlertCircle } from 'lucide-react'

interface Vendor {
  id: string
  vendorName: string
  isEnabled: boolean
}

interface RoutingRule {
  id: string
  serviceType: string
  network: string
  primaryVendorId: string
  fallbackVendorId: string | null
}

interface RoutingTableProps {
  routings: RoutingRule[]
  vendors: Vendor[]
}

export default function RoutingTable({ routings, vendors }: RoutingTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpdate = async (id: string, field: 'primary' | 'fallback', value: string) => {
    setLoading(id)
    const rule = routings.find(r => r.id === id)
    if (!rule) return

    const primaryId = field === 'primary' ? value : rule.primaryVendorId
    const fallbackId = field === 'fallback' ? (value === 'none' ? undefined : value) : rule.fallbackVendorId

    try {
      await updateRouting(id, primaryId, fallbackId || undefined)
    } catch (error) {
      console.error('Failed to update routing', error)
      alert('Failed to update routing')
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
              <th className="px-6 py-4">Network/Provider</th>
              <th className="px-6 py-4">Primary Vendor</th>
              <th className="px-6 py-4">Fallback Vendor</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {routings.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {rule.serviceType}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {rule.network}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={rule.primaryVendorId}
                    onChange={(e) => handleUpdate(rule.id, 'primary', e.target.value)}
                    disabled={loading === rule.id}
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorName} {!v.isEnabled && '(Disabled)'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={rule.fallbackVendorId || 'none'}
                    onChange={(e) => handleUpdate(rule.id, 'fallback', e.target.value)}
                    disabled={loading === rule.id}
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                  >
                    <option value="none">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorName} {!v.isEnabled && '(Disabled)'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  {loading === rule.id ? (
                    <span className="text-emerald-600 animate-pulse">Saving...</span>
                  ) : (
                    <span className="text-gray-400">Saved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
