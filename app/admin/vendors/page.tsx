"use client"

import React, { useEffect, useState } from 'react'
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
  isHealthy: boolean
  lastHealthCheck: string | null
  failureCount: number
  createdAt: string
  updatedAt: string
}

interface VendorsResponse {
  success: boolean
  data: VendorConfig[]
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      // First try to get vendor configurations from database
      const configResponse = await fetch('/api/admin/vendors/config')
      if (configResponse.ok) {
        const configResult = await configResponse.json()
        if (configResult.success) {
          setVendors(configResult.data)
          setLoading(false)
          return
        }
      }

      // Fallback to monitoring API
      const monitorResponse = await fetch('/api/admin/vendors')
      const monitorResult = await monitorResponse.json()
      if (monitorResult.success) {
        // Transform monitoring data to vendor config format
        const transformedVendors = monitorResult.data.map((vendor: any) => ({
          id: vendor.name.toLowerCase().replace('.', '-'),
          vendorName: vendor.name,
          isEnabled: vendor.status === 'active',
          isPrimary: false,
          priority: 0,
          supportsAirtime: vendor.services?.airtime === 'active',
          supportsData: vendor.services?.data === 'active',
          supportsElectric: vendor.services?.electricity === 'active',
          supportsCableTV: vendor.services?.cable === 'active',
          supportsBetting: vendor.services?.betting === 'active',
          supportsEPINS: vendor.services?.epins === 'active',
          isHealthy: vendor.status === 'active',
          lastHealthCheck: vendor.lastChecked,
          failureCount: vendor.error ? 1 : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        setVendors(transformedVendors)
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVendorStatus = async (vendorId: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/vendors/config/${vendorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled }),
      })

      if (response.ok) {
        setVendors(vendors.map(vendor =>
          vendor.id === vendorId ? { ...vendor, isEnabled } : vendor
        ))
      }
    } catch (error) {
      console.error('Failed to update vendor status:', error)
    }
  }

  const testVendorConnection = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/admin/vendors/test/${vendorId}`)
      const result = await response.json()

      if (result.success) {
        alert('Connection test successful!')
        fetchVendors() // Refresh data
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      alert('Connection test failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendors...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Management</h1>
          <p className="text-sm text-gray-600">Configure and monitor vendor services</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Vendor
          </button>
          <button
            onClick={fetchVendors}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{vendor.vendorName}</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  vendor.isHealthy
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {vendor.isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  vendor.isEnabled
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {vendor.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Priority:</span>
                <span>{vendor.priority}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Primary:</span>
                <span>{vendor.isPrimary ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Check:</span>
                <span>
                  {vendor.lastHealthCheck
                    ? format(new Date(vendor.lastHealthCheck), 'MMM dd, HH:mm')
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Failures:</span>
                <span className={vendor.failureCount > 0 ? 'text-red-600' : 'text-green-600'}>
                  {vendor.failureCount}
                </span>
              </div>
            </div>

            {/* Supported Services */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Supported Services:</p>
              <div className="flex flex-wrap gap-1">
                {vendor.supportsAirtime && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Airtime</span>
                )}
                {vendor.supportsData && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Data</span>
                )}
                {vendor.supportsElectric && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Electricity</span>
                )}
                {vendor.supportsCableTV && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Cable TV</span>
                )}
                {vendor.supportsBetting && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Betting</span>
                )}
                {vendor.supportsEPINS && (
                  <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded">E-Pins</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link
                href={`/admin/vendors/${vendor.id}`}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-center text-sm rounded hover:bg-blue-700"
              >
                Configure
              </Link>
              <button
                onClick={() => toggleVendorStatus(vendor.id, !vendor.isEnabled)}
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  vendor.isEnabled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {vendor.isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => testVendorConnection(vendor.id)}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* System Health Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">System Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.isHealthy).length}
            </div>
            <div className="text-sm text-gray-600">Healthy Vendors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {vendors.filter(v => !v.isHealthy).length}
            </div>
            <div className="text-sm text-gray-600">Unhealthy Vendors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {vendors.filter(v => v.isEnabled).length}
            </div>
            <div className="text-sm text-gray-600">Enabled Vendors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {vendors.filter(v => !v.isEnabled).length}
            </div>
            <div className="text-sm text-gray-600">Disabled Vendors</div>
          </div>
        </div>
      </div>
    </div>
  )
}