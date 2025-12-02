import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { 
  Plus, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { syncBalances } from './actions'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const vendors = await prisma.vendorConfig.findMany({
    orderBy: { priority: 'desc' },
    include: {
      _count: {
        select: {
          serviceRoutingsPrimary: true,
          dataPlans: true
        }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage API providers, credentials, and service status.
          </p>
        </div>
        <div className="flex gap-3">
          <form action={syncBalances}>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
              <RefreshCw className="h-4 w-4" />
              Sync Balances
            </button>
          </form>
          <Link
            href="/admin/vendors/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <div 
            key={vendor.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                    vendor.isEnabled 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {vendor.vendorName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {vendor.vendorName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono">{vendor.adapterId}</span>
                      <span>•</span>
                      <span className={vendor.isHealthy ? 'text-emerald-600' : 'text-red-600'}>
                        {vendor.isHealthy ? 'Healthy' : 'Issues Detected'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    vendor.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                  }`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100 dark:border-gray-700/50">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(vendor.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Priority</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {vendor.priority}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {vendor.supportsAirtime && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-medium">
                    Airtime
                  </span>
                )}
                {vendor.supportsData && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-medium">
                    Data
                  </span>
                )}
                {vendor.supportsElectric && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs font-medium">
                    Power
                  </span>
                )}
                {vendor.supportsCableTV && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 text-xs font-medium">
                    Cable
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {vendor._count.serviceRoutingsPrimary} active routes
              </div>
              <Link
                href={`/admin/vendors/${vendor.id}`}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1"
              >
                Configure
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}

        {/* Add New Card Placeholder */}
        <Link
          href="/admin/vendors/new"
          className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
        >
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
            <Plus className="h-6 w-6 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Add New Vendor</h3>
          <p className="mt-1 text-xs text-gray-500 text-center">Connect a new API provider</p>
        </Link>
      </div>
    </div>
  )
}
