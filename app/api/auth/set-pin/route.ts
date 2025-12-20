/**
 * Set PIN API
 * POST - Set initial transaction PIN (uses authentication)
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'

// PIN validation schema
const setPinSchema = z.object({
  pin: z.string()
    .min(4, 'PIN must be at least 4 digits')
    .max(6, 'PIN must be at most 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
})

/**
 * POST /api/auth/set-pin
 * Set transaction PIN for the first time
 * Body: { pin: "1234" }
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const data = await validateRequestBody(request, setPinSchema) as z.infer<typeof setPinSchema>

  // Check if PIN is already set
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pinHash: true },
  })

  if (dbUser?.pinHash) {
    throw new BadRequestError('PIN is already set. Use update-pin endpoint to change it.')
  }

  // Hash and store the PIN
  const pinHash = await hashPassword(data.pin)

  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  })

  return successResponse(
    { hasPinSet: true },
    'Transaction PIN set successfully'
  )
})
