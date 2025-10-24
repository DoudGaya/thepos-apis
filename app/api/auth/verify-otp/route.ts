import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, formatPhoneNumber } from '@/lib/auth'
import { z } from 'zod'
// import { consumeToken } from '@/lib/rateLimiter'
import { consumeToken } from '@/lib/rateLimiter'

const verifyOTPSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  code: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['REGISTER', 'LOGIN', 'FORGOT_PASSWORD']).optional().default('REGISTER'),
}).refine(data => data.phone || data.email, {
  message: "Either phone or email is required",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Verify OTP request body:', body)
    
    const { phone, email, code, type } = verifyOTPSchema.parse(body)

    // Format phone number if provided
    const formattedPhone = phone ? formatPhoneNumber(phone) : undefined
    console.log('🔥 Original phone:', phone, '→ Formatted phone:', formattedPhone)

    // Find user by formatted phone or email
    const user = await prisma.user.findFirst({
      where: formattedPhone ? { phone: formattedPhone } : { email },
    })

    console.log('🔥 User lookup result:', user ? `Found user: ${user.email}` : 'User not found')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Always use the user's phone number for OTP lookup (since OTP table only stores phone)
    const userPhone = user.phone
    console.log('🔥 Using user phone for OTP lookup:', userPhone)

    // Find valid OTP using the user's phone number
    // Rate limit OTP verification attempts per phone: max 5 per 15 minutes
    const rl = consumeToken(`verifyotp:${userPhone}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 })
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: userPhone,
        code,
        type,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('🔥 OTP lookup result:', otpRecord ? `Found OTP: ${otpRecord.code}` : 'OTP not found')

    if (!otpRecord) {
      // Let's debug what OTP records exist for this user's phone
      const allOtpsForUser = await prisma.oTP.findMany({
        where: { phone: userPhone },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      
      console.log('🔍 Debug - All OTPs for user phone:', allOtpsForUser.map(otp => ({
        id: otp.id,
        code: otp.code,
        type: otp.type,
        expiresAt: otp.expiresAt,
        expired: otp.expiresAt < new Date(),
        createdAt: otp.createdAt
      })))
      
      console.log('🔍 Debug - Looking for:', { 
        userPhone, 
        code, 
        type, 
        currentTime: new Date() 
      })

      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Delete the used OTP
    await prisma.oTP.delete({
      where: { id: otpRecord.id },
    })

    // If this is registration verification, mark user as verified
    if (type === 'REGISTER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      })
    }

    // Generate tokens for login after verification
    const accessToken = generateToken({ userId: user.id, role: user.role })
    const refreshToken = generateToken({ userId: user.id, role: user.role })

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Account verified successfully',
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      user: { ...userWithoutPassword, isVerified: true },
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    
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
