'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { TransactionType } from '@prisma/client'

export async function updateRouting(
  id: string, 
  primaryVendorId: string, 
  fallbackVendorId?: string
) {
  await prisma.serviceRouting.update({
    where: { id },
    data: {
      primaryVendorId,
      fallbackVendorId: fallbackVendorId || null
    }
  })

  revalidatePath('/admin/routing')
}

export async function createRouting(
  serviceType: TransactionType,
  network: string,
  primaryVendorId: string,
  fallbackVendorId?: string
) {
  await prisma.serviceRouting.create({
    data: {
      serviceType,
      network,
      primaryVendorId,
      fallbackVendorId: fallbackVendorId || null
    }
  })

  revalidatePath('/admin/routing')
}
