import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Note: dotenv is loaded at application startup, not here
// In Vercel, env vars are injected directly by the platform

// HARDCODED SECRET FOR TESTING - REMOVE AFTER DEBUGGING
const HARDCODED_SECRET = '63c755db67f6547ae57064428adb5ef4a43ee8a6bcd05912e3c6b5edbfd26fc0';

const getJwtSecret = () => {
    // On Vercel, env vars are always available via process.env
    // No dotenv loading needed - it can break in Edge runtime
    const envSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    
    // Log which secret source is being used
    if (process.env.NODE_ENV === 'production') {
        console.log(`[Auth] Secret source: ${envSecret ? 'ENV' : 'HARDCODED'}, ENV present: ${!!envSecret}`);
    }
    
    // Use environment variable if available, otherwise use hardcoded
    const secret = envSecret || HARDCODED_SECRET;
    
    if (!envSecret && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WARNING: Using hardcoded secret - env vars not available');
    }
    
    return secret;
};

// Remove top-level constant to prevent early binding issues
// const JWT_SECRET = ... 

// console.log('🔑 Auth module JWT_SECRET status:', JWT_SECRET ? 'Present' : 'Missing');

export function generateToken(payload: { userId: string; role: string }, expiresIn: string = '1h'): string {
  const secret = getJwtSecret();
  
  if (process.env.NODE_ENV === 'production') {
      const debugSecret = secret ? `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}` : 'UNDEFINED';
      console.log(`[Auth] Generating token. Secret: ${debugSecret}, User: ${payload.userId}`);
  }

  if (secret === 'fallback-secret-key' && process.env.NODE_ENV === 'production') {
     console.warn('⚠️ WARNING: Using fallback secret in production for token generation');
  }
  return jwt.sign(payload, secret, { expiresIn } as SignOptions)
}

export function verifyToken(token: string) {
  const secret = getJwtSecret();
  try {
    if (process.env.NODE_ENV === 'production') {
        const debugSecret = secret ? `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}` : 'UNDEFINED';
        console.log(`[Auth] Verifying token. Secret: ${debugSecret}, Token start: ${token.substring(0, 10)}...`);
    }
    return jwt.verify(token, secret) as { userId: string; role: string }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'production') {
        console.error(`[Auth] Verification failed: ${error.message}. Token: ${token.substring(0, 20)}...`);
    }
    console.log('❌ Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired')
    }
    throw new Error('Invalid token')
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If it starts with 0, replace with 234
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1)
  }
  
  // If it doesn't start with 234, add it
  if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned
  }
  
  return cleaned
}
