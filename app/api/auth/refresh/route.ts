import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, verifyToken } from '@/lib/auth'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')

    let body;
    try {
      body = await request.json()
    } catch (e) {
      console.error('❌ Failed to parse refresh request body - likely empty. Content-Type:', contentType)
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const { refreshToken } = refreshSchema.parse(body)
    console.log('🔄 Attempting to refresh token...')

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken)
    } catch (err) {
      console.error('❌ Refresh token verification failed:', (err as any).message)
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid refresh token structure' },
        { status: 401 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      console.error('❌ User not found for refresh token:', decoded.userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const accessToken = generateToken({ userId: user.id, role: user.role }, '1h')
    const newRefreshToken = generateToken({ userId: user.id, role: user.role }, '7d')

    // Log the new token signature for debugging
    const newTokenSig = accessToken.split('.')[2]?.substring(0, 20) || 'N/A';
    console.log(`✅ Token refreshed for user: ${user.email} newTokenSig=${newTokenSig}... tokenLen=${accessToken.length}`)
    
    return NextResponse.json({
      message: 'Token refreshed successfully',
      token: accessToken,
      accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Refresh token unexpected error:', error)

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
