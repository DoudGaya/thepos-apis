'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ADAPTER_REGISTRY } from '@/lib/vendors/registry'
import { NetworkType } from '@/lib/vendors/adapter.interface'

const NETWORKS: NetworkType[] = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']

export async function syncDataPlans() {
  const vendors = await prisma.vendorConfig.findMany({
    where: { 
      isEnabled: true,
      supportsData: true
    }
  })

  let totalSynced = 0

  for (const vendor of vendors) {
    const AdapterClass = ADAPTER_REGISTRY[vendor.adapterId]
    if (!AdapterClass) continue

    // @ts-ignore
    const adapter = new AdapterClass(vendor.credentials)

    for (const network of NETWORKS) {
      try {
        const plans = await adapter.getPlans('DATA', network)
        
        for (const plan of plans) {
          // Infer plan type from name
          let planType = 'SME'
          const nameLower = plan.name.toLowerCase()
          if (nameLower.includes('gifting') || nameLower.includes('direct')) planType = 'GIFTING'
          if (nameLower.includes('corporate') || nameLower.includes('cg')) planType = 'CG'

          await prisma.dataPlan.upsert({
            where: {
              vendorId_planId: {
                vendorId: vendor.id,
                planId: plan.id
              }
            },
            update: {
              costPrice: plan.price,
              isActive: plan.isAvailable,
            },
            create: {
              planId: plan.id,
              network: plan.network,
              planType: planType,
              size: plan.name,
              validity: plan.validity || '30 Days',
              vendorId: vendor.id,
              costPrice: plan.price,
              sellingPrice: plan.price * 1.05, // Default 5% margin
              isActive: plan.isAvailable
            }
          })
          totalSynced++
        }
      } catch (error) {
        console.error(`Failed to sync ${network} plans for ${vendor.vendorName}:`, error)
      }
    }
  }

  revalidatePath('/admin/pricing')
}

export async function initializePricingDefaults() {
  const defaults = [
    { service: 'AIRTIME', network: 'MTN' },
    { service: 'AIRTIME', network: 'GLO' },
    { service: 'AIRTIME', network: 'AIRTEL' },
    { service: 'AIRTIME', network: '9MOBILE' },
    { service: 'CABLE_TV', network: 'DSTV' },
    { service: 'CABLE_TV', network: 'GOTV' },
    { service: 'CABLE_TV', network: 'STARTIMES' },
    { service: 'ELECTRICITY', network: 'ALL' },
  ]
  
  for (const item of defaults) {
    await prisma.pricing.upsert({
      where: {
        service_network: {
          service: item.service,
          network: item.network
        }
      },
      update: {},
      create: {
        service: item.service,
        network: item.network,
        profitMargin: 2.5
      }
    })
  }
  revalidatePath('/admin/pricing')
}

export async function updatePricing(id: string, profitMargin: number, isActive: boolean) {
  await prisma.pricing.update({
    where: { id },
    data: {
      profitMargin,
      isActive
    }
  })
  revalidatePath('/admin/pricing')
}

export async function updateDataPlan(id: string, sellingPrice: number, isActive: boolean) {
  await prisma.dataPlan.update({
    where: { id },
    data: {
      sellingPrice,
      isActive
    }
  })
  revalidatePath('/admin/pricing')
}
