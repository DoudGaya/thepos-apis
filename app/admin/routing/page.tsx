import { prisma } from '@/lib/prisma'
import RoutingTable from './_components/routing-table'
import { ArrowLeftRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RoutingPage() {
  const [routings, vendors] = await Promise.all([
    prisma.serviceRouting.findMany({
      orderBy: [
        { serviceType: 'asc' },
        { network: 'asc' }
      ]
    }),
    prisma.vendorConfig.findMany({
      orderBy: { priority: 'desc' },
      select: {
        id: true,
        vendorName: true,
        isEnabled: true
      }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Service Routing
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure which vendor handles each service and network.
        </p>
      </div>

      <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm">
        <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />
        <p>
          The system will automatically failover to the fallback vendor if the primary vendor is down or returns an error.
        </p>
      </div>

      <RoutingTable routings={routings} vendors={vendors} />
    </div>
  )
}
