/**
 * Check PIN Status API
 * GET - Check if user has a PIN set
 */

import { apiHandler, successResponse, getAuthenticatedUser } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/check-pin
 * Check if user has a PIN set
 */
export const GET = apiHandler(async () => {
  const user = await getAuthenticatedUser()
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pinHash: true },
  })

  return successResponse({
    hasPinSet: !!dbUser?.pinHash,
  })
})
