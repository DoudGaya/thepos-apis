/**
 * Vendor Service Orchestrator
 * 
 * Manages multiple vendor adapters with priority-based selection and automatic failover.
 * Handles vendor health monitoring and balance checking.
 */

import { VTUNGAdapter } from './vtu-ng.adapter'
import { EBillsAdapter } from './ebills.adapter'
import { ClubKonnectAdapter } from './clubkonnect.adapter'
import { AmigoAdapter } from './amigo.adapter'
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

/**
 * Vendor configuration and priority
 */
interface VendorConfig {
  adapter: VendorAdapter
  priority: number // 0 = highest priority
  isEnabled: boolean
  supportedServices: ServiceType[]
  lastFailure?: Date
  failureCount: number
}

export class VendorService {
  private vendors: Map<VendorName, VendorConfig>

  constructor() {
    this.vendors = new Map()
    this.initializeVendors()
  }

  /**
   * Initialize all vendor adapters from environment variables
   */
  private initializeVendors() {
    // Amigo - Primary data vendor (priority 0)
    if (process.env.AMIGO_API_TOKEN) {
      const amigoAdapter = new AmigoAdapter(
        process.env.AMIGO_API_TOKEN
      )
      this.vendors.set('AMIGO', {
        adapter: amigoAdapter,
        priority: 0,
        isEnabled: true,
        supportedServices: amigoAdapter.getSupportedServices(),
        failureCount: 0,
      })
      console.log('[VendorService] Amigo adapter initialized (Priority 0 - PRIMARY)')
    } else {
      console.warn('[VendorService] Amigo API token not found in environment')
    }

    // VTU.NG - Secondary vendor (priority 1)
    if (process.env.VTU_NG_USERNAME && process.env.VTU_NG_PASSWORD) {
      const vtuAdapter = new VTUNGAdapter(
        process.env.VTU_NG_USERNAME,
        process.env.VTU_NG_PASSWORD
      )
      this.vendors.set('VTU_NG', {
        adapter: vtuAdapter,
        priority: 1,
        isEnabled: true,
        supportedServices: vtuAdapter.getSupportedServices(),
        failureCount: 0,
      })
      console.log('[VendorService] VTU.NG adapter initialized (Priority 1)')
    } else {
      console.warn('[VendorService] VTU.NG credentials not found in environment')
    }

    // eBills.Africa - Fallback vendor (priority 2)
    if (process.env.EBILLS_USERNAME && process.env.EBILLS_PASSWORD) {
      const ebillsAdapter = new EBillsAdapter(
        process.env.EBILLS_USERNAME,
        process.env.EBILLS_PASSWORD
      )
      this.vendors.set('EBILLS', {
        adapter: ebillsAdapter,
        priority: 2,
        isEnabled: true,
        supportedServices: ebillsAdapter.getSupportedServices(),
        failureCount: 0,
      })
      console.log('[VendorService] eBills.Africa adapter initialized (Priority 2)')
    } else {
      console.warn('[VendorService] eBills.Africa credentials not found in environment')
    }

    // ClubKonnect - Tertiary vendor (priority 3)
    if (process.env.CLUBKONNECT_USER_ID && process.env.CLUBKONNECT_API_KEY) {
      const clubkonnectAdapter = new ClubKonnectAdapter(
        process.env.CLUBKONNECT_USER_ID,
        process.env.CLUBKONNECT_API_KEY
      )
      this.vendors.set('CLUBKONNECT', {
        adapter: clubkonnectAdapter,
        priority: 3,
        isEnabled: true,
        supportedServices: clubkonnectAdapter.getSupportedServices(),
        failureCount: 0,
      })
      console.log('[VendorService] ClubKonnect adapter initialized (Priority 3)')
    } else {
      console.warn('[VendorService] ClubKonnect credentials not found in environment')
    }

    if (this.vendors.size === 0) {
      throw new Error('No vendor credentials configured. Please check environment variables.')
    }
  }

