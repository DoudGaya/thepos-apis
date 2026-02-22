import { vendorService } from '@/lib/vendors'
import { z } from 'zod'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'

// Normalize any electricity provider string to the VTPass key (e.g. 'ikeja_electric' → 'IKEJA')
function normalizeElectricityProvider(raw: string): string {
  const s = raw.toUpperCase().replace(/[\s_-]+/g, '')
  if (s.includes('IKEJA') || s.includes('IKEDC')) return 'IKEJA'
  if (s.includes('EKO') || s.includes('EKEDC')) return 'EKO'
  if (s.includes('ABUJA') || s.includes('AEDC')) return 'ABUJA'
  if (s.includes('KANO') || s.includes('KEDCO') || s.includes('KAEDCO')) return 'KANO'
  if (s.includes('PORTHARCOURT') || s.includes('HARCOURT') || s.includes('PHED')) return 'PORTHARCOURT'
  if (s.includes('JOS') || s.includes('JED')) return 'JOS'
  if (s.includes('IBADAN') || s.includes('IBEDC')) return 'IBADAN'
  if (s.includes('KADUNA')) return 'KADUNA'
  if (s.includes('ENUGU') || s.includes('EEDC')) return 'ENUGU'
  if (s.includes('BENIN') || s.includes('BEDC')) return 'BENIN'
  if (s.includes('ABA')) return 'ABA'
  if (s.includes('YOLA') || s.includes('YEDC')) return 'YOLA'
  return s
}

const verifySchema = z.object({
  // Accept both field names for backwards compatibility (disco = old web, provider = mobile app)
  disco: z.string().optional(),
  provider: z.string().optional(),
  meterNumber: z.string().min(10, 'Invalid meter number'),
  meterType: z.enum(['PREPAID', 'POSTPAID', 'prepaid', 'postpaid']).default('prepaid'),
}).refine(d => d.disco || d.provider, { message: 'disco or provider is required' })

export const POST = apiHandler(async (req: Request) => {
  await getAuthenticatedUser(req) // validates Bearer token OR NextAuth session

  const body = await validateRequestBody(req, verifySchema)
  const { disco, provider, meterNumber, meterType } = body as z.infer<typeof verifySchema>

  const vtpassProvider = normalizeElectricityProvider(disco || provider || '')

  const result = await vendorService.verifyCustomer({
    customerId: meterNumber,
    serviceProvider: vtpassProvider,
    meterType: meterType.toUpperCase() as 'PREPAID' | 'POSTPAID',
    service: 'ELECTRICITY',
  })

  if (!result.isValid) {
    throw new BadRequestError(result.metadata?.error || 'Meter verification failed')
  }

  // Map to snake_case to match the mobile app's ElectricityVerification interface
  return successResponse({
    customer_name: result.customerName || result.metadata?.Customer_Name || result.metadata?.customerName || 'Unknown',
    customer_address: result.address || result.metadata?.Address || result.metadata?.address,
    meter_number: meterNumber,
    customer_arrears: result.metadata?.Arrears || result.metadata?.arrears,
    min_purchase_amount: result.metadata?.minimumAmount || result.metadata?.MinimumAmount,
    max_purchase_amount: result.metadata?.maximumAmount || result.metadata?.MaximumAmount,
  }, 'Meter verified successfully')
})
