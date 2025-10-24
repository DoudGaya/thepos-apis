/**
 * API Utilities
 * Shared utilities for API routes including error handling, response formatting, and validation
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

/**
 * API Error Classes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errors?: Record<string, string[]>) {
    super(400, message, errors)
    this.name = 'BadRequestError'
  }
}

export class ValidationError extends ApiError {
  constructor(errors: Record<string, string[]>) {
    super(422, 'Validation failed', errors)
    this.name = 'ValidationError'
  }
}

export class InsufficientBalanceError extends ApiError {
  constructor(message: string = 'Insufficient wallet balance') {
    super(400, message)
    this.name = 'InsufficientBalanceError'
  }
}

/**
 * Success Response Helper
 */
export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  )
}

/**
 * Error Response Helper
 */
export function errorResponse(
  error: string | ApiError,
  status: number = 500
): NextResponse<ApiResponse> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errors: error.errors,
      },
      { status: error.statusCode }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: typeof error === 'string' ? error : 'Internal server error',
    },
    { status }
  )
}

/**
 * Get Authenticated User
 * Returns the current user session or throws UnauthorizedError
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new UnauthorizedError('Authentication required')
  }

  return {
    id: (session.user as any).id || session.user.email!,
    email: session.user.email!,
    name: session.user.name!,
    role: (session.user as any).role as 'USER' | 'ADMIN',
  }
}

/**
 * Require Admin Role
 * Throws ForbiddenError if user is not admin
 */
export async function requireAdmin() {
  const user = await getAuthenticatedUser()
  
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required')
  }

  return user
}

/**
 * Validate Request Body
 * Validates request body against Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: any
): Promise<T> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors: Record<string, string[]> = {}
      result.error.errors.forEach((err: any) => {
        const path = err.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })
      throw new ValidationError(errors)
    }

    return result.data
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new BadRequestError('Invalid request body')
  }
}

/**
 * Parse Query Parameters
 */
export function parseQueryParams(url: string) {
  const { searchParams } = new URL(url)
  
  return {
    get: (key: string) => searchParams.get(key),
    getInt: (key: string, defaultValue?: number) => {
      const value = searchParams.get(key)
      if (!value) return defaultValue
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? defaultValue : parsed
    },
    getString: (key: string, defaultValue?: string) => {
      return searchParams.get(key) || defaultValue
    },
    getBoolean: (key: string, defaultValue?: boolean) => {
      const value = searchParams.get(key)
      if (!value) return defaultValue
      return value === 'true' || value === '1'
    },
  }
}

/**
 * Pagination Helper
 */
export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export function getPaginationParams(
  url: string,
  defaultLimit: number = 20
): PaginationParams {
  const params = parseQueryParams(url)
  const page = Math.max(1, params.getInt('page', 1)!)
  const limit = Math.min(100, Math.max(1, params.getInt('limit', defaultLimit)!))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Pagination Response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  }
}

/**
 * Format Currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount)
}

/**
 * Generate Transaction Reference
 */
export function generateReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}${timestamp}${random}`.toUpperCase()
}

/**
 * API Error Handler
 * Wraps async API handlers with error handling
 */
export function apiHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)

      if (error instanceof ApiError) {
        return errorResponse(error)
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any
        if (prismaError.code === 'P2002') {
          return errorResponse(
            new BadRequestError('A record with this value already exists')
          )
        }
        if (prismaError.code === 'P2025') {
          return errorResponse(new NotFoundError('Record not found'))
        }
      }

      return errorResponse('Internal server error', 500)
    }
  }
}

/**
 * Calculate Transaction Profit
 */
export function calculateProfit(sellPrice: number, buyPrice: number): number {
  return Math.round((sellPrice - buyPrice) * 100) / 100
}

/**
 * Calculate Profit Margin Percentage
 */
export function calculateProfitMargin(sellPrice: number, buyPrice: number): number {
  if (buyPrice === 0) return 0
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 10000) / 100
}

/**
 * Validate Phone Number (Nigerian)
 */
export function validateNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return /^(0|\+?234)?[789]\d{9}$/.test(cleaned)
}

/**
 * Format Phone Number (Nigerian)
 */
export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('234')) {
    return `0${cleaned.substring(3)}`
  }
  if (cleaned.startsWith('0')) {
    return cleaned
  }
  return `0${cleaned}`
}

/**
 * Sleep Helper (for retries)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry Helper
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await sleep(delay * (i + 1))
      }
    }
  }
  
  throw lastError
}
