/**
 * Wallet Balance API
 * GET - Fetch user's wallet balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, ApiError } from '@/lib/api-utils'

/**
 * GET /api/wallet/balance
 * Get current wallet balance
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [Wallet Balance] Request received')

    // Get authenticated user
    let authUser: any
    try {
      authUser = await getAuthenticatedUser(request)
      console.log('✅ [Wallet Balance] User authenticated:', authUser.id)
    } catch (authError: any) {
      console.error('❌ [Wallet Balance] Authentication failed:', authError.message)
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Authentication required'
        },
        { status: 401 }
      )
    }

    // Get user with balance
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        credits: true,
        updatedAt: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!user) {
      console.error('❌ [Wallet Balance] User not found in database:', authUser.id)
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      )
    }

    console.log('✅ [Wallet Balance] User found, fetching transactions')

    // Get recent transactions summary
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    })

    console.log('✅ [Wallet Balance] Returning success response')

    // Return data
    return NextResponse.json({
      success: true,
      data: {
        balance: user.credits,
        availableBalance: user.credits,
        commissionBalance: 0, // TODO: Calculate from referral earnings
        pending: 0, // TODO: Calculate pending transactions
        total: user.credits,
        lastUpdated: user.updatedAt.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        recentTransactions,
      },
    })

  } catch (error: any) {
    console.error('❌ [Wallet Balance] Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    // Handle ApiError (includes UnauthorizedError, etc.)
    if (error instanceof ApiError) {
      console.error('🔴 [Wallet Balance] ApiError caught:', error.statusCode, error.message)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          ...(error.errors && { errors: error.errors })
        },
        { status: error.statusCode }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet balance',
        details: error.message
      },
      { status: 500 }
    )
  }
}