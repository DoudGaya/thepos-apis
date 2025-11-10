import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const setPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 Set Password endpoint hit')
    const body = await request.json()
    
    const parsed = setPasswordSchema.parse(body)
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

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await hashPassword(parsed.password)
    console.log('✅ Password hashed successfully')

    // Update user with password
    console.log('💾 Updating user with password...')
    const updatedUser = await prisma.user.update({
      where: { id: parsed.userId },
      data: { passwordHash: hashedPassword },
    })
    console.log('✅ User password updated:', updatedUser.email)

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
      },
    })
  } catch (error) {
    console.error('❌ Set Password error:', error)

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
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
