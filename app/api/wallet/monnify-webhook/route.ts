/**
 * POST /api/wallet/monnify-webhook
 * Monnify webhook handler for virtual account wallet funding
 * Monnify sends HMAC-SHA512 signature in the `monnify-signature` header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, MonnifyWebhookPayload } from '@/lib/monnify'

export async function POST(request: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await request.text()
    const signature = request.headers.get('monnify-signature') || ''

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[MonnifyWebhook] Invalid signature received')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody) as MonnifyWebhookPayload
    console.log('[MonnifyWebhook] Event received:', event.eventType)

    // Only process completed virtual account payments
    if (event.eventType !== 'SUCCESSFUL_TRANSACTION') {
      return NextResponse.json({ message: 'Event acknowledged' }, { status: 200 })
    }

    return await handleSuccessfulTransaction(event)
  } catch (error: any) {
    console.error('[MonnifyWebhook] Processing error:', error)
    // Return 200 to prevent repeated retries for unrecoverable errors
    return NextResponse.json(
      { message: 'Error acknowledged', error: error.message },
      { status: 200 }
    )
  }
}

async function handleSuccessfulTransaction(event: MonnifyWebhookPayload) {
  const { transactionReference, amountPaid, settledAmount, paymentMethod, reservedAccountDetails } =
    event.eventData

  if (!reservedAccountDetails) {
    console.warn('[MonnifyWebhook] No reservedAccountDetails in event, skipping')
    return NextResponse.json({ message: 'Skipped — not a reserved account event' }, { status: 200 })
  }

  const { accountReference } = reservedAccountDetails

  // Find the virtual account record
  const virtualAccount = await prisma.virtualAccount.findUnique({
    where: { accountReference },
    include: { user: { select: { id: true, email: true } } },
  })

  if (!virtualAccount) {
    console.warn(`[MonnifyWebhook] Virtual account not found: ${accountReference}`)
    return NextResponse.json({ message: 'Account not found but acknowledged' }, { status: 200 })
  }

  const userId = virtualAccount.userId
  const amountInNaira = settledAmount ?? amountPaid

  // Idempotency: check if this transaction was already processed
  const duplicate = await prisma.transaction.findFirst({
    where: {
      reference: transactionReference,
      userId,
      type: 'WALLET_FUNDING',
      status: 'SUCCESS',
    },
  })

  if (duplicate) {
    console.log(`[MonnifyWebhook] Duplicate event for ${transactionReference}, skipping`)
    return NextResponse.json({ message: 'Already processed' }, { status: 200 })
  }

  // Process atomically: credit wallet + create transaction + notification
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amountInNaira } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: 'WALLET_FUNDING',
        amount: amountInNaira,
        status: 'SUCCESS',
        reference: transactionReference,
        details: {
          paymentMethod: 'monnify_va',
          monnifyReference: transactionReference,
          virtualAccountNumber: reservedAccountDetails.accountNumber,
          bankName: reservedAccountDetails.bankName,
          accountReference,
          paymentChannel: paymentMethod,
          webhookProcessedAt: new Date().toISOString(),
        },
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: 'Wallet Funded Successfully',
        message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} via virtual account`,
        type: 'TRANSACTION',
      },
    }),
  ])

  console.log(
    `[MonnifyWebhook] Wallet funding completed for user ${userId}: ₦${amountInNaira} (${transactionReference})`
  )

  return NextResponse.json({ message: 'Payment processed successfully' }, { status: 200 })
}
