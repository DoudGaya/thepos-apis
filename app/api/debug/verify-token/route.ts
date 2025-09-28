import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    return NextResponse.json({
      success: true,
      decoded,
      rawToken: token.substring(0, 20) + '...',
      jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
      jwtSecretRaw: process.env.JWT_SECRET?.substring(0, 10) + '...'
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Token verification failed',
      details: error.message,
      jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
      jwtSecretRaw: process.env.JWT_SECRET?.substring(0, 10) + '...'
    }, { status: 401 });
  }
}