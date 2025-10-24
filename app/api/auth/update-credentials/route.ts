import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, formatPhoneNumber } from '@/lib/auth'
import { z } from 'zod'

const updateCredentialsSchema = z.object({
  phone: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  pin: z.string().length(6, 'PIN must be 6 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Update credentials request for phone:', body.phone)
    
    const { phone, password, pin } = updateCredentialsSchema.parse(body)

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)
    console.log('🔥 Formatted phone:', formattedPhone)

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone: formattedPhone },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Please verify your account first' },
        { status: 403 }
      )
    }

    // Hash both password and PIN
    const hashedPassword = await hashPassword(password)
    const hashedPin = await hashPassword(pin)

    // Update user with new password and PIN
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        pinHash: hashedPin,
      },
    })

    console.log('✅ Credentials updated successfully for user:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Credentials updated successfully. You can now login.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Update credentials error:', error)
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    )
  }
}
