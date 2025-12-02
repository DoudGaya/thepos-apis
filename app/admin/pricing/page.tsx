import { prisma } from '@/lib/prisma'
import PricingTable from './_components/pricing-table'
import DataPlanTable from './_components/data-plan-table'
import { Tags, Database, Zap, RefreshCw } from 'lucide-react'
import { syncDataPlans, initializePricingDefaults } from './actions'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const [pricingItems, dataPlans] = await Promise.all([
    prisma.pricing.findMany({
      orderBy: [
        { service: 'asc' },
        { network: 'asc' }
      ]
    }),
    prisma.dataPlan.findMany({
      orderBy: [
        { network: 'asc' },
        { sellingPrice: 'asc' }
      ],
      include: {
        vendor: {
          select: {
            vendorName: true
          }
        }
      }
    })
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Pricing & Plans
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage profit margins for general services and set prices for specific data plans.
        </p>
      </div>

      {/* General Services Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2>General Services (Airtime, Cable, etc.)</h2>
          </div>
          <form action={initializePricingDefaults}>
            <button type="submit" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              Initialize Defaults
            </button>
          </form>
        </div>
        <p className="text-sm text-gray-500">
          Set the percentage profit margin for services that don't have fixed plans.
        </p>
        <PricingTable items={pricingItems} />
      </section>

      {/* Data Plans Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Database className="h-5 w-5 text-blue-500" />
            <h2>Data Plans</h2>
          </div>
          <form action={syncDataPlans}>
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Plans
            </button>
          </form>
        </div>
        <p className="text-sm text-gray-500">
          Configure selling prices for specific data bundles.
        </p>
        <DataPlanTable items={dataPlans} />
      </section>
    </div>
  )
}
