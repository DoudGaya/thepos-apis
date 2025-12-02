import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const setPinSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  pin: z.string()
    .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
    .refine(pin => !/^(\d)\1{3}$/.test(pin), 'PIN cannot be all the same digit')
    .refine(pin => {
      // Check for consecutive sequences like 0123, 1234, etc.
      for (let i = 0; i < 3; i++) {
        const digit = parseInt(pin[i])
        if (digit + 1 === parseInt(pin[i + 1])) {
          // Check if it's a consecutive sequence
          let count = 1
          for (let j = i + 1; j < 4; j++) {
            if (parseInt(pin[j - 1]) + 1 === parseInt(pin[j])) {
              count++
            }
          }
          if (count >= 3) return false
        }
      }
      return true
    }, 'PIN cannot contain consecutive numbers'),
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔒 Set PIN endpoint hit')
    const body = await request.json()
    
    const parsed = setPinSchema.parse(body)
    console.log('✅ Schema validation passed')

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
    })

    if (!user) {
      console.error('❌ User not found:', parsed.userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('👤 User found:', user.email)

    // Hash PIN
    console.log('🔐 Hashing PIN...')
    console.log('  - PIN to hash:', parsed.pin)
    console.log('  - PIN length:', parsed.pin.length)
    console.log('  - PIN type:', typeof parsed.pin)
    const hashedPin = await hashPassword(parsed.pin)
    console.log('✅ PIN hashed successfully')
    console.log('  - Hash result:', hashedPin.substring(0, 20) + '...')

    // Update user with PIN
    console.log('💾 Updating user with PIN...')
    const updatedUser = await prisma.user.update({
      where: { id: parsed.userId },
      data: { pinHash: hashedPin },
    })
    console.log('✅ User PIN updated:', updatedUser.email)

    return NextResponse.json({
      success: true,
      message: 'PIN set successfully',
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    console.error('❌ Set PIN error:', error)

    if (error instanceof z.ZodError) {
      console.error('🔍 Validation error:', error.errors[0].message)
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to set PIN' },
      { status: 500 }
    )
  }
}
