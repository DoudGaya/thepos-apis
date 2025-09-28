import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Explicitly load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('Dotenv load error in auth.ts:', error);
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

console.log('🔑 Auth module JWT_SECRET status:', JWT_SECRET ? 'Present' : 'Missing');

export function generateToken(payload: { userId: string; role: string }, expiresIn: string = '1h'): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
  }
  console.log('🔑 Generating token with secret:', JWT_SECRET.substring(0, 10) + '...');
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions)
}

export function verifyToken(token: string) {
  try {
    console.log('🔑 Verifying token with secret:', JWT_SECRET.substring(0, 10) + '...');
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
  } catch (error) {
    console.log('❌ Token verification failed:', error);
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
