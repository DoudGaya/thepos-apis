import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authUser = await getAuthenticatedUser(request)

    // 2. Parse body
    const body = await request.json()
    const { identifier } = body

    console.log(`🔍 [Validate Recipient] Searching for: "${identifier}" by user: ${authUser.id}`)

    if (!identifier || identifier.length < 3) {
      return NextResponse.json(
        { message: 'Invalid identifier' },
        { status: 400 }
      )
    }

    // Normalize phone number for search
    // If it looks like a phone number (digits only or starting with +)
    let phoneSearchConditions: any[] = [
      { phone: { contains: identifier } },
      { phone: { equals: identifier } }
    ];

    // Clean the identifier to just digits
    const digitsOnly = identifier.replace(/\D/g, '');
    
    if (digitsOnly.length >= 10) {
      // If we have at least 10 digits, try to match the last 10 digits
      // This handles 080... vs 23480... vs +23480...
      const last10 = digitsOnly.slice(-10);
      phoneSearchConditions.push({ phone: { contains: last10 } });
      
      // Also try specifically with 234 prefix if user typed 0...
      if (identifier.startsWith('0')) {
        const with234 = '234' + identifier.substring(1);
        phoneSearchConditions.push({ phone: { equals: with234 } });
      }
    }

    // 3. Search user
    // Search by email or phone
    // We search ALL users first, then check if it's self to give better error message
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: identifier, mode: 'insensitive' } },
          ...phoneSearchConditions
        ]
      },
      take: 5,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true
      }
    })

    if (users.length === 0) {
      console.log(`❌ [Validate Recipient] User not found for: "${identifier}"`)
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Filter out self from results
    const validUsers = users.filter(u => u.id !== authUser.id);

    if (validUsers.length === 0 && users.length > 0) {
       // Only found self
       console.log(`⚠️ [Validate Recipient] User tried to transfer to self: ${users[0].email}`)
       return NextResponse.json(
        { message: 'You cannot transfer money to yourself' },
        { status: 400 }
      )
    }

    console.log(`✅ [Validate Recipient] Found ${validUsers.length} users`)

    // 4. Return result
    return NextResponse.json(validUsers.map(user => ({
      id: user.id,
      username: user.email.split('@')[0], // Fake username from email
      email: user.email,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
    })))

  } catch (error: any) {
    console.error('Validate recipient error:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
