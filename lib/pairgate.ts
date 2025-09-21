import axios from 'axios'

const PAIRGATE_BASE_URL = process.env.PAIRGATE_BASE_URL || 'https://api.pairgate.com/v1'
const PAIRGATE_API_KEY = process.env.PAIRGATE_API_KEY

const pairgateApi = axios.create({
  baseURL: PAIRGATE_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAIRGATE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

export interface DataPlan {
  id: string
  network: string
  name: string
  price: number
  validity: string
  dataValue: string
}

export interface BillProvider {
  id: string
  name: string
  type: 'electricity' | 'cable' | 'water'
  code: string
}

export const pairgateService = {
  // Data Services
  async getDataPlans(network: string): Promise<DataPlan[]> {
    try {
      const response = await pairgateApi.get(`/data/plans/${network}`)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching data plans:', error)
      throw new Error('Failed to fetch data plans')
    }
  },

  async purchaseData(data: {
    network: string
    plan: string
    phone: string
    amount: number
  }) {
    try {
      const response = await pairgateApi.post('/data/purchase', {
        network: data.network,
        planId: data.plan,
        phone: data.phone,
        amount: data.amount,
      })
      return response.data
    } catch (error) {
      console.error('Error purchasing data:', error)
      throw new Error('Data purchase failed')
    }
  },

  // Bill Payment Services
  async getBillProviders(type: string): Promise<BillProvider[]> {
    try {
      const response = await pairgateApi.get(`/bills/providers/${type}`)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching bill providers:', error)
      throw new Error('Failed to fetch bill providers')
    }
  },

  async validateMeter(disco: string, meterNumber: string) {
    try {
      const response = await pairgateApi.post('/bills/validate', {
        disco,
        meterNumber,
      })
      return response.data
    } catch (error) {
      console.error('Error validating meter:', error)
      throw new Error('Meter validation failed')
    }
  },

  async payBill(data: {
    type: string
    provider: string
    customerInfo: Record<string, any>
    amount: number
  }) {
    try {
      const response = await pairgateApi.post('/bills/pay', {
        billType: data.type,
        provider: data.provider,
        customerInfo: data.customerInfo,
        amount: data.amount,
      })
      return response.data
    } catch (error) {
      console.error('Error paying bill:', error)
      throw new Error('Bill payment failed')
    }
  },

  // Wallet Services
  async getWalletBalance() {
    try {
      const response = await pairgateApi.get('/wallet/balance')
      return response.data
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      throw new Error('Failed to fetch wallet balance')
    }
  },
}

// Mock data for development
export const mockDataPlans: DataPlan[] = [
  { id: 'mtn_1gb', network: 'MTN', name: '1GB Monthly', price: 350, validity: '30 days', dataValue: '1GB' },
  { id: 'mtn_2gb', network: 'MTN', name: '2GB Monthly', price: 700, validity: '30 days', dataValue: '2GB' },
  { id: 'mtn_5gb', network: 'MTN', name: '5GB Monthly', price: 1500, validity: '30 days', dataValue: '5GB' },
  { id: 'airtel_1gb', network: 'Airtel', name: '1GB Monthly', price: 350, validity: '30 days', dataValue: '1GB' },
  { id: 'airtel_2gb', network: 'Airtel', name: '2GB Monthly', price: 700, validity: '30 days', dataValue: '2GB' },
  { id: 'glo_1gb', network: 'Glo', name: '1GB Monthly', price: 350, validity: '30 days', dataValue: '1GB' },
  { id: '9mobile_1gb', network: '9mobile', name: '1GB Monthly', price: 350, validity: '30 days', dataValue: '1GB' },
]

export const mockBillProviders: BillProvider[] = [
  { id: 'ekedc', name: 'Eko Electricity Distribution Company', type: 'electricity', code: 'EKEDC' },
  { id: 'ikedc', name: 'Ikeja Electric', type: 'electricity', code: 'IKEDC' },
  { id: 'aedc', name: 'Abuja Electricity Distribution Company', type: 'electricity', code: 'AEDC' },
  { id: 'dstv', name: 'DSTV', type: 'cable', code: 'DSTV' },
  { id: 'gotv', name: 'GOtv', type: 'cable', code: 'GOTV' },
  { id: 'startimes', name: 'Startimes', type: 'cable', code: 'STARTIMES' },
]
