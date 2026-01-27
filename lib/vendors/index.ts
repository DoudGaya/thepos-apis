import { prisma } from '@/lib/prisma'
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

    // For VTU_NG
    if (adapterId === 'VTU_NG') {
      return {
        username: process.env.VTU_NG_USERNAME || dbCredentials?.username,
        password: process.env.VTU_NG_PASSWORD || dbCredentials?.password,
      }
    }

    // For EBILLS
    if (adapterId === 'EBILLS') {
      return {
        username: process.env.EBILLS_USERNAME || dbCredentials?.username,
        password: process.env.EBILLS_PASSWORD || dbCredentials?.password,
      }
    }

    // For CLUBKONNECT
    if (adapterId === 'CLUBKONNECT') {
      return {
        userId: process.env.CLUBKONNECT_USER_ID || dbCredentials?.userId,
        apiKey: process.env.CLUBKONNECT_API_KEY || dbCredentials?.apiKey,
      }
    }

    // For other vendors, use database credentials as-is
    return dbCredentials || {}
  }

  /**
   * Get the best vendor for a service/network based on routing rules
   */
  private async getBestVendor(service: ServiceType, network?: NetworkType): Promise<VendorAdapter> {
    // 1. Check ServiceRouting
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

    // 2. Fallback defaults if no routing found
    if (service === 'DATA') return this.getAdapter('AMIGO')
    if (service === 'AIRTIME') return this.getAdapter('VTU_NG')
    if (service === 'ELECTRICITY') return this.getAdapter('VTU_NG')
    if (service === 'CABLE' || service === 'CABLE_TV') return this.getAdapter('VTU_NG')
    
    // Last resort: Try to find any enabled vendor that supports the service
    // (This part is tricky without querying all vendors, so we'll just throw for now)
    throw new Error(`No vendor configured for ${service} ${network || ''}`)
  }

  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    try {
      const adapter = await this.getBestVendor(payload.service, payload.network)
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

  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    const adapter = await this.getBestVendor(service, network)
    return await adapter.getPlans(service, network)
  }

  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    const adapter = await this.getBestVendor(payload.service)
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
    const statuses = []
    
    for (const config of configs) {
      let balance = null
      let status = 'Unknown'
      try {
        const adapter = await this.getAdapter(config.adapterId)
        const bal = await adapter.getBalance()
        balance = bal.balance
        status = 'Active'
      } catch (e: any) {
        status = `Error: ${e.message}`
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
