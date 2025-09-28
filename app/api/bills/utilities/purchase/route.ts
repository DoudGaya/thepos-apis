import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'
import { pairgateService } from '@/lib/pairgate'

const purchaseSchema = z.object({
  type: z.string().min(1, 'Bill type is required'),
  provider: z.string().min(1, 'Provider is required'),
  customerInfo: z.record(z.any()),
  amount: z.number().min(1, 'Amount is required'),
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
    const { type, provider, customerInfo, amount } = purchaseSchema.parse(body)

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

    // Check wallet balance
    if (user.credits < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      )
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: type === 'electricity' ? 'ELECTRICITY' : type === 'cable' ? 'CABLE' : type === 'water' ? 'WATER' : 'ELECTRICITY',
        status: 'PENDING',
        amount: amount,
        reference: `BILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        details: {
          billType: type,
          provider,
          customerInfo,
          description: `${type} bill payment`,
        },
      },
    })

    try {
      // Call Pairgate API to pay bill
      const paymentResult = await pairgateService.payBill({
        type,
        provider,
        customerInfo,
        amount
      })

      if (paymentResult.success) {
        // Deduct from wallet
        await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: user.credits - amount,
          },
        })

        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            details: {
              ...(transaction.details as object || {}),
              externalReference: paymentResult.reference,
              completedAt: new Date().toISOString(),
            },
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Bill payment successful',
          transactionId: transaction.id,
          reference: paymentResult.reference
        })
      } else {
        // Update transaction as failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              ...(transaction.details as object || {}),
              error: paymentResult.message || 'Payment failed',
            },
          },
        })

        return NextResponse.json(
          { error: paymentResult.message || 'Bill payment failed' },
          { status: 500 }
        )
      }
    } catch (paymentError: any) {
      console.error('Pairgate payment error:', paymentError)

      // Update transaction as failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: {
            ...(transaction.details as object || {}),
            error: paymentError.message,
          },
        },
      })

      return NextResponse.json(
        { error: 'Bill payment failed. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Bill payment error:', error)

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