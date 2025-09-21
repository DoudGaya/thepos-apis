import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const purchaseSchema = z.object({
  networkId: z.string().min(1, 'Network ID is required'),
  bundleId: z.string().min(1, 'Bundle ID is required'),
  msisdn: z.string().min(10, 'Phone number is required'),
  payWithCredits: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { networkId, bundleId, msisdn, payWithCredits } = purchaseSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Mock bundle data (in real app, you'd fetch from external API)
    const mockBundles = {
      'mtn-1gb-30d': { name: '1GB Data', price: 350, data: '1GB' },
      'airtel-1gb-30d': { name: '1GB Data', price: 340, data: '1GB' },
      'glo-1gb-30d': { name: '1GB Data', price: 350, data: '1GB' },
      '9mobile-1gb-30d': { name: '1GB Data', price: 360, data: '1GB' },
    }

    const bundle = mockBundles[bundleId as keyof typeof mockBundles]
    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Check if paying with credits and user has enough
    if (payWithCredits && user.credits < bundle.price) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DATA',
        status: 'PENDING',
        amount: bundle.price,
        reference: `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        details: {
          networkId,
          bundleId,
          bundleName: bundle.name,
          dataAmount: bundle.data,
          recipient: msisdn,
          provider: networkId.toUpperCase(),
          payWithCredits,
        },
      },
    })

    // If paying with credits, deduct from user account
    if (payWithCredits) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: user.credits - bundle.price,
        },
      })
    }

    // In a real app, you would call external API (Pairgate) here
    // For now, we'll simulate success
    const isSuccess = Math.random() > 0.1 // 90% success rate

    // Update transaction status
    const finalStatus = isSuccess ? 'SUCCESS' : 'FAILED'
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: { 
        status: finalStatus,
        details: {
          ...(transaction.details as any),
          externalReference: `EXT_${Date.now()}`,
          completedAt: new Date().toISOString(),
          success: isSuccess,
        },
      },
    })

    // If transaction failed and we deducted credits, refund them
    if (!isSuccess && payWithCredits) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: user.credits + bundle.price,
        },
      })
    }

    return NextResponse.json({
      message: isSuccess ? 'Data purchase successful' : 'Data purchase failed',
      success: isSuccess,
      transaction: updatedTransaction,
    })
  } catch (error) {
    console.error('Data purchase error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
