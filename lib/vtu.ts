/**
 * VTU.NG API Integration Service
 * Handles airtime, data, and utility bill purchases
 */

import axios, { AxiosInstance } from 'axios'

interface VTUConfig {
  apiKey: string
  baseURL: string
}

interface VTUResponse<T = any> {
  code: string
  message: string
  data?: T
}

interface NetworkPlan {
  plan_id: string
  name: string
  amount: number
  validity: string
  network: string
}

interface PurchaseResponse {
  transaction_id: string
  phone: string
  amount: number
  status: string
  date: string
}

class VTUService {
  private client: AxiosInstance
  private apiKey: string

  constructor(config: VTUConfig) {
    this.apiKey = config.apiKey
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    })
  }

  /**
   * Check VTU.NG account balance
   */
  async checkBalance(): Promise<number> {
    try {
      const response = await this.client.get<VTUResponse<{ balance: number }>>('/balance')
      
      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Failed to fetch balance')
      }

      return response.data.data?.balance || 0
    } catch (error: any) {
      console.error('VTU Balance Check Error:', error.response?.data || error.message)
      throw new Error('Failed to check VTU balance')
    }
  }

  /**
   * Purchase Airtime
   */
  async purchaseAirtime(
    network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE',
    phone: string,
    amount: number
  ): Promise<PurchaseResponse> {
    try {
      const response = await this.client.post<VTUResponse<PurchaseResponse>>('/airtime', {
        network: network.toLowerCase(),
        phone,
        amount,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Airtime purchase failed')
      }

      if (!response.data.data) {
        throw new Error('Invalid response from VTU provider')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Airtime Purchase Error:', error.response?.data || error.message)
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid purchase request')
      }
      
      if (error.response?.status === 402) {
        throw new Error('Insufficient VTU balance')
      }

      throw new Error(error.message || 'Airtime purchase failed')
    }
  }

  /**
   * Get Data Plans
   */
  async getDataPlans(network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE'): Promise<NetworkPlan[]> {
    try {
      const response = await this.client.get<VTUResponse<NetworkPlan[]>>(
        `/data/plans/${network.toLowerCase()}`
      )

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Failed to fetch data plans')
      }

      return response.data.data || []
    } catch (error: any) {
      console.error('VTU Data Plans Error:', error.response?.data || error.message)
      throw new Error('Failed to fetch data plans')
    }
  }

  /**
   * Purchase Data Bundle
   */
  async purchaseData(
    network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE',
    phone: string,
    planId: string
  ): Promise<PurchaseResponse> {
    try {
      const response = await this.client.post<VTUResponse<PurchaseResponse>>('/data', {
        network: network.toLowerCase(),
        phone,
        plan_id: planId,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Data purchase failed')
      }

      if (!response.data.data) {
        throw new Error('Invalid response from VTU provider')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Data Purchase Error:', error.response?.data || error.message)
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid purchase request')
      }
      
      if (error.response?.status === 402) {
        throw new Error('Insufficient VTU balance')
      }

      throw new Error(error.message || 'Data purchase failed')
    }
  }

  /**
   * Verify Transaction Status
   */
  async verifyTransaction(transactionId: string): Promise<any> {
    try {
      const response = await this.client.get<VTUResponse>(`/transaction/${transactionId}`)

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Transaction verification failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Transaction Verify Error:', error.response?.data || error.message)
      throw new Error('Failed to verify transaction')
    }
  }

  /**
   * Purchase Electricity (PREPAID)
   */
  async purchaseElectricity(
    provider: string,
    meterNumber: string,
    amount: number,
    meterType: 'prepaid' | 'postpaid' = 'prepaid'
  ): Promise<any> {
    try {
      const response = await this.client.post<VTUResponse>('/electricity', {
        provider: provider.toLowerCase(),
        meter_number: meterNumber,
        meter_type: meterType,
        amount,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Electricity purchase failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Electricity Purchase Error:', error.response?.data || error.message)
      throw new Error(error.message || 'Electricity purchase failed')
    }
  }

  /**
   * Purchase Cable TV Subscription
   */
  async purchaseCableTV(
    provider: 'DSTV' | 'GOTV' | 'STARTIMES',
    smartcardNumber: string,
    planCode: string
  ): Promise<any> {
    try {
      const response = await this.client.post<VTUResponse>('/cable', {
        provider: provider.toLowerCase(),
        smartcard_number: smartcardNumber,
        plan_code: planCode,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Cable TV purchase failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Cable TV Purchase Error:', error.response?.data || error.message)
      throw new Error(error.message || 'Cable TV purchase failed')
    }
  }

  /**
   * Purchase betting wallet funding
   */
  async purchaseBetting(
    provider: string,
    customerId: string,
    amount: number
  ): Promise<any> {
    try {
      const response = await this.client.post<VTUResponse>('/betting', {
        provider: provider.toLowerCase(),
        customer_id: customerId,
        amount: amount,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'Betting wallet funding failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU Betting Purchase Error:', error.response?.data || error.message)
      throw new Error(error.message || 'Betting wallet funding failed')
    }
  }

  /**
   * Purchase educational e-pins (WAEC, NECO, NABTEB)
   */
  async purchaseEpins(
    provider: 'WAEC' | 'NECO' | 'NABTEB',
    quantity: number
  ): Promise<any> {
    try {
      const response = await this.client.post<VTUResponse>('/epin', {
        provider: provider.toLowerCase(),
        quantity: quantity,
      })

      if (response.data.code !== '200' && response.data.code !== 'success') {
        throw new Error(response.data.message || 'E-Pin purchase failed')
      }

      return response.data.data
    } catch (error: any) {
      console.error('VTU E-Pin Purchase Error:', error.response?.data || error.message)
      throw new Error(error.message || 'E-Pin purchase failed')
    }
  }
}

// Export singleton instance
const vtuService = new VTUService({
  apiKey: process.env.VTU_API_KEY || '',
  baseURL: process.env.VTU_API_URL || 'https://api.vtu.ng/api',
})

export default vtuService
