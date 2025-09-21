import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Handle empty request body gracefully
    let body = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('No body provided for logout, using empty object');
    }
    
    const { refreshToken } = logoutSchema.parse(body)

    // For now, we'll just return success
    // In a production app, you might want to blacklist tokens
    console.log('User logged out, refresh token:', refreshToken)

    return NextResponse.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )
  }
}
