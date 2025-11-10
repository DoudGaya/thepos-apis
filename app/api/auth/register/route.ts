import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateReferralCode, formatPhoneNumber, generateOTP } from '@/lib/auth'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { z } from 'zod'

export const runtime = 'nodejs'

const registerSchema = z.object({
  // Phase 1: Minimal registration - only email and phone
  email: z.string().email('Valid email is required'),
  phone: z.string().min(11, 'Phone number is required'),
  // Legacy fields for backward compatibility
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits').regex(/^\d+$/, 'PIN must contain only numbers').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  referralCode: z.string().optional(),
  acceptedMarketing: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  console.log('🚀 Registration endpoint hit');
  try {
    console.log('📋 Reading request body...')
    const body = await request.json()
    console.log('📥 Registration request body:', JSON.stringify(body, null, 2))
    
    console.log('✔️  Parsing schema...')
    const parsed = registerSchema.parse(body)
    console.log('✅ Schema validation passed')
    
    // Phase 1: Only email and phone required for OTP generation
    const { email, phone: phoneNumber, firstName: passedFirstName, lastName: passedLastName } = parsed
    console.log('📊 Extracted fields:', { email, phoneNumber, passedFirstName, passedLastName })

    // Handle phone number formats
    if (!phoneNumber) {
      console.error('❌ Phone number missing')
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format phone number
    console.log('📞 Formatting phone number:', phoneNumber)
    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log('✅ Formatted phone:', formattedPhone)

    // Check if user already exists
    console.log('🔍 Checking for existing user with email or phone...')
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: formattedPhone },
        ],
      },
    })
    console.log('✔️  Existing user check completed')

    if (existingUser) {
      console.log('❌ User already exists:', { email: existingUser.email, phone: existingUser.phone })
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: `Email already registered: ${email}. Please use a different email or sign in instead.` },
          { status: 400 }
        )
      } else if (existingUser.phone === formattedPhone) {
        return NextResponse.json(
          { error: `Phone number already registered: ${formattedPhone}. Please use a different phone number or sign in instead.` },
          { status: 400 }
        )
      }
    }

    // Generate unique referral code
    console.log('🎲 Generating unique referral code...')
    let newReferralCode
    let attempts = 0
    do {
      newReferralCode = generateReferralCode()
      attempts++
      if (attempts > 100) throw new Error('Could not generate unique referral code after 100 attempts')
    } while (await prisma.user.findUnique({ where: { referralCode: newReferralCode } }))
    console.log('✅ Unique referral code generated:', newReferralCode, `(attempts: ${attempts})`)

    // Prepare user data
    console.log('📝 Preparing user creation data...')
    const userCreateData = {
      firstName: passedFirstName && passedFirstName.trim().length > 0 ? passedFirstName.trim() : null,
      lastName: passedLastName && passedLastName.trim().length > 0 ? passedLastName.trim() : null,
      email,
      phone: formattedPhone,
      passwordHash: null,
      referralCode: newReferralCode,
      isVerified: false,
    }
    console.log('✔️  User data prepared:', { email, phone: formattedPhone, referralCode: newReferralCode })

    console.log('👤 CREATING USER IN DATABASE...')
    const user = await prisma.user.create({
      data: userCreateData,
    })
    console.log('✅ USER CREATED SUCCESSFULLY:', user.id)
    console.log('📊 New user details:', { id: user.id, email: user.email, phone: user.phone, firstName: user.firstName, lastName: user.lastName, passwordHash: user.passwordHash })

    // Generate OTP
    console.log('🔐 Generating OTP code...')
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    console.log('✅ OTP Generated:', otpCode, 'Expires at:', expiresAt)

    // Create OTP record
    console.log('💾 STORING OTP IN DATABASE...')
    const otpRecord = await prisma.oTP.create({
      data: {
        phone: formattedPhone,
        code: otpCode,
        type: 'REGISTER',
        expiresAt,
      },
    })
    console.log('✅ OTP RECORD CREATED SUCCESSFULLY:', otpRecord.id)

    // Send OTP via SMS - don't fail if this fails
    console.log('📱 SENDING SMS OTP...')
    try {
      const smsPhone = smsService.formatPhoneForSMS(formattedPhone)
      console.log('✔️  SMS phone formatted:', smsPhone)
      await smsService.sendOTP(smsPhone, otpCode)
      console.log('✅ SMS SENT SUCCESSFULLY')
    } catch (smsError) {
      console.warn('⚠️  SMS FAILED (registration will continue):', smsError instanceof Error ? smsError.message : String(smsError))
    }

    // Send Email - don't fail if this fails
    console.log('📧 SENDING EMAIL OTP...')
    try {
      await emailService.sendOTP(email, otpCode)
      console.log('✅ EMAIL SENT SUCCESSFULLY')
    } catch (emailError) {
      console.warn('⚠️  EMAIL FAILED (registration will continue):', emailError instanceof Error ? emailError.message : String(emailError))
    }

    const responseData = {
      success: true,
      message: 'Registration successful. Please verify your phone number.',
      requiresVerification: true,
      data: {
        phone: formattedPhone,
        userId: user.id,
      }
    }
    
    console.log('✅ REGISTRATION SUCCESSFUL, SENDING RESPONSE')
    console.log('📤 Response:', JSON.stringify(responseData, null, 2))
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('❌❌❌ REGISTRATION ERROR ❌❌❌')
    console.error('Error type:', error instanceof Error ? 'Error' : typeof error)
    console.error('Full error object:', error)
    
    if (error instanceof z.ZodError) {
      console.error('🔍 Zod validation error - invalid input format')
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
      console.error('📋 Error name:', error.name)
      console.error('📋 Stack trace:', error.stack)
      
      // Return more specific error messages for known issues
      if (error.message.includes('Unique constraint failed')) {
        console.error('🔑 Unique constraint violation')
        return NextResponse.json(
          { error: 'Email or phone number already registered' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Could not generate unique referral code')) {
        console.error('🎲 Referral code generation failed')
        return NextResponse.json(
          { error: 'Unable to generate registration code. Please try again.' },
          { status: 500 }
        )
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        { error: `Server error: ${error.message}` },
        { status: 500 }
      )
    }

    console.error('❌ Unknown error type')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
