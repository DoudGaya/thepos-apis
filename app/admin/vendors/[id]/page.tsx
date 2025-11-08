"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface VendorConfig {
  id: string
  vendorName: string
  isEnabled: boolean
  isPrimary: boolean
  priority: number
  supportsAirtime: boolean
  supportsData: boolean
  supportsElectric: boolean
  supportsCableTV: boolean
  supportsBetting: boolean
  supportsEPINS: boolean
  credentials: any
  isHealthy: boolean
  lastHealthCheck: string | null
  failureCount: number
  lastFailure: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminVendorDetailPage() {
  const params = useParams()
  const vendorId = params.id as string
  const [vendor, setVendor] = useState<VendorConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetail()
    }
  }, [vendorId])

  const fetchVendorDetail = async () => {
    try {
      const response = await fetch(`/api/admin/vendors/config/${vendorId}`)
      const result = await response.json()

      if (result.success) {
        setVendor(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch vendor detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateVendorConfig = async (updates: Partial<VendorConfig>) => {
    if (!vendor) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/vendors/config/${vendorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (result.success) {
        setVendor({ ...vendor, ...updates, updatedAt: new Date().toISOString() })
        alert('Vendor configuration updated successfully')
      } else {
        alert('Failed to update vendor configuration')
      }
    } catch (error) {
      console.error('Failed to update vendor:', error)
      alert('Failed to update vendor configuration')
    } finally {
      setUpdating(false)
    }
  }

  const testConnection = async () => {
    setTestResult('Testing connection...')
    try {
      const response = await fetch(`/api/admin/vendors/test/${vendorId}`)
      const result = await response.json()

      if (result.success) {
        setTestResult('✅ Connection successful!')
        fetchVendorDetail() // Refresh health status
      } else {
        setTestResult(`❌ Connection failed: ${result.error}`)
      }
    } catch (error) {
      setTestResult('❌ Connection test failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendor details...</div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="text-center text-red-500">
        Vendor not found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/vendors"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Vendors
          </Link>
          <h1 className="text-2xl font-semibold">{vendor.vendorName}</h1>
          <p className="text-sm text-gray-600">Vendor ID: {vendor.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Test Connection
          </button>
          <button
            onClick={() => updateVendorConfig({ isEnabled: !vendor.isEnabled })}
            disabled={updating}
            className={`px-4 py-2 rounded-md ${
              vendor.isEnabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {updating ? 'Updating...' : (vendor.isEnabled ? 'Disable' : 'Enable')}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg ${
          testResult.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className="text-sm">{testResult}</p>
        </div>
      )}

      {/* Vendor Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Status Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                vendor.isEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {vendor.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Health:</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                vendor.isHealthy
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {vendor.isHealthy ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Primary:</span>
              <span>{vendor.isPrimary ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <span>{vendor.priority}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Health Monitoring</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Check:</span>
              <span className="text-sm">
                {vendor.lastHealthCheck
                  ? format(new Date(vendor.lastHealthCheck), 'MMM dd, HH:mm')
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Failure Count:</span>
              <span className={vendor.failureCount > 0 ? 'text-red-600' : 'text-green-600'}>
                {vendor.failureCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Failure:</span>
              <span className="text-sm">
                {vendor.lastFailure
                  ? format(new Date(vendor.lastFailure), 'MMM dd, HH:mm')
                  : 'None'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Timestamps</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="text-sm">{format(new Date(vendor.createdAt), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Updated:</span>
              <span className="text-sm">{format(new Date(vendor.updatedAt), 'MMM dd, yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Services */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Supported Services</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'supportsAirtime', label: 'Airtime', enabled: vendor.supportsAirtime },
            { key: 'supportsData', label: 'Data', enabled: vendor.supportsData },
            { key: 'supportsElectric', label: 'Electricity', enabled: vendor.supportsElectric },
            { key: 'supportsCableTV', label: 'Cable TV', enabled: vendor.supportsCableTV },
            { key: 'supportsBetting', label: 'Betting', enabled: vendor.supportsBetting },
            { key: 'supportsEPINS', label: 'E-Pins', enabled: vendor.supportsEPINS },
          ].map((service) => (
            <div key={service.key} className="flex items-center justify-between p-3 border border-gray-200 rounded">
              <span className="text-sm font-medium">{service.label}</span>
              <button
                onClick={() => updateVendorConfig({ [service.key]: !service.enabled })}
                disabled={updating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  service.enabled ? 'bg-green-600' : 'bg-gray-200'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    service.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={vendor.priority}
              onChange={(e) => setVendor({ ...vendor, priority: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => updateVendorConfig({ priority: vendor.priority })}
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Priority'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credentials (JSON)
          </label>
          <textarea
            value={JSON.stringify(vendor.credentials, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                setVendor({ ...vendor, credentials: parsed })
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="{}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter vendor API credentials as JSON. Changes are saved automatically.
          </p>
        </div>
      </div>
    </div>
  )
}