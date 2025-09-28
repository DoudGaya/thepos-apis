import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Try to explicitly load dotenv
  try {
    require('dotenv').config();
  } catch (error) {
    console.log('Dotenv load error:', error);
  }

  try {
    // Allow debug access without auth for development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Debug endpoint only available in development' }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Environment debug',
      env: {
        JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing',
        JWT_SECRET_RAW: process.env.JWT_SECRET?.substring(0, 10) + '...',
        DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Missing',
        PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? 'Present' : 'Missing',
        TERMII_API_KEY: process.env.TERMII_API_KEY ? 'Present' : 'Missing',
        PAIRGATE_API_KEY: process.env.PAIRGATE_API_KEY ? 'Present' : 'Missing',
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
      },
      nodeEnv: process.env.NODE_ENV,
      envKeys: Object.keys(process.env).filter(key => 
        key.includes('JWT') || 
        key.includes('SECRET') || 
        key.includes('PAYSTACK') || 
        key.includes('DATABASE') || 
        key.includes('TERMII') ||
        key.includes('PAIRGATE')
      ),
    });
  } catch (error) {
    console.error('Environment debug error:', error);
    return NextResponse.json({ error: 'Failed to check environment' }, { status: 500 });
  }
}