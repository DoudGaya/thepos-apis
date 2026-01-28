import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { firstName, lastName, phone } = await request.json()

    // Validate input
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, and phone are required' },
        { status: 400 }
      )
    }

    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input types' },
        { status: 400 }
      )
    }

    const firstNameTrimmed = firstName.trim()
    const lastNameTrimmed = lastName.trim()
    const phoneTrimmed = phone.trim()

    if (firstNameTrimmed.length < 2) {
      return NextResponse.json(
        { error: 'First name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (lastNameTrimmed.length < 2) {
      return NextResponse.json(
        { error: 'Last name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if phone is already taken by another user
    const existingPhone = await prisma.user.findFirst({
        where: { 
            phone: phoneTrimmed,
            NOT: { id: token.sub }
        }
    })

    if (existingPhone) {
        return NextResponse.json(
            { error: 'Phone number already linked to another account' },
            { status: 400 }
        )
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { id: token.sub },
      data: {
        firstName: firstNameTrimmed,
        lastName: lastNameTrimmed,
        phone: phoneTrimmed,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        data: user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
