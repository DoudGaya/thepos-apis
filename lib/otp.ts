import { prisma } from './prisma'

/**
 * Create and store a new OTP record
 */
export async function createOTP(
  phone: string,
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD',
  expiryMinutes: number = 10
) {
  // Mark previous OTPs as used
  await prisma.oTP.updateMany({
    where: {
      phone,
      type,
      used: false,
    },
    data: {
      used: true,
    },
  })

  // Generate OTP
  const code = generateOTPCode()
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  const otp = await prisma.oTP.create({
    data: {
      phone,
      code,
      type,
      expiresAt,
    },
  })

  return {
    code,
    expiresAt,
    expiryMinutes,
  }
}

/**
 * Verify an OTP code
 */
export async function verifyOTP(
  phone: string,
  code: string,
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'
) {
  const otp = await prisma.oTP.findFirst({
    where: {
      phone,
      code,
      type,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  if (!otp) {
    return {
      valid: false,
      error: 'Invalid or expired OTP',
    }
  }

  // Mark as used
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { used: true },
  })

  return {
    valid: true,
    otp,
  }
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Check if user has unverified OTP attempts
 */
export async function hasUnverifiedOTP(
  phone: string,
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'
): Promise<boolean> {
  const otp = await prisma.oTP.findFirst({
    where: {
      phone,
      type,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  return !!otp
}

/**
 * Get remaining expiry time for an OTP in seconds
 */
export async function getOTPExpiryTime(
  phone: string,
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'
): Promise<number | null> {
  const otp = await prisma.oTP.findFirst({
    where: {
      phone,
      type,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  if (!otp) return null

  const now = new Date().getTime()
  const expiryTime = otp.expiresAt.getTime()
  const remainingSeconds = Math.ceil((expiryTime - now) / 1000)

  return remainingSeconds > 0 ? remainingSeconds : null
}

/**
 * Delete expired OTPs (cleanup)
 */
export async function deleteExpiredOTPs(): Promise<number> {
  const result = await prisma.oTP.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}

/**
 * Rate limit OTP requests (prevent spam)
 * Returns true if user can request new OTP, false if rate limited
 */
export async function canRequestOTP(
  phone: string,
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD',
  maxAttemptsPerHour: number = 5
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const recentAttempts = await prisma.oTP.count({
    where: {
      phone,
      type,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  })

  return recentAttempts < maxAttemptsPerHour
}
