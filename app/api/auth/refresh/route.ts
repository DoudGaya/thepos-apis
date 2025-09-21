import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, verifyToken } from '@/lib/auth'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = refreshSchema.parse(body)

    // Verify refresh token
    const decoded = verifyToken(refreshToken)
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const accessToken = generateToken({ userId: user.id, role: user.role }, '1h')
    const newRefreshToken = generateToken({ userId: user.id, role: user.role }, '7d')

    return NextResponse.json({
      message: 'Token refreshed successfully',
      token: accessToken,
      accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    )
  }
}
