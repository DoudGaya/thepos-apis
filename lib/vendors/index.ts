import { prisma } from '@/lib/prisma'
import { parseDataSizeToMb } from '@/lib/utils'
import { ADAPTER_REGISTRY } from './registry'
import {
  VendorAdapter,
  VendorName,
  ServiceType,
  NetworkType,
  WalletBalance,
  ServicePlan,
  PurchasePayload,
  VendorPurchaseResponse,
  TransactionStatus,
  VerifyCustomerPayload,
  CustomerVerification,
  VendorError,
} from './adapter.interface'

export class VendorService {
  private adapterCache: Map<string, VendorAdapter> = new Map()

  /**
   * Code-enforced primary vendor per service type.
   * Takes precedence over the global DB `isPrimary` flag but yields to
   * explicit ServiceRouting table entries (per-service/network overrides).
   */
  private static readonly SERVICE_PRIMARY_VENDOR: Partial<Record<ServiceType, string>> = {
    AIRTIME:     'VTPASS',
    ELECTRICITY: 'VTPASS',
    CABLE:       'VTPASS',
    CABLE_TV:    'VTPASS',
  }

  /**
   * Clear the adapter cache (useful when credentials change)
   */
  clearCache(adapterId?: string) {
    if (adapterId) {
      this.adapterCache.delete(adapterId)
      console.log(`[VendorService] Cleared cache for ${adapterId}`)
    } else {
      this.adapterCache.clear()
      console.log('[VendorService] Cleared all adapter cache')
    }
  }

  /**
   * Get or instantiate an adapter by ID
   */
  private async getAdapter(adapterId: string): Promise<VendorAdapter> {
    if (this.adapterCache.has(adapterId)) {
      return this.adapterCache.get(adapterId)!
    }

    const config = await prisma.vendorConfig.findUnique({
      where: { adapterId },
    })

    if (!config || !config.isEnabled) {
      throw new Error(`Vendor ${adapterId} is not configured or disabled`)
    }

    const AdapterClass = ADAPTER_REGISTRY[adapterId]
    if (!AdapterClass) {
      throw new Error(`Adapter class for ${adapterId} not found in registry`)
    }

    // Build credentials - merge database config with environment overrides
    const credentials = this.buildCredentials(adapterId, config.credentials)

    // Instantiate with merged credentials
    const adapter = new AdapterClass(credentials)
    this.adapterCache.set(adapterId, adapter)
    return adapter
  }

  /**
   * Build credentials from database and environment variables
   * Environment variables take precedence for sensitive data
   */
  private buildCredentials(adapterId: string, dbCredentials: any): any {
    console.log(`[VendorService] Building credentials for ${adapterId}`)

    // For VTPASS, load from environment variables and ensure production mode
    if (adapterId === 'VTPASS') {
      const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true'
      const credentials = {
        apiKey: process.env.VTPASS_API_KEY || dbCredentials?.apiKey,
        publicKey: process.env.VTPASS_PUBLIC_KEY || dbCredentials?.publicKey,
        secretKey: process.env.VTPASS_SECRET_KEY || dbCredentials?.secretKey,
        useSandbox, // Default to false (production) if not set
      }
      console.log(`[VendorService] VTPASS - useSandbox: ${useSandbox}, env: "${process.env.VTPASS_USE_SANDBOX}"`)
      return credentials
    }

    // For AMIGO
    if (adapterId === 'AMIGO') {
      return {
        apiToken: process.env.AMIGO_API_TOKEN || dbCredentials?.apiToken,
        baseUrl: process.env.AMIGO_BASE_URL || dbCredentials?.baseUrl || 'https://amigo.ng/api',
      }
    }

    // For SUBANDGAIN
    if (adapterId === 'SUBANDGAIN') {
      return {
        username: process.env.SUBANDGAIN_USERNAME || dbCredentials?.username,
        apiKey: process.env.SUBANDGAIN_API_KEY || dbCredentials?.apiKey,
      }
    }

    // For EBILLS
    if (adapterId === 'EBILLS') {
      return {
        username: process.env.EBILLS_USERNAME || dbCredentials?.username,
        password: process.env.EBILLS_PASSWORD || dbCredentials?.password,
      }
    }

    // For MONNIFY (bills/VAS — reuses same credentials as Virtual Account module)
    if (adapterId === 'MONNIFY') {
      return {
        apiKey: process.env.MONNIFY_API_KEY || dbCredentials?.apiKey,
        secretKey: process.env.MONNIFY_SECRET_KEY || dbCredentials?.secretKey,
        baseUrl: process.env.MONNIFY_BASE_URL || dbCredentials?.baseUrl || 'https://sandbox.monnify.com',
      }
    }


    // For other vendors, use database credentials as-is
    return dbCredentials || {}
  }

