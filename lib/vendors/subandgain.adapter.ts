import axios, { AxiosInstance } from 'axios'
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

export class SubAndGainAdapter implements VendorAdapter {
  private username: string
  private apiKey: string
  private baseURL: string = 'https://subandgain.com/api'
  private client: AxiosInstance
  private authenticated: boolean = false

  constructor(config: { username: string; apiKey: string }) {
    this.username = config.username
    this.apiKey = config.apiKey
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    })
  }

  getName(): VendorName {
    return 'SUBANDGAIN'
  }

  getSupportedServices(): ServiceType[] {
    return ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV']
  }

  async authenticate(): Promise<void> {
    if (this.isSimulationMode()) {
      this.authenticated = true
      return
    }
    try {
      await this.getBalance()
      this.authenticated = true
    } catch (error) {
      this.authenticated = false
      throw error
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated
  }

  private isSimulationMode(): boolean {
    return (
      !this.username ||
      !this.apiKey ||
      this.username === 'username' ||
      this.apiKey === 'apiKey' ||
      this.username.includes('PLACEHOLDER')
    )
  }

  async getBalance(): Promise<WalletBalance> {
    if (this.isSimulationMode()) {
      return { balance: 50000, currency: 'NGN' }
    }

    try {
      const response = await this.client.get('/balance.php', {
        params: {
          username: this.username,
          apiKey: this.apiKey,
        },
      })

      if (response.data.error) {
        throw new Error(response.data.description || response.data.error)
      }

      // Response format: {"status":"successful","balance":"2500"}
      return {
        balance: parseFloat(response.data.balance),
        currency: 'NGN',
      }
    } catch (error: any) {
      // If we can't parse balance, return 0 but log error
      console.error('[SubAndGain] Failed to fetch balance:', error.message)
      return { balance: 0, currency: 'NGN' }
    }
  }

  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    // SubAndGain doesn't provide a dynamic plans API.
    // We return empty array. The system should rely on database plans.
    return []
  }

  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    if (this.isSimulationMode()) {
      return {
        isValid: true,
        customerName: 'Simulated Customer',
        address: '123 Simulation St',
        metadata: { simulated: true }
      }
    }

    try {
      if (payload.service === 'ELECTRICITY') {
        // https://subandgain.com/api/verify_electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****
        const response = await this.client.get('/verify_electricity.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            service: payload.serviceProvider, // e.g., AEDC
            meterNumber: payload.customerId,
            meterType: payload.meterType === 'PREPAID' ? 'PRE' : 'POST',
          },
        })

        if (response.data.error) {
           return { isValid: false }
        }
        
        // {"status":"success","customerName":"Ajibola Bolaji","accessToken":"230111498000"}
        return {
          isValid: true,
          customerName: response.data.customerName,
          metadata: { accessToken: response.data.accessToken }
        }
      } else if (payload.service === 'CABLE_TV') {
         // https://subandgain.com/api/verify_bills.php?username=****&apiKey=****&service=****&smartNumber=****
         const response = await this.client.get('/verify_bills.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            service: payload.serviceProvider, // e.g., GOTV
            smartNumber: payload.customerId,
          },
        })

        if (response.data.error) {
           return { isValid: false }
        }

        // {"status":"success","customerName":" CANW10 LAWAL KAMALDEEN","smartNumber":"7035232726"}
        return {
          isValid: true,
          customerName: response.data.customerName,
          metadata: { smartNumber: response.data.smartNumber }
        }
      }
      
      throw new Error(`Verification not supported for ${payload.service}`)
    } catch (error: any) {
       return { isValid: false }
    }
  }

  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
     if (this.isSimulationMode()) {
      return {
        success: true,
        status: 'COMPLETED',
        orderId: payload.idempotencyKey,
        vendorReference: `SIM-${Date.now()}`,
        vendorName: 'SUBANDGAIN',
        costPrice: payload.amount || 0,
        message: 'Simulated purchase successful',
      }
    }

    try {
      let response: any
      
      if (payload.service === 'AIRTIME') {
        // https://subandgain.com/api/airtime.php?username=****&apiKey=****&network=****&phoneNumber=****&amount=****
        response = await this.client.get('/airtime.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            network: payload.network,
            phoneNumber: payload.phone,
            amount: payload.amount,
          }
        })
      } else if (payload.service === 'DATA') {
        // https://subandgain.com/api/data.php?username=****&apiKey=****&network=****&dataPlan=****&phoneNumber=****
        response = await this.client.get('/data.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            network: payload.network,
            phoneNumber: payload.phone,
            dataPlan: payload.planId, 
          }
        })
      } else if (payload.service === 'ELECTRICITY') {
         // https://subandgain.com/api/electricity.php?username=****&apiKey=****&service=****&meterNumber=****&meterType=****&accessToken=****&amount=****
         const accessToken = payload.metadata?.accessToken
         if (!accessToken) throw new Error('Access token required for electricity purchase')

         response = await this.client.get('/electricity.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            service: payload.metadata?.serviceProvider || 'AEDC',
            meterNumber: payload.customerId,
            meterType: payload.meterType === 'PREPAID' ? 'PRE' : 'POST',
            accessToken: accessToken,
            amount: payload.amount
          }
        })
      } else if (payload.service === 'CABLE_TV') {
         // https://subandgain.com/api/bills.php?username=****&apiKey=****&service=****&bills_code=****&smartNumber=****
         response = await this.client.get('/bills.php', {
          params: {
            username: this.username,
            apiKey: this.apiKey,
            service: payload.metadata?.serviceProvider, // e.g. GOTV
            bills_code: payload.planId, // e.g. gotv-jinja
            smartNumber: payload.customerId,
          }
        })
      } else {
        throw new Error(`Service ${payload.service} not supported`)
      }

      // Check for error in response
      if (response.data.error) {
         return {
          success: false,
          status: 'FAILED',
          orderId: payload.idempotencyKey,
          vendorReference: '',
          vendorName: 'SUBANDGAIN',
          costPrice: 0,
          message: response.data.description || response.data.error,
        }
      }

      // Success
      // Status can be "Approved" or "Pending" or "successful"
      const status = (response.data.status || '').toLowerCase()
      let transactionStatus: TransactionStatus['status'] = 'PROCESSING'
      
      if (status === 'approved' || status === 'successful' || status === 'success') {
        transactionStatus = 'COMPLETED'
      } else if (status === 'pending') {
        transactionStatus = 'PENDING'
      } else if (status === 'cancelled' || status === 'failed') {
        transactionStatus = 'FAILED'
      }

      return {
        success: transactionStatus === 'COMPLETED' || transactionStatus === 'PENDING',
        status: transactionStatus,
        orderId: payload.idempotencyKey,
        vendorReference: response.data.trans_id || response.data.transaction_id,
        vendorName: 'SUBANDGAIN',
        costPrice: parseFloat(response.data.amount || '0'),
        message: response.data.api_response || 'Transaction successful',
        metadata: response.data
      }

    } catch (error: any) {
       return {
        success: false,
        status: 'FAILED',
        orderId: payload.idempotencyKey,
        vendorReference: '',
        vendorName: 'SUBANDGAIN',
        costPrice: 0,
        message: error.message || 'Unknown error',
      }
    }
  }

  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    throw new VendorError(
      'Transaction query not supported by SubAndGain Adapter yet.',
      'SUBANDGAIN',
      501,
      { feature: 'query_not_available' }
    )
  }
}
