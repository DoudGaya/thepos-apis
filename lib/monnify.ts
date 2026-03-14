/**
 * Monnify Payment Gateway Service
 * Handles Reserved Virtual Accounts (RVA) for wallet funding
 * Docs: https://developers.monnify.com/
 */

import crypto from 'crypto'

const BASE_URL = process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'
const API_KEY = process.env.MONNIFY_API_KEY || ''
const SECRET_KEY = process.env.MONNIFY_SECRET_KEY || ''
const CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE || ''

/** Check whether Monnify credentials are configured */
export function isMonnifyConfigured(): boolean {
  return !!(API_KEY && SECRET_KEY && CONTRACT_CODE)
}

interface MonnifyAuthToken {
  accessToken: string
  expiresAt: number
}

// Simple in-process token cache (single instance)
let cachedToken: MonnifyAuthToken | null = null

/**
 * Obtain a Monnify access token using Basic Auth.
 * Token is cached until 60 s before expiry to avoid redundant requests.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now()

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken
  }

  const credentials = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64')

  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Monnify auth failed (${response.status}): ${body}`)
  }

  const json = (await response.json()) as {
    requestSuccessful: boolean
    responseBody: { accessToken: string; expiresIn: number }
  }

  if (!json.requestSuccessful) {
    throw new Error('Monnify auth unsuccessful')
  }

  const { accessToken, expiresIn } = json.responseBody
  cachedToken = { accessToken, expiresAt: now + expiresIn * 1_000 }
  return accessToken
}

export interface ReserveAccountParams {
  /** Unique reference for this account (e.g. user ID) */
  accountReference: string
  accountName: string
  customerEmail: string
  customerName: string
  /** BVN — required by CBN regulation since Sept 16 2024 (provide bvn or nin) */
  bvn?: string
  /** NIN — accepted as alternative to BVN for KYC */
  nin?: string
}

export interface ReservedAccount {
  contractCode: string
  accountReference: string
  accountName: string
  currencyCode: string
  customerEmail: string
  customerName: string
  accounts: Array<{
    bankCode: string
    bankName: string
    accountNumber: string
    accountName: string
  }>
  reservationReference: string
  status: string
}

/**
 * Reserve a dedicated virtual bank account for a user.
 * Returns the raw Monnify `responseBody` on success.
 */
export async function reserveVirtualAccount(
  params: ReserveAccountParams
): Promise<ReservedAccount> {
  const token = await getAccessToken()

  const body: Record<string, unknown> = {
    accountReference: params.accountReference,
    accountName: params.accountName,
    currencyCode: 'NGN',
    contractCode: CONTRACT_CODE,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    getAllAvailableBanks: true, // return all available banks; use first one
  }

  if (params.bvn) {
    body.bvn = params.bvn
  }

  if (params.nin) {
    body.nin = params.nin
  }

  const response = await fetch(`${BASE_URL}/api/v2/bank-transfer/reserved-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Monnify reserveAccount failed (${response.status}): ${text}`)
  }

  const json = (await response.json()) as {
    requestSuccessful: boolean
    responseBody: ReservedAccount
  }

  if (!json.requestSuccessful) {
    throw new Error('Monnify reserveVirtualAccount unsuccessful')
  }

  return json.responseBody
}

/**
 * Verify the HMAC-SHA512 signature sent by Monnify on webhook events.
 * Header name: `monnify-signature`
 *
 * @param rawBody  - Raw request body string (not parsed JSON)
 * @param signature - Value of the `monnify-signature` header
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!SECRET_KEY || !signature) return false
  const expected = crypto
    .createHmac('sha512', SECRET_KEY)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}

export interface MonnifyWebhookPayload {
  eventType: string
  eventData: {
    transactionReference: string
    paymentReference: string
    amountPaid: number
    totalPayable: number
    settledAmount: number
    paidOn: string
    paymentMethod: string
    currency: string
    product: {
      reference: string
      type: string
    }
    reservedAccountDetails?: {
      accountName: string
      accountNumber: string
      bankName: string
      bankCode: string
      accountReference: string
      customerEmail: string
    }
  }
}
