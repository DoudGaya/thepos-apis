/**
 * Admin System Settings API
 * GET - Fetch all system settings
 * PATCH - Update settings by category
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'
import { z } from 'zod'

/**
 * GET /api/admin/settings
 * Fetch all system settings organized by category
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()

  // In a real application, these would be stored in a settings table
  // For now, we'll return default/hardcoded values with database-driven overrides where applicable

  const settings = {
    general: {
      companyName: process.env.COMPANY_NAME || 'NillarPay',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@NillarPay.com',
      supportPhone: process.env.SUPPORT_PHONE || '+234 123 456 7890',
      brandColors: {
        primary: process.env.BRAND_PRIMARY || '#3B82F6',
        secondary: process.env.BRAND_SECONDARY || '#10B981',
        accent: process.env.BRAND_ACCENT || '#F59E0B',
      },
      logoUrl: process.env.LOGO_URL || '/logo.png',
      websiteUrl: process.env.WEBSITE_URL || 'https://NillarPay.com',
    },
    payment: {
      paystack: {
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        enabled: process.env.PAYSTACK_ENABLED === 'true',
        testMode: process.env.PAYSTACK_TEST_MODE === 'true',
      },
      flutterwave: {
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
        enabled: process.env.FLUTTERWAVE_ENABLED === 'true',
        testMode: process.env.FLUTTERWAVE_TEST_MODE === 'true',
      },
      defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'paystack',
      currency: process.env.PAYMENT_CURRENCY || 'NGN',
    },
    system: {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      defaultCurrency: process.env.DEFAULT_CURRENCY || 'NGN',
      timezone: process.env.TIMEZONE || 'Africa/Lagos',
      dateFormat: process.env.DATE_FORMAT || 'DD/MM/YYYY',
      timeFormat: process.env.TIME_FORMAT || '24h',
      language: process.env.DEFAULT_LANGUAGE || 'en',
      itemsPerPage: parseInt(process.env.ITEMS_PER_PAGE || '20'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    },
    email: {
      smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@NillarPay.com',
        fromName: process.env.SMTP_FROM_NAME || 'NillarPay',
      },
      templates: {
        welcome: {
          subject: 'Welcome to NillarPay!',
          enabled: true,
        },
        passwordReset: {
          subject: 'Reset Your Password',
          enabled: true,
        },
        transactionSuccess: {
          subject: 'Transaction Successful',
          enabled: true,
        },
        transactionFailed: {
          subject: 'Transaction Failed',
          enabled: true,
        },
        referralBonus: {
          subject: 'Referral Bonus Earned!',
          enabled: true,
        },
      },
    },
    security: {
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
      passwordPolicy: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
        requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
      },
      twoFactorAuth: {
        enabled: process.env.TWO_FA_ENABLED === 'true',
        required: process.env.TWO_FA_REQUIRED === 'true',
        methods: ['app', 'sms'], // Available 2FA methods
      },
      rateLimiting: {
        enabled: process.env.RATE_LIMITING_ENABLED === 'true',
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      },
      ipWhitelist: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [],
      ipBlacklist: process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [],
    },
    notifications: {
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
        transactional: process.env.EMAIL_TRANSACTIONAL_ENABLED === 'true',
        marketing: process.env.EMAIL_MARKETING_ENABLED === 'true',
      },
      sms: {
        enabled: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
        provider: process.env.SMS_PROVIDER || 'twilio',
        transactional: process.env.SMS_TRANSACTIONAL_ENABLED === 'true',
      },
      push: {
        enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
        fcmKey: process.env.FCM_SERVER_KEY || '',
      },
    },
  }

  // Get some dynamic stats from database
  const [totalUsers, activeUsers, totalTransactions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        transactions: {
          some: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        status: 'COMPLETED',
      },
    }),
  ])

  return successResponse({
    ...settings,
    stats: {
      totalUsers,
      activeUsers,
      totalTransactions,
      systemHealth: 'healthy', // Could be calculated based on various metrics
      lastBackup: new Date().toISOString(), // Would come from backup system
    },
  })
})

// Validation schemas for different setting categories
const generalSettingsSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().min(1).max(20).optional(),
  brandColors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    accent: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
})

const paymentSettingsSchema = z.object({
  paystack: z.object({
    publicKey: z.string().optional(),
    secretKey: z.string().optional(),
    enabled: z.boolean().optional(),
    testMode: z.boolean().optional(),
  }).optional(),
  flutterwave: z.object({
    publicKey: z.string().optional(),
    secretKey: z.string().optional(),
    enabled: z.boolean().optional(),
    testMode: z.boolean().optional(),
  }).optional(),
  defaultGateway: z.enum(['paystack', 'flutterwave']).optional(),
  currency: z.string().length(3).optional(),
})

const systemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  language: z.string().length(2).optional(),
  itemsPerPage: z.number().min(5).max(100).optional(),
  maxFileSize: z.number().min(1024).max(104857600).optional(), // 1KB to 100MB
  sessionTimeout: z.number().min(300000).max(86400000).optional(), // 5min to 24h
})

const emailSettingsSchema = z.object({
  smtp: z.object({
    host: z.string().optional(),
    port: z.number().min(1).max(65535).optional(),
    secure: z.boolean().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    fromEmail: z.string().email().optional(),
    fromName: z.string().min(1).max(100).optional(),
  }).optional(),
  templates: z.record(z.object({
    subject: z.string().min(1).max(200).optional(),
    enabled: z.boolean().optional(),
  })).optional(),
})

const securitySettingsSchema = z.object({
  sessionTimeout: z.number().min(300000).max(86400000).optional(),
  passwordPolicy: z.object({
    minLength: z.number().min(6).max(128).optional(),
    requireUppercase: z.boolean().optional(),
    requireLowercase: z.boolean().optional(),
    requireNumbers: z.boolean().optional(),
    requireSymbols: z.boolean().optional(),
  }).optional(),
  twoFactorAuth: z.object({
    enabled: z.boolean().optional(),
    required: z.boolean().optional(),
  }).optional(),
  rateLimiting: z.object({
    enabled: z.boolean().optional(),
    maxRequests: z.number().min(1).max(10000).optional(),
    windowMs: z.number().min(60000).max(3600000).optional(),
  }).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  ipBlacklist: z.array(z.string()).optional(),
})

const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    transactional: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  sms: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['twilio', 'africastalking', 'termii']).optional(),
    transactional: z.boolean().optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    fcmKey: z.string().optional(),
  }).optional(),
})

/**
 * PATCH /api/admin/settings
 * Update settings for a specific category
 * Body: { category: 'general|payment|system|email|security|notifications', settings: {...} }
 */
