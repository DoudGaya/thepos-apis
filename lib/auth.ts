import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export function generateToken(payload: { userId: string; role: string }, expiresIn: string = '1h'): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions)
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
  } catch (error) {
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
