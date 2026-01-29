import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyToken } from '@/lib/auth';

/**
 * Debug endpoint to test JWT generation and verification in production
 * This helps diagnose secret mismatch issues
 */
export async function GET(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    
    // Generate a test token
    const testPayload = { userId: 'test-user-123', role: 'USER' };
    let generatedToken: string | null = null;
    let verificationResult: any = null;
    let generationError: string | null = null;
    let verificationError: string | null = null;
    
    try {
      generatedToken = generateToken(testPayload, '1m');
    } catch (e: any) {
      generationError = e.message;
    }
    
    if (generatedToken) {
      try {
        verificationResult = verifyToken(generatedToken);
      } catch (e: any) {
        verificationError = e.message;
      }
    }
    
    // Get the auth header if present to test that token too
    const authHeader = request.headers.get('authorization');
    let providedTokenVerification: any = null;
    let providedTokenError: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const providedToken = authHeader.substring(7).trim();
      try {
        providedTokenVerification = verifyToken(providedToken);
      } catch (e: any) {
        providedTokenError = e.message;
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      secrets: {
        JWT_SECRET: {
          present: !!jwtSecret,
          prefix: jwtSecret ? jwtSecret.substring(0, 5) : null,
          suffix: jwtSecret ? jwtSecret.substring(jwtSecret.length - 5) : null,
          length: jwtSecret?.length || 0,
        },
        NEXTAUTH_SECRET: {
          present: !!nextAuthSecret,
          prefix: nextAuthSecret ? nextAuthSecret.substring(0, 5) : null,
          suffix: nextAuthSecret ? nextAuthSecret.substring(nextAuthSecret.length - 5) : null,
          length: nextAuthSecret?.length || 0,
        },
        match: jwtSecret === nextAuthSecret,
      },
      selfTest: {
        generatedToken: generatedToken ? `${generatedToken.substring(0, 30)}...` : null,
        generationError,
        verificationResult,
        verificationError,
        selfTestPassed: !generationError && !verificationError && !!verificationResult,
      },
      providedTokenTest: authHeader ? {
        tokenPrefix: authHeader.substring(7, 37) + '...',
        verificationResult: providedTokenVerification,
        verificationError: providedTokenError,
      } : 'No Authorization header provided',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'JWT test failed', 
      message: error.message 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
