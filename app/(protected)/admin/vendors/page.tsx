'use client'

import { useState, useEffect } from 'react'
import { 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Clock,
  Loader2,
  Eye,
  Settings as SettingsIcon,
  Package,
} from 'lucide-react'

interface Vendor {
  id: string
  name: string
  service: string
  status: 'online' | 'offline' | 'maintenance'
  balance: number
  lowBalanceThreshold: number
  lastChecked: string
  responseTime: number
  uptime: number
  transactionsToday: number
  successRate: number
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    setLoading(true)
    // TODO: Replace with real API call
    setTimeout(() => {
      const mockVendors: Vendor[] = [
        {
          id: '1',
          name: 'VTU.NG',
          service: 'Airtime & Data',
          status: 'online',
          balance: 450000,
          lowBalanceThreshold: 100000,
          lastChecked: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          responseTime: 1.2,
          uptime: 99.8,
          transactionsToday: 456,
          successRate: 98.5,
        },
        {
          id: '2',
          name: 'ClubKonnect',
          service: 'Data Plans',
          status: 'online',
          balance: 320000,
          lowBalanceThreshold: 100000,
          lastChecked: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          responseTime: 0.9,
          uptime: 99.9,
          transactionsToday: 234,
          successRate: 99.2,
        },
        {
          id: '3',
          name: 'IKEDC',
          service: 'Electricity',
          status: 'online',
          balance: 0, // Postpaid
          lowBalanceThreshold: 0,
          lastChecked: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          responseTime: 2.5,
          uptime: 97.5,
          transactionsToday: 89,
          successRate: 96.8,
        },
        {
          id: '4',
          name: 'DSTV',
          service: 'Cable TV',
          status: 'online',
          balance: 0, // Postpaid
          lowBalanceThreshold: 0,
          lastChecked: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
          responseTime: 1.8,
          uptime: 98.2,
          transactionsToday: 67,
          successRate: 97.5,
        },
        {
          id: '5',
          name: 'Backup VTU Provider',
          service: 'Airtime & Data',
          status: 'offline',
          balance: 150000,
          lowBalanceThreshold: 100000,
          lastChecked: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          responseTime: 0,
          uptime: 85.0,
          transactionsToday: 0,
          successRate: 92.0,
        },
      ]
      setVendors(mockVendors)
      setLoading(false)
    }, 500)
  }

  const checkVendorStatus = async (vendorId: string) => {
    setChecking(vendorId)
    // TODO: API call to check vendor status
    setTimeout(() => {
      setVendors(prev => prev.map(v => 
        v.id === vendorId 
          ? { ...v, lastChecked: new Date().toISOString(), status: 'online' as const }
          : v
      ))
      setChecking(null)
    }, 1000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Online
          </span>
        )
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" /> Offline
          </span>
        )
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" /> Maintenance
          </span>
        )
      default:
        return null
    }
  }

  const formatTime = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000 / 60)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const stats = {
    totalVendors: vendors.length,
    onlineVendors: vendors.filter(v => v.status === 'online').length,
    avgResponseTime: (vendors.reduce((sum, v) => sum + v.responseTime, 0) / vendors.length).toFixed(1),
    totalBalance: vendors.reduce((sum, v) => sum + v.balance, 0),
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="mt-1 text-gray-600">Monitor API providers and service status</p>
        </div>
        <button 
          onClick={fetchVendors}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh All
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <p className="text-sm text-gray-600">Total Vendors</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalVendors}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Online</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.onlineVendors}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Avg Response</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}s</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Total Balance</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₦{(stats.totalBalance / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  vendor.status === 'online' ? 'bg-green-100' : 
                  vendor.status === 'offline' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <Package className={`w-6 h-6 ${
                    vendor.status === 'online' ? 'text-green-600' : 
                    vendor.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  <p className="text-sm text-gray-500">{vendor.service}</p>
                </div>
              </div>
              {getStatusBadge(vendor.status)}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Balance</p>
                {vendor.balance > 0 ? (
                  <>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{(vendor.balance / 1000).toFixed(0)}K
                    </p>
                    {vendor.balance < vendor.lowBalanceThreshold && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Low balance!
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Postpaid</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Transactions Today</p>
                <p className="text-lg font-bold text-gray-900">{vendor.transactionsToday}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Response Time</p>
                <p className="text-lg font-bold text-gray-900">{vendor.responseTime}s</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Success Rate</p>
                <p className="text-lg font-bold text-green-600">{vendor.successRate}%</p>
              </div>
            </div>

            {/* Uptime Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Uptime</span>
                <span className="text-xs font-semibold text-gray-900">{vendor.uptime}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    vendor.uptime >= 99 ? 'bg-green-500' :
                    vendor.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${vendor.uptime}%` }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <Clock className="w-3 h-3 inline mr-1" />
                Last checked {formatTime(vendor.lastChecked)}
              </div>
              <button
                onClick={() => checkVendorStatus(vendor.id)}
                disabled={checking === vendor.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking === vendor.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Check Status
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* System Recommendations */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Vendor Alerts & Recommendations</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {vendors.filter(v => v.balance > 0 && v.balance < v.lowBalanceThreshold).map(v => (
                <li key={v.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span><strong>{v.name}</strong> has low balance (₦{(v.balance / 1000).toFixed(0)}K). Consider topping up.</span>
                </li>
              ))}
              {vendors.filter(v => v.status === 'offline').map(v => (
                <li key={v.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span><strong>{v.name}</strong> is currently offline. Check API credentials or contact support.</span>
                </li>
              ))}
              {vendors.filter(v => v.uptime < 95).map(v => (
                <li key={v.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span><strong>{v.name}</strong> has low uptime ({v.uptime}%). Monitor for recurring issues.</span>
                </li>
              ))}
              {vendors.every(v => v.status === 'online' && (v.balance === 0 || v.balance > v.lowBalanceThreshold) && v.uptime >= 95) && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">All vendors are operating normally. No action required.</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