  /**
   * Get available vendors for a specific service, sorted by priority
   */
  private getVendorsForService(service: ServiceType): VendorConfig[] {
    const availableVendors: VendorConfig[] = []

    for (const [name, config] of this.vendors.entries()) {
      if (
        config.isEnabled &&
        config.supportedServices.includes(service) &&
        config.failureCount < 3 // Disable after 3 consecutive failures
      ) {
        availableVendors.push(config)
      }
    }

    // Sort by priority (ascending)
    return availableVendors.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Record a vendor failure
   */
  private recordFailure(vendorName: VendorName) {
    const vendor = this.vendors.get(vendorName)
    if (vendor) {
      vendor.failureCount++
      vendor.lastFailure = new Date()
      
      if (vendor.failureCount >= 3) {
        console.error(`[VendorService] ${vendorName} disabled after 3 consecutive failures`)
      }
    }
  }

  /**
   * Record a vendor success (resets failure count)
   */
  private recordSuccess(vendorName: VendorName) {
    const vendor = this.vendors.get(vendorName)
    if (vendor) {
      vendor.failureCount = 0
    }
  }

  /**
   * Get balance from a specific vendor or primary vendor
   */
  async getBalance(vendorName?: VendorName): Promise<WalletBalance & { vendor: VendorName }> {
    if (vendorName) {
      const vendor = this.vendors.get(vendorName)
      if (!vendor) {
        throw new Error(`Vendor ${vendorName} not configured`)
      }

      try {
        const balance = await vendor.adapter.getBalance()
        return { ...balance, vendor: vendorName }
      } catch (error: any) {
        this.recordFailure(vendorName)
        throw error
      }
    }

    // Get balance from all enabled vendors
    const balances = []
    for (const [name, vendor] of this.vendors.entries()) {
      if (vendor.isEnabled) {
        try {
          const balance = await vendor.adapter.getBalance()
          balances.push({ ...balance, vendor: name })
          this.recordSuccess(name)
        } catch (error: any) {
          console.error(`[VendorService] Failed to get balance from ${name}:`, error.message)
          this.recordFailure(name)
        }
      }
    }

    if (balances.length === 0) {
      throw new Error('Failed to get balance from any vendor')
    }

    // Return balance from highest priority vendor
    return balances[0]
  }

  /**
   * Get service plans with automatic failover
   */
  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    const vendors = this.getVendorsForService(service)

    if (vendors.length === 0) {
      throw new Error(`No vendors available for service: ${service}`)
    }

    // Try each vendor in priority order
    for (const vendor of vendors) {
      try {
        console.log(`[VendorService] Fetching ${service} plans from ${vendor.adapter.getName()}`)
        const plans = await vendor.adapter.getPlans(service, network)
        this.recordSuccess(vendor.adapter.getName())
        return plans
      } catch (error: any) {
        console.error(`[VendorService] Failed to get plans from ${vendor.adapter.getName()}:`, error.message)
        this.recordFailure(vendor.adapter.getName())
        
        // Continue to next vendor
        if (vendor === vendors[vendors.length - 1]) {
          // Last vendor failed
          throw new Error(`All vendors failed to provide ${service} plans: ${error.message}`)
        }
      }
    }

    throw new Error(`No vendors available for ${service}`)
  }

  /**
   * Verify customer with automatic failover
   */
  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    const vendors = this.getVendorsForService(payload.service)

    if (vendors.length === 0) {
      throw new Error(`No vendors available for service: ${payload.service}`)
    }

    // Try each vendor in priority order
    for (const vendor of vendors) {
      try {
        if (!vendor.adapter.verifyCustomer) {
          console.log(`[VendorService] ${vendor.adapter.getName()} doesn't support customer verification, trying next...`)
          continue
        }

        console.log(`[VendorService] Verifying customer with ${vendor.adapter.getName()}`)
        const result = await vendor.adapter.verifyCustomer(payload)
        this.recordSuccess(vendor.adapter.getName())
        return result
      } catch (error: any) {
        console.error(`[VendorService] Failed to verify customer with ${vendor.adapter.getName()}:`, error.message)
        this.recordFailure(vendor.adapter.getName())
        
        // Continue to next vendor
        if (vendor === vendors[vendors.length - 1]) {
          throw new Error(`All vendors failed to verify customer: ${error.message}`)
        }
      }
    }

