import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Note: dotenv is loaded at application startup, not here
// In Vercel, env vars are injected directly by the platform

// HARDCODED SECRET FOR TESTING - REMOVE AFTER DEBUGGING
const HARDCODED_SECRET = '63c755db67f6547ae57064428adb5ef4a43ee8a6bcd05912e3c6b5edbfd26fc0';

const getJwtSecret = () => {
    // On Vercel, env vars are always available via process.env
    // No dotenv loading needed - it can break in Edge runtime
    const jwtEnv = process.env.JWT_SECRET;
    const nextAuthEnv = process.env.NEXTAUTH_SECRET;
    const envSecret = jwtEnv || nextAuthEnv;
    
    // Use environment variable if available, otherwise use hardcoded
    const secret = envSecret || HARDCODED_SECRET;
    
    // ALWAYS log which source is used - critical for debugging
    const source = jwtEnv ? 'JWT_SECRET' : (nextAuthEnv ? 'NEXTAUTH_SECRET' : 'HARDCODED');
    const preview = secret ? `${secret.substring(0,5)}...${secret.substring(secret.length-5)}` : 'NONE';
    console.log(`[getJwtSecret] source=${source} preview=${preview} len=${secret?.length || 0}`);
    
    return secret;
};

// Remove top-level constant to prevent early binding issues
// const JWT_SECRET = ... 

// console.log('🔑 Auth module JWT_SECRET status:', JWT_SECRET ? 'Present' : 'Missing');

export function generateToken(payload: { userId: string; role: string }, expiresIn: string = '1h'): string {
  const secret = getJwtSecret();
  const preview = secret ? `${secret.substring(0,5)}...${secret.substring(secret.length-5)}` : 'NONE';
  console.log(`[generateToken] user=${payload.userId} secret=${preview} expiresIn=${expiresIn}`);

  const token = jwt.sign(payload, secret, { expiresIn } as SignOptions);
  console.log(`[generateToken] tokenLen=${token.length} tokenStart=${token.substring(0,30)}...`);
  return token;
}

export function verifyToken(token: string) {
  const secret = getJwtSecret();
  const preview = secret ? `${secret.substring(0,5)}...${secret.substring(secret.length-5)}` : 'NONE';
  console.log(`[verifyToken] secret=${preview} tokenLen=${token.length} tokenStart=${token.substring(0,30)}...`);
  
  try {
    const decoded = jwt.verify(token, secret) as { userId: string; role: string };
    console.log(`[verifyToken] ✅ SUCCESS user=${decoded.userId}`);
    return decoded;
  } catch (error: any) {
    console.error(`[verifyToken] ❌ FAILED: ${error.name} - ${error.message}`);
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
