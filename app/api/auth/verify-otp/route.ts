import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, formatPhoneNumber, generateReferralCode } from '@/lib/auth'
import { z } from 'zod'
import { getToken } from 'next-auth/jwt'
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

    // Check if user is already authenticated (e.g. Google Login but missing phone)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    // Format phone number if provided
    const formattedPhone = phone ? formatPhoneNumber(phone) : undefined
    console.log('🔥 Original phone:', phone, '→ Formatted phone:', formattedPhone)

    // Check if phone is already used by ANOTHER user
    if (formattedPhone) {
      const existingUserWithPhone = await prisma.user.findUnique({
        where: { phone: formattedPhone }
      })

      // If phone exists on DIFFERENT user than the logged in one
      if (existingUserWithPhone && token && existingUserWithPhone.id !== token.sub) {
         return NextResponse.json(
          { error: 'Phone number already registered to another account' },
          { status: 400 }
        )
      }
    }

    // Find user target
    let user: any = null;

    if (token && token.sub) {
       // Logged in user
       user = await prisma.user.findUnique({ where: { id: token.sub } })
    } else {
       // Not logged in, find by phone/email
       user = await prisma.user.findFirst({
         where: formattedPhone ? { phone: formattedPhone } : { email },
       })
    }

    console.log('🔥 User lookup result:', user ? `Found user: ${user.email}` : 'User not found')

    // If user not found and NOT registering, return error
    if (!user && type !== 'REGISTER') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Determine phone to use for OTP lookup
    const phoneToUse = user ? user.phone : formattedPhone;
    
    if (!phoneToUse) {
         return NextResponse.json(
        { error: 'Phone number required for verification' },
        { status: 400 }
      )
    }

    console.log('🔥 Using phone for OTP lookup:', phoneToUse)

    // Find valid OTP using the phone number
    // Rate limit OTP verification attempts per phone: max 5 per 15 minutes
    const rl = consumeToken(`verifyotp:${phoneToUse}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 })
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: phoneToUse,
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
        where: { phone: phoneToUse },
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
        phoneToUse, 
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

    // If user doesn't exist (REGISTER flow), create them now
    if (!user && type === 'REGISTER') {
        const referralCode = generateReferralCode()
        // Use provided email or generate a placeholder
        const userEmail = email || `${phoneToUse}@nillarpay.app`
        
        user = await prisma.user.create({
            data: {
                phone: phoneToUse,
                email: userEmail,
                referralCode,
                isVerified: true,
                phoneVerified: true,
                role: 'USER'
            }
        })
    } else if (user && type === 'REGISTER') {
      
      const updateData: any = { isVerified: true, phoneVerified: true };
      
      // If logged-in user is verifying a phone number for the first time
      if (token && token.sub === user.id && !user.phone && formattedPhone) {
         updateData.phone = formattedPhone;
         // Also update referrence code if missing? No, create handles that.
      }

      // If this is registration verification, mark user as verified
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })
      // Refresh user object
      user = await prisma.user.findUnique({ where: { id: user.id } })
    }
    
    if (!user) {
         return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          )
    }

    // Check if user needs to set password (passwordHash is null)
    const needsPasswordSetup = !user.passwordHash
    // Check if user needs to set PIN (pinHash is null)
    const needsPinSetup = !user.pinHash

    // Generate tokens for login after verification
    const accessToken = generateToken({ userId: user.id, role: user.role })
    const refreshToken = generateToken({ userId: user.id, role: user.role })

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Phone verified successfully',
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      user: { ...userWithoutPassword, isVerified: true },
      // Indicate next steps for client
      requiresPasswordSetup: needsPasswordSetup,
      requiresPinSetup: needsPinSetup,
      nextStep: needsPasswordSetup ? 'SET_PASSWORD' : (needsPinSetup ? 'SET_PIN' : 'COMPLETE'),
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
