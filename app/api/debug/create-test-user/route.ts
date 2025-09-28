import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    // Delete existing test user if exists
    await prisma.user.deleteMany({
      where: {
        email: 'testuser@example.com'
      }
    });

    // Create a test user directly without OTP verification
    const hashedPin = await hashPassword('123456');
    
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phone: '2348123456700',
        passwordHash: hashedPin,
        isVerified: true,
        referralCode: 'TEST123',
        credits: 1000.00, // Give test user some balance
      }
    });

    // Generate tokens
    const accessToken = generateToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = generateToken({
      userId: user.id,
      role: user.role,
    }, '7d');

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          credits: user.credits
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error: any) {
    console.error('Test user creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test user',
        details: error.message 
      },
      { status: 500 }
    );
  }
}