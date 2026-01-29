/**
 * Edge-compatible JWT verification using jose library
 * This is used by middleware.ts which runs in Edge Runtime
 */
import * as jose from 'jose'

// Same secret as in auth.ts - keep in sync
const HARDCODED_SECRET = '63c755db67f6547ae57064428adb5ef4a43ee8a6bcd05912e3c6b5edbfd26fc0';

function getJwtSecret(): string {
  const jwtEnv = process.env.JWT_SECRET;
  const nextAuthEnv = process.env.NEXTAUTH_SECRET;
  const envSecret = jwtEnv || nextAuthEnv;
  const secret = envSecret || HARDCODED_SECRET;
  
  const source = jwtEnv ? 'JWT_SECRET' : (nextAuthEnv ? 'NEXTAUTH_SECRET' : 'HARDCODED');
  const preview = secret ? `${secret.substring(0,5)}...${secret.substring(secret.length-5)}` : 'NONE';
  console.log(`[auth-edge] getJwtSecret source=${source} preview=${preview}`);
  
  return secret;
}

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function verifyTokenEdge(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();
  const secretKey = new TextEncoder().encode(secret);
  
  try {
    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    
    console.log(`[auth-edge] ✅ Token verified for userId=${payload.userId}`);
    
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error: any) {
    console.error(`[auth-edge] ❌ Verification failed: ${error.code} - ${error.message}`);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token expired');
    }
    
    throw new Error('Invalid token');
  }
}
