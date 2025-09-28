import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Debug endpoint to check authentication and user data
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    console.log('Debug - Token received:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization required',
        debug: 'No token provided in Authorization header'
      }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      console.log('Debug - Token decoded successfully:', { userId: decoded.userId });
    } catch (jwtError) {
      console.log('Debug - JWT verification failed:', jwtError);
      return NextResponse.json({ 
        error: 'Invalid token',
        debug: 'JWT verification failed'
      }, { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true,
        email: true, 
        firstName: true,
        lastName: true,
        credits: true, 
        updatedAt: true,
        isVerified: true,
      },
    });

    if (!user) {
      console.log('Debug - User not found for ID:', decoded.userId);
      return NextResponse.json({ 
        error: 'User not found',
        debug: `No user found with ID: ${decoded.userId}`
      }, { status: 404 });
    }

    console.log('Debug - User found:', { 
      id: user.id, 
      email: user.email, 
      credits: user.credits,
      isVerified: user.isVerified 
    });

    return NextResponse.json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        credits: user.credits,
        isVerified: user.isVerified,
        lastUpdated: user.updatedAt.toISOString(),
      },
      debug: {
        tokenPresent: true,
        tokenValid: true,
        userFound: true,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}