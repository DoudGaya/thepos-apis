/**
 * Data Plans API
 * GET - Fetch available data plans for a network
 */

import {
  apiHandler,
  successResponse,
  parseQueryParams,
  BadRequestError,
} from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { parseDataSizeToMb } from '@/lib/utils'
import { withCache, redis } from '@/lib/redis'

const CACHE_TTL = 60 * 15 // 15 minutes

const VALID_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const

/**
 * GET /api/data/plans?network=MTN
 * Fetch data plans for a specific network
 * Prioritizes AMIGO plans and uses dynamic database pricing
 */
export const GET = apiHandler(async (request: Request) => {
  const params = parseQueryParams(request.url)
  const network = params.getString('network')?.toUpperCase()
  const shouldSync = params.getBoolean('sync')

  if (shouldSync) {
    try {
      console.log('[API] Syncing plans from VTPASS...')
      const { vendorService } = await import('@/lib/vendors/index')
      await vendorService.syncPlans('VTPASS')
      console.log('[API] Plan sync complete')
      // Bust Redis cache for all networks so fresh data is served
      await Promise.allSettled(
        VALID_NETWORKS.map(n => redis?.del(`data:plans:${n}`))
      )
      console.log('[API] Redis cache busted after sync')
    } catch (error) {
       console.error('[API] Plan sync failed:', error)
       // Continue to return existing plans even if sync fails
    }
  }

  if (!network || !VALID_NETWORKS.includes(network as any)) {
    throw new BadRequestError('Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE')
  }

  const cacheKey = `data:plans:${network}`

  const { disabled, plans: formattedPlans } = await withCache(
    cacheKey,
    async () => {
      // Check if DATA service is enabled for this network in Pricing table
      const pricing = await prisma.pricing.findFirst({
        where: {
          service: 'DATA',
          network: network,
        },
      })

      // If service is globally disabled, short-circuit and cache the disabled state
      if (pricing && !pricing.isActive) {
        return { disabled: true, plans: [] }
      }

      // Get Service Routing to determine Primary Vendor for this network
      const routing = await prisma.serviceRouting.findFirst({
        where: {
          serviceType: 'DATA',
          network: network,
          isActive: true,
        },
        include: {
          primaryVendor: true,
        }
      })

      // Fetch active plans from database
      // Also filter by Vendor status - if vendor is disabled, don't show plans
      const dbPlans = await prisma.dataPlan.findMany({
        where: {
          network,
          isActive: true,
          vendor: {
            isEnabled: true,
          }
        },
        include: {
          vendor: true,
        },
        orderBy: {
          sellingPrice: 'asc',
        },
      })

      // Start with manual sorting to prioritize Primary Vendor
      const sortedPlans = dbPlans.sort((a, b) => {
        // Check dynamic routing first
        if (routing?.primaryVendor) {
          const isPrimaryA = a.vendor.adapterId === routing.primaryVendor.adapterId
          const isPrimaryB = b.vendor.adapterId === routing.primaryVendor.adapterId
          
          if (isPrimaryA && !isPrimaryB) return -1
          if (!isPrimaryA && isPrimaryB) return 1
        }

        // Fallback to global primary status if no specific routing
        const isPriorityA = a.vendor.isPrimary || a.vendor.adapterId === 'SUBANDGAIN'
        const isPriorityB = b.vendor.isPrimary || b.vendor.adapterId === 'SUBANDGAIN'

        if (isPriorityA && !isPriorityB) return -1
        if (!isPriorityA && isPriorityB) return 1
        
        return a.sellingPrice - b.sellingPrice
      })

      // Deduplicate: show only ONE plan per unique (Size + Type + Validity)
      // Preference: Primary Vendor > Cheapest Price (sort order already ensures this)
      const uniquePlanMap = new Map<string, typeof dbPlans[0]>()

      for (const plan of sortedPlans) {
        const pType = plan.planType || 'ALL'
        const key = `${plan.size}-${pType}-${plan.validity}`
        if (!uniquePlanMap.has(key)) {
          uniquePlanMap.set(key, plan)
        }
      }

      const uniquePlans = Array.from(uniquePlanMap.values())

      // Map to frontend expected format
      const plans = uniquePlans.map(plan => {
        const dataCapacity = parseDataSizeToMb(plan.size)
        const profit = plan.sellingPrice - plan.costPrice

        return {
          id: plan.id,
          name: plan.size,
          network: plan.network,
          costPrice: plan.costPrice,
          sellingPrice: plan.sellingPrice,
          profit,
          validity: plan.validity,
          description: `${plan.validity} plan via ${plan.vendor.vendorName}`,
          planType: plan.planType,
          dataCapacity,
          isAvailable: plan.isActive,
          vendorName: plan.vendor.vendorName,
          isPriority: (routing?.primaryVendor && plan.vendor.adapterId === routing.primaryVendor.adapterId) || 
                      plan.vendor.isPrimary || 
                      plan.vendor.adapterId === 'SUBANDGAIN'
        }
      })

      return { disabled: false, plans }
    },
    CACHE_TTL
  )

  if (disabled) {
    return successResponse([])
  }

  return successResponse({
    network,
    plans: formattedPlans,
    count: formattedPlans.length,
    source: 'cache'
  })
})
