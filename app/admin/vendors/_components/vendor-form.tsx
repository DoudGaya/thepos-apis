'use client'

import { useState } from 'react'
import { updateVendor, createVendor } from '../actions'
import { useRouter } from 'next/navigation'
import { Save, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface VendorFormProps {
  vendor?: any
  isNew?: boolean
}

export default function VendorForm({ vendor, isNew = false }: VendorFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    try {
      if (isNew) {
        await createVendor(formData)
      } else {
        await updateVendor(vendor.id, formData)
      }
      // If not new, we might want to show a success message
      if (!isNew) {
        alert('Vendor updated successfully')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/vendors"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isNew ? 'Add New Vendor' : `Edit ${vendor.vendorName}`}
            </h1>
            <p className="text-sm text-gray-500">
              {isNew ? 'Configure a new API provider' : `ID: ${vendor.id}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Configuration</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  name="vendorName"
                  defaultValue={vendor?.vendorName}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adapter ID
                </label>
                <input
                  type="text"
                  name="adapterId"
                  defaultValue={vendor?.adapterId}
                  required
                  readOnly={!isNew}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${!isNew ? 'bg-gray-50 dark:bg-gray-900 text-gray-500' : ''}`}
                />
                {isNew && <p className="mt-1 text-xs text-gray-500">Must match a registered adapter (e.g., AMIGO, VTU_NG)</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  name="priority"
                  defaultValue={vendor?.priority ?? 0}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Higher number = higher priority for routing</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <input
                type="checkbox"
                name="isEnabled"
                defaultChecked={vendor?.isEnabled ?? true}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  Enable Vendor
                </label>
                <p className="text-xs text-gray-500">
                  If disabled, this vendor will not be selected for any transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Credentials</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                JSON Configuration
              </label>
              <textarea
                name="credentials"
                defaultValue={vendor?.credentials ? JSON.stringify(vendor.credentials, null, 2) : '{}'}
                rows={10}
                className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the API keys and other configuration required by the adapter in JSON format.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Capabilities */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Capabilities</h2>
            
            <div className="space-y-3">
              {[
                { name: 'supportsAirtime', label: 'Airtime Top-up' },
                { name: 'supportsData', label: 'Data Bundles' },
                { name: 'supportsElectric', label: 'Electricity Bills' },
                { name: 'supportsCableTV', label: 'Cable TV' },
              ].map((cap) => (
                <div key={cap.name} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name={cap.name}
                    defaultChecked={vendor?.[cap.name] ?? false}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    {cap.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Info (Read Only) */}
          {!isNew && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Status</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Health Status</span>
                  <span className={vendor.isHealthy ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {vendor.isHealthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Check</span>
                  <span className="text-gray-900 dark:text-white">
                    {vendor.lastHealthCheck ? new Date(vendor.lastHealthCheck).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Failure Count</span>
                  <span className="text-gray-900 dark:text-white">{vendor.failureCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Wallet Balance</span>
                  <span className="text-gray-900 dark:text-white font-mono">
                    ₦{vendor.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