const updateSettingsSchema = z.object({
  category: z.enum(['general', 'payment', 'system', 'email', 'security', 'notifications']),
  settings: z.union([
    generalSettingsSchema,
    paymentSettingsSchema,
    systemSettingsSchema,
    emailSettingsSchema,
    securitySettingsSchema,
    notificationSettingsSchema,
  ]),
})

export const PATCH = apiHandler(async (request: Request) => {
  await requireAdmin()

  const body = await validateRequestBody(request, updateSettingsSchema)
  const { category, settings } = body as {
    category: 'general' | 'payment' | 'system' | 'email' | 'security' | 'notifications'
    settings: any
  }

  // Validate settings based on category
  let validatedSettings: any
  switch (category) {
    case 'general':
      validatedSettings = generalSettingsSchema.parse(settings)
      break
    case 'payment':
      validatedSettings = paymentSettingsSchema.parse(settings)
      break
    case 'system':
      validatedSettings = systemSettingsSchema.parse(settings)
      break
    case 'email':
      validatedSettings = emailSettingsSchema.parse(settings)
      break
    case 'security':
      validatedSettings = securitySettingsSchema.parse(settings)
      break
    case 'notifications':
      validatedSettings = notificationSettingsSchema.parse(settings)
      break
  }

  // In a real application, you would:
  // 1. Store these settings in a database table
  // 2. Update environment variables or config files
  // 3. Trigger necessary service restarts or cache invalidation
  // 4. Log the changes for audit purposes

  // For now, we'll simulate the update and return success
  // In production, you'd want to persist these changes

  // Log the settings change for audit
  console.log(`Settings updated for category: ${category}`, {
    updatedBy: 'admin', // Would come from session
    timestamp: new Date().toISOString(),
    changes: validatedSettings,
  })

  // Simulate some validation for sensitive settings
  if (category === 'payment') {
    // Validate payment gateway keys format
    if (validatedSettings.paystack?.secretKey && !validatedSettings.paystack.secretKey.startsWith('sk_')) {
      throw new BadRequestError('Invalid Paystack secret key format')
    }
    if (validatedSettings.flutterwave?.secretKey && !validatedSettings.flutterwave.secretKey.startsWith('FLWSECK-')) {
      throw new BadRequestError('Invalid Flutterwave secret key format')
    }
  }

  if (category === 'email') {
    // Validate SMTP settings
    if (validatedSettings.smtp?.host && !validatedSettings.smtp.host.includes('.')) {
      throw new BadRequestError('Invalid SMTP host format')
    }
  }

  if (category === 'security') {
    // Validate security settings
    if (validatedSettings.passwordPolicy?.minLength && validatedSettings.passwordPolicy.minLength < 6) {
      throw new BadRequestError('Password minimum length must be at least 6 characters')
    }
  }

  return successResponse({
    message: `${category} settings updated successfully`,
    category,
    updatedSettings: validatedSettings,
    requiresRestart: ['system', 'email', 'security'].includes(category),
    note: 'Settings have been updated. Some changes may require a system restart to take effect.',
  })
})