    throw new Error(`No vendors support customer verification for ${payload.service}`)
  }

  /**
   * Purchase service with automatic failover
   */
  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    const vendors = this.getVendorsForService(payload.service)

    if (vendors.length === 0) {
      throw new Error(`No vendors available for service: ${payload.service}`)
    }

    let lastError: any

    // Try each vendor in priority order
    for (const vendor of vendors) {
      try {
        console.log(`[VendorService] Attempting purchase with ${vendor.adapter.getName()}`)
        const result = await vendor.adapter.buyService(payload)
        this.recordSuccess(vendor.adapter.getName())
        
        console.log(`[VendorService] Purchase successful with ${vendor.adapter.getName()}`)
        return result
      } catch (error: any) {
        lastError = error
        console.error(`[VendorService] Purchase failed with ${vendor.adapter.getName()}:`, error.message)

        // Don't failover on validation errors (4xx)
        if (error instanceof VendorError) {
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 402) {
            // 400-level errors (except 402 insufficient balance) are client errors - don't retry
            throw error
          }
        }

        this.recordFailure(vendor.adapter.getName())

        // Log failover attempt
        if (vendor !== vendors[vendors.length - 1]) {
          console.log(`[VendorService] Failing over to next vendor...`)
        }
      }
    }

    // All vendors failed
    throw new Error(`All vendors failed to process purchase: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Query transaction status
   */
  async queryTransaction(reference: string | number, vendorName?: VendorName): Promise<TransactionStatus> {
    if (vendorName) {
      // Query specific vendor
      const vendor = this.vendors.get(vendorName)
      if (!vendor) {
        throw new Error(`Vendor ${vendorName} not configured`)
      }

      try {
        return await vendor.adapter.queryTransaction(reference)
      } catch (error: any) {
        this.recordFailure(vendorName)
        throw error
      }
    }

    // Try all vendors (transaction might be on any)
    for (const [name, vendor] of this.vendors.entries()) {
      if (vendor.isEnabled) {
        try {
          const status = await vendor.adapter.queryTransaction(reference)
          this.recordSuccess(name)
          return status
        } catch (error: any) {
          console.error(`[VendorService] Failed to query transaction from ${name}:`, error.message)
          // Continue to next vendor
        }
      }
    }

    throw new Error('Failed to query transaction from any vendor')
  }

  /**
   * Get vendor statistics
   */
  getVendorStats(): Array<{
    name: VendorName
    priority: number
    isEnabled: boolean
    supportedServices: ServiceType[]
    failureCount: number
    lastFailure?: Date
  }> {
    const stats = []
    
    for (const [name, config] of this.vendors.entries()) {
      stats.push({
        name,
        priority: config.priority,
        isEnabled: config.isEnabled,
        supportedServices: config.supportedServices,
        failureCount: config.failureCount,
        lastFailure: config.lastFailure,
      })
    }

    return stats.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Reset failure count for a vendor (manual intervention)
   */
  resetVendor(vendorName: VendorName) {
    const vendor = this.vendors.get(vendorName)
    if (vendor) {
      vendor.failureCount = 0
      vendor.lastFailure = undefined
      console.log(`[VendorService] Reset failure count for ${vendorName}`)
    }
  }

  /**
   * Enable/disable a vendor
   */
  setVendorEnabled(vendorName: VendorName, enabled: boolean) {
    const vendor = this.vendors.get(vendorName)
    if (vendor) {
      vendor.isEnabled = enabled
      console.log(`[VendorService] ${vendorName} ${enabled ? 'enabled' : 'disabled'}`)
    }
  }
}

// Export singleton instance
export const vendorService = new VendorService()
