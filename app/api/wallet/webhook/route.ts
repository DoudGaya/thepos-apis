import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import paystackService from '@/lib/paystack'
import crypto from 'crypto'

/**
 * POST /api/wallet/webhook
 * Paystack webhook handler for automatic wallet funding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.warn('Invalid webhook signature received')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Paystack webhook event:', event.event)

    // Handle successful charge
    if (event.event === 'charge.success') {
      return handleChargeSuccess(event.data)
    }

    // Handle failed charge
    if (event.event === 'charge.failed') {
      return handleChargeFailed(event.data)
    }

    // Ignore other events
    return NextResponse.json({ message: 'Event received' }, { status: 200 })

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful charge from Paystack
 */
async function handleChargeSuccess(data: any) {
  const { reference, amount, status, customer, metadata } = data

  try {
    console.log(`[Webhook] Processing successful payment: ${reference}`)

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        type: 'WALLET_FUNDING',
      },
      include: { user: { select: { id: true, email: true } } },
    })

    if (!transaction) {
      console.warn(`[Webhook] Transaction not found for reference: ${reference}`)
      return NextResponse.json(
        { message: 'Transaction not found but webhook acknowledged' },
        { status: 200 }
      )
    }

    // Skip if already processed
    if (transaction.status === 'SUCCESS') {
      console.log(`[Webhook] Transaction already processed: ${reference}`)
      return NextResponse.json({ message: 'Already processed' }, { status: 200 })
    }

    // Verify with Paystack to ensure authenticity
    const verification = await paystackService.verifyTransaction(reference)

    if (verification.data.status !== 'success') {
      throw new Error(
        `Payment verification failed: ${verification.data.gateway_response || 'Unknown error'}`
      )
    }

    // Verify amount matches (convert kobo to naira)
    const amountInNaira = amount / 100
    if (Math.abs(amountInNaira - transaction.amount) > 0.01) {
      throw new Error(
        `Amount mismatch: expected ${transaction.amount}, received ${amountInNaira}`
      )
    }

    // Update transaction to success
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        details: {
          ...(transaction.details as Record<string, any> || {}),
          paystackData: {
            paidAt: verification.data.paid_at,
            channel: verification.data.channel,
            currency: verification.data.currency,
            fees: verification.data.fees,
            gatewayResponse: verification.data.gateway_response,
          },
          webhookProcessedAt: new Date().toISOString(),
        },
      },
    })

    // Credit user wallet
    await prisma.user.update({
      where: { id: transaction.userId },
      data: {
        credits: {
          increment: amountInNaira,
        },
      },
    })

    // Create success notification
    await prisma.notification.create({
      data: {
        userId: transaction.userId,
        title: 'Wallet Funded Successfully',
        message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()}`,
        type: 'TRANSACTION',
      },
    })

    console.log(
      `[Webhook] Wallet funding completed for user ${transaction.userId}: ₦${amountInNaira}`
    )

    return NextResponse.json({ message: 'Payment processed successfully' }, { status: 200 })

  } catch (error: any) {
    console.error(`[Webhook] Error processing charge success: ${error.message}`)

    // Try to mark transaction as failed
    const transaction = await prisma.transaction.findFirst({
      where: { reference },
    })

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: {
            ...(transaction.details as Record<string, any> || {}),
            error: error.message,
            webhookProcessedAt: new Date().toISOString(),
          },
        },
      })
    }

    // Still return 200 to prevent Paystack from retrying
    return NextResponse.json(
      { message: 'Error processed', error: error.message },
      { status: 200 }
    )
  }
}

/**
 * Handle failed charge from Paystack
 */
async function handleChargeFailed(data: any) {
  const { reference, gateway_response } = data

  try {
    console.log(`[Webhook] Processing failed payment: ${reference}`)

    const transaction = await prisma.transaction.findFirst({
      where: { reference },
    })

    if (!transaction) {
      console.warn(`[Webhook] Transaction not found for failed reference: ${reference}`)
      return NextResponse.json({ message: 'Transaction not found' }, { status: 200 })
    }

    // Mark as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        details: {
          ...(transaction.details as Record<string, any> || {}),
          failureReason: gateway_response || 'Payment failed',
          webhookProcessedAt: new Date().toISOString(),
        },
      },
    })

    // Create failure notification
    await prisma.notification.create({
      data: {
        userId: transaction.userId,
        title: 'Wallet Funding Failed',
        message: `Your wallet funding attempt failed: ${gateway_response || 'Unknown error'}`,
        type: 'TRANSACTION',
      },
    })

    console.log(
      `[Webhook] Payment failed for reference ${reference}: ${gateway_response}`
    )

    return NextResponse.json({ message: 'Failure processed' }, { status: 200 })

  } catch (error: any) {
    console.error(`[Webhook] Error processing charge failed: ${error.message}`)
    // Still return 200 to prevent Paystack from retrying
    return NextResponse.json(
      { message: 'Error processed', error: error.message },
      { status: 200 }
    )
  }
}