  /**
   * Get the best vendor for a service/network based on routing rules.
   * Priority: SERVICE_PRIMARY_VENDOR (code) > ServiceRouting (DB) > Global DB primary > hardcoded defaults
   */
  private async getBestVendor(service: ServiceType, network?: NetworkType): Promise<VendorAdapter> {
    // 1. Code-enforced primary vendor — always wins for pinned services
    const preferredAdapterId = VendorService.SERVICE_PRIMARY_VENDOR[service]
    if (preferredAdapterId) {
      try {
        const preferred = await this.getAdapter(preferredAdapterId)
        console.log(`[VendorService] Using service-preferred vendor ${preferredAdapterId} for ${service}`)
        return preferred
      } catch (e) {
        console.warn(`[VendorService] Preferred vendor ${preferredAdapterId} unavailable for ${service}, falling back to routing`)
      }
    }

    // 2. Check ServiceRouting (DB per-service/network overrides)
    if (network) {
      const routing = await prisma.serviceRouting.findUnique({
        where: {
          serviceType_network: {
            serviceType: service as any,
            network: network,
          },
        },
        include: {
          primaryVendor: true,
          fallbackVendor: true,
        },
      })

      if (routing && routing.isActive) {
        // Try Primary
        if (routing.primaryVendor && routing.primaryVendor.isEnabled) {
          try {
            return await this.getAdapter(routing.primaryVendor.adapterId)
          } catch (e) {
            console.warn(`Primary vendor ${routing.primaryVendor.adapterId} failed init, trying fallback`)
          }
        }

        // Try Fallback
        if (routing.fallbackVendor && routing.fallbackVendor.isEnabled) {
          return await this.getAdapter(routing.fallbackVendor.adapterId)
        }
      }
    }

    // 3. Check Global Primary Vendor (if enabled and supports service)
    const primaryVendor = await prisma.vendorConfig.findFirst({
      where: {
        isPrimary: true,
        isEnabled: true,
      },
      orderBy: { priority: 'desc' }
    })

    if (primaryVendor) {
      let supported = false
      if (service === 'DATA' && primaryVendor.supportsData) supported = true
      if (service === 'AIRTIME' && primaryVendor.supportsAirtime) supported = true
      // Handle alias for Cable TV
      if ((service === 'CABLE' || service === 'CABLE_TV') && primaryVendor.supportsCableTV) supported = true
      if (service === 'ELECTRICITY' && primaryVendor.supportsElectric) supported = true
      if (service === 'BETTING' && primaryVendor.supportsBetting) supported = true
      if (service === 'EPINS' && primaryVendor.supportsEPINS) supported = true
      // EDUCATION maps to EPINS support flag (same category in the schema)
      if (service === 'EDUCATION' && primaryVendor.supportsEPINS) supported = true

      if (supported) {
        try {
          return await this.getAdapter(primaryVendor.adapterId)
        } catch (e) {
          console.warn(`Global primary vendor ${primaryVendor.adapterId} failed init, falling back to defaults`)
        }
      }
    }

    // 4. Fallback defaults if no routing found
    if (service === 'DATA') return this.getAdapter('SUBANDGAIN')
    if (service === 'AIRTIME') return this.getAdapter('VTPASS')
    if (service === 'ELECTRICITY') return this.getAdapter('VTPASS')
    if (service === 'CABLE' || service === 'CABLE_TV') return this.getAdapter('VTPASS')
    if (service === 'EDUCATION' || service === 'EPINS') return this.getAdapter('VTPASS')

    // Last resort: Try to find any enabled vendor that supports the service
    // (This part is tricky without querying all vendors, so we'll just throw for now)
    throw new Error(`No vendor configured for ${service} ${network || ''}`)
  }

  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    try {
      let adapter: VendorAdapter
      
      // If target vendor specified (e.g. from plan details), use it
      if (payload.targetVendor) {
        try {
            adapter = await this.getAdapter(payload.targetVendor)
            // Verify vendor is enabled? getAdapter handles this? No.
            // But if we're forcing it, maybe we want to bypass availability check? 
            // Or maybe check if enabled first?
            // Let's rely on the caller (purchaseService) to have picked a valid vendor plan.
        } catch (e: any) {
             console.warn(`Target vendor ${payload.targetVendor} failed init, falling back to best vendor logic`)
             adapter = await this.getBestVendor(payload.service, payload.network)
        }
      } else {
        adapter = await this.getBestVendor(payload.service, payload.network)
      }

      return await adapter.buyService(payload)
    } catch (error: any) {
      // If primary failed, we might want to try fallback here if getBestVendor didn't already?
      // For now, getBestVendor selects the vendor. If the *call* fails, we should handle failover.
      // But implementing full failover logic here requires re-querying routing.
      // Let's keep it simple: The PurchaseService handles the high-level flow.
      // Actually, the previous implementation handled failover inside buyService.
      // Let's try to implement simple failover here.

      console.error(`Purchase failed: ${error.message}`)
      throw error
    }
  }

  async getBalance(vendorName?: string): Promise<WalletBalance & { vendor: string }> {
    if (vendorName) {
      const adapter = await this.getAdapter(vendorName)
      const balance = await adapter.getBalance()
      return { ...balance, vendor: vendorName }
    }
    throw new Error('Vendor name required for getBalance')
  }

  async getPlans(service: ServiceType, network?: NetworkType, vendorId?: string): Promise<ServicePlan[]> {
    const adapter = vendorId 
      ? await this.getAdapter(vendorId) 
      : await this.getBestVendor(service, network)
    return await adapter.getPlans(service, network)
  }

  /**
   * Sync data plans from vendor to database
   */
  async syncPlans(adapterId: string): Promise<any> {
    const config = await prisma.vendorConfig.findUnique({
      where: { adapterId },
    })

    if (!config || !config.supportsData) {
      throw new Error(`Vendor ${adapterId} not configured or does not support DATA`)
    }

    const adapter = await this.getAdapter(adapterId)
    // Fetch for all networks
    const networks: NetworkType[] = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']
    let totalSynced = 0
    
    for (const network of networks) {
      try {
        const plans = await adapter.getPlans('DATA', network)
        
        for (const plan of plans) {
          // Robust size parsing using shared utility function
          const mbSize = parseDataSizeToMb(plan.name)
          let size = plan.name
          
          if (mbSize > 0) {
            // Normalize to MB for consistency (e.g. "1.5GB" -> "1536MB")
            size = `${mbSize}MB`
          } else {
            // Fallback to regex extraction if utility fails
            const sizeMatch = plan.name.toUpperCase().replace(/\s/g, '').match(/(\d+(\.\d+)?(MB|GB|TB))/)
            if (sizeMatch) {
              size = sizeMatch[0]
            }
          }

          // Robust validity parsing
          let validity = plan.validity || '30 days'
          const nameLower = plan.name.toLowerCase()
          if (!plan.validity) {
            if (nameLower.includes('daily') || nameLower.includes('1 day') || nameLower.includes('24 hours')) validity = '1 day'
            if (nameLower.includes('2 days')) validity = '2 days'
            if (nameLower.includes('weekly') || nameLower.includes('7 days') || nameLower.includes('1 week')) validity = '7 days'
            if (nameLower.includes('14 days') || nameLower.includes('2 weeks')) validity = '14 days'
            if (nameLower.includes('monthly') || nameLower.includes('30 days') || nameLower.includes('1 month') || nameLower.includes('30days')) validity = '30 days'
            if (nameLower.includes('60 days') || nameLower.includes('2 months')) validity = '60 days'
            if (nameLower.includes('3 months') || nameLower.includes('90 days')) validity = '90 days'
            if (nameLower.includes('yearly') || nameLower.includes('365 days') || nameLower.includes('1 year')) validity = '365 days'
          }

          // Determine plan type
          let planType = 'ALL' // Default
          if (nameLower.includes('sme')) planType = 'SME'
          else if (nameLower.includes('gift')) planType = 'GIFTING'
          else if (nameLower.includes('corp')) planType = 'CORPORATE'

          // Upsert plan
          await prisma.dataPlan.upsert({
            where: {
              vendorId_planId: {
                vendorId: config.id,
                planId: plan.id,
              },
            },
            update: {
              network: network,
              size: size,
              validity: validity,
              costPrice: plan.price,
              // Update selling price only if it's currently 0 or just created? 
              // Better to leave sellingPrice alone if it exists, or maybe update costPrice only.
              // But if cost price changes, profit margin should handle it dynamically.
              // However, the schema has sellingPrice. 
              // Let's set sellingPrice = costPrice if we want 0 profit by default, 
              // or maybe we should NOT update sellingPrice if it exists?
              // The problem: if cost increases, we might sell at loss.
              // Safe bet: Update costPrice. Admin should manage sellingPrice or we use a dynamic pricing model.
              // But specific requirement here?
              // "Fetch all plans from vendors"
              // Let's update metadata too
              isActive: plan.isAvailable,
            },
            create: {
              planId: plan.id,
              network: network,
              planType: planType,
              size: size,
              validity: validity,
              vendorId: config.id,
              costPrice: plan.price,
              sellingPrice: plan.price, // Default 0 profit
              isActive: plan.isAvailable,
            },
          })
          totalSynced++
        }
      } catch (e) {
        console.error(`Failed to sync ${network} on ${adapterId}:`, e)
      }
    }

    return { success: true, count: totalSynced }
  }

  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    // Pass serviceProvider as network so routing can pick the right vendor
    // (e.g. 'IKEJA' for electricity, 'DSTV' for cable)
    const routingNetwork = (payload.serviceProvider as any) || undefined
    const adapter = await this.getBestVendor(payload.service, routingNetwork)
    if (!adapter.verifyCustomer) {
      throw new Error(`Vendor ${adapter.getName()} does not support customer verification`)
    }
    return await adapter.verifyCustomer(payload)
  }

  async queryTransaction(reference: string | number, vendorName?: string): Promise<TransactionStatus> {
    if (vendorName) {
      const adapter = await this.getAdapter(vendorName)
      return await adapter.queryTransaction(reference)
    }
    // If no vendor name, we can't easily know which one to query without checking all.
    // For now, throw.
    throw new Error('Vendor name required to query transaction')
  }

  // Helper for admin dashboard to get all vendors status
  async getAllVendorsStatus() {
    const configs = await prisma.vendorConfig.findMany()
    const statuses: any[] = []

    for (const config of configs) {
      let balance: any = null
      let status = 'Unknown'
      try {
        const adapter = await this.getAdapter(config.adapterId)
        const bal = await adapter.getBalance()
        balance = bal.balance
        status = 'Active'
      } catch (e: any) {
        // 501 = balance not supported by this vendor (expected, not a health issue)
        if (e?.statusCode === 501 || e?.message?.includes('does not expose')) {
          status = 'Active (no balance)'
        } else {
          status = `Error: ${e.message}`
        }
      }
      statuses.push({
        ...config,
        balance,
        status
      })
    }
    return statuses
  }
}

export const vendorService = new VendorService()
