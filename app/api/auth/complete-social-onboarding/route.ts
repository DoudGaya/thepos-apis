import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumber, hashPassword, verifyToken } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const completeSocialOnboardingSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
})

export async function POST(request: NextRequest) {
  console.log('🚀 Complete Social Onboarding endpoint hit')
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📥 Complete Social Onboarding request:', {
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
      otp: body.otp ? '***' : undefined,
      pin: body.pin ? '***' : undefined,
    })

    const parsed = completeSocialOnboardingSchema.parse(body)

    // Format phone number
    const formattedPhone = formatPhoneNumber(parsed.phone)
    console.log('📞 Formatted phone:', formattedPhone)

    // Verify OTP
    const validOtp = await prisma.oTP.findFirst({
      where: {
        phone: formattedPhone,
        code: parsed.otp,
        type: 'SOCIAL_ONBOARDING',
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!validOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { used: true },
    })

    // Check if phone is already in use by another user
    const existingUserWithPhone = await prisma.user.findFirst({
      where: {
        phone: formattedPhone,
        NOT: { id: payload.userId },
      },
    })

    if (existingUserWithPhone) {
      return NextResponse.json(
        { error: 'Phone number is already linked to another account.' },
        { status: 400 }
      )
    }

    // Hash the PIN
    const pinHash = await hashPassword(parsed.pin)

    // Update user with all onboarding data
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        phone: formattedPhone,
        firstName: parsed.firstName.trim(),
        lastName: parsed.lastName.trim(),
        pinHash,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    })

    console.log('✅ Social onboarding completed for user:', updatedUser.id)

    return NextResponse.json({
      success: true,
      message: 'Account setup completed successfully',
      data: {
        user: updatedUser,
        onboarding: {
          needsPhone: false,
          needsPin: false,
          needsNames: false,
        },
      },
    })
  } catch (error) {
    console.error('❌ Complete Social Onboarding error:', error)

    if (error instanceof z.ZodError) {
      console.log('🔍 Validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
      console.error('📋 Error stack:', error.stack)
    }

    return NextResponse.json(
      { error: 'Failed to complete account setup' },
      { status: 500 }
    )
  }
}
