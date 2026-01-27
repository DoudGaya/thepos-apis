'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vendorService } from '@/lib/vendors'

export async function syncBalances() {
  // Clear adapter cache to force reload with latest environment variables
  vendorService.clearCache()
  
  const vendors = await prisma.vendorConfig.findMany({
    where: { isEnabled: true }
  })

  for (const vendor of vendors) {
    try {
      // Use vendorService which properly loads environment variables for credentials
      const balanceData = await vendorService.getBalance(vendor.adapterId)
      
      await prisma.vendorConfig.update({
        where: { id: vendor.id },
        data: {
          balance: balanceData.balance,
          lastHealthCheck: new Date(),
          isHealthy: true
        }
      })
      
      console.log(`[Admin] Synced balance for ${vendor.vendorName}: ₦${balanceData.balance} from ${vendor.adapterId}`)
    } catch (error) {
      console.error(`Failed to sync balance for ${vendor.vendorName}:`, error)
      await prisma.vendorConfig.update({
        where: { id: vendor.id },
        data: {
          isHealthy: false,
          lastFailure: new Date(),
          failureCount: { increment: 1 }
        }
      })
    }
  }
  
  revalidatePath('/admin/vendors')
}

export async function updateVendor(id: string, formData: FormData) {
  const vendorName = formData.get('vendorName') as string
  const isEnabled = formData.get('isEnabled') === 'on'
  const priority = parseInt(formData.get('priority') as string)
  const supportsAirtime = formData.get('supportsAirtime') === 'on'
  const supportsData = formData.get('supportsData') === 'on'
  const supportsElectric = formData.get('supportsElectric') === 'on'
  const supportsCableTV = formData.get('supportsCableTV') === 'on'
  const credentialsJson = formData.get('credentials') as string

  let credentials
  try {
    credentials = JSON.parse(credentialsJson)
  } catch (e) {
    throw new Error('Invalid JSON credentials')
  }

  await prisma.vendorConfig.update({
    where: { id },
    data: {
      vendorName,
      isEnabled,
      priority,
      supportsAirtime,
      supportsData,
      supportsElectric,
      supportsCableTV,
      credentials
    }
  })

  revalidatePath('/admin/vendors')
  revalidatePath(`/admin/vendors/${id}`)
}

export async function createVendor(formData: FormData) {
  const vendorName = formData.get('vendorName') as string
  const adapterId = formData.get('adapterId') as string
  const isEnabled = formData.get('isEnabled') === 'on'
  const priority = parseInt(formData.get('priority') as string)
  const supportsAirtime = formData.get('supportsAirtime') === 'on'
  const supportsData = formData.get('supportsData') === 'on'
  const supportsElectric = formData.get('supportsElectric') === 'on'
  const supportsCableTV = formData.get('supportsCableTV') === 'on'
  const credentialsJson = formData.get('credentials') as string

  let credentials
  try {
    credentials = JSON.parse(credentialsJson)
  } catch (e) {
    throw new Error('Invalid JSON credentials')
  }

  await prisma.vendorConfig.create({
    data: {
      vendorName,
      adapterId,
      isEnabled,
      priority,
      supportsAirtime,
      supportsData,
      supportsElectric,
      supportsCableTV,
      credentials
    }
  })

  revalidatePath('/admin/vendors')
  redirect('/admin/vendors')
}
