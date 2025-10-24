/**
 * Admin Vendor Monitoring API
 * GET - Monitor vendor health and balances
 */

import {
  apiHandler,
  successResponse,
  requireAdmin,
} from '@/lib/api-utils'
import vtuService from '@/lib/vtu'

/**
 * GET /api/admin/vendors
 * Monitor all vendor services (VTU.NG, Paystack)
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  // Check VTU.NG service status and balance
  let vtuStatus = {
    name: 'VTU.NG',
    status: 'unknown' as 'active' | 'inactive' | 'unknown' | 'error',
    balance: 0,
    error: null as string | null,
    lastChecked: new Date().toISOString(),
    services: {
      airtime: 'unknown' as 'active' | 'inactive' | 'unknown',
      data: 'unknown' as 'active' | 'inactive' | 'unknown',
      electricity: 'unknown' as 'active' | 'inactive' | 'unknown',
      cable: 'unknown' as 'active' | 'inactive' | 'unknown',
    },
  }

  try {
    // Try to get VTU balance to verify service is working
    const balance = await vtuService.checkBalance()
    vtuStatus.balance = balance
    vtuStatus.status = balance > 1000 ? 'active' : 'inactive' // Warn if balance is low
    vtuStatus.services = {
      airtime: 'active',
      data: 'active',
      electricity: 'active',
      cable: 'active',
    }
  } catch (error: any) {
    vtuStatus.status = 'error'
    vtuStatus.error = error.message || 'Failed to connect to VTU.NG'
  }

  // Check Paystack status
  let paystackStatus = {
    name: 'Paystack',
    status: 'unknown' as 'active' | 'inactive' | 'unknown' | 'error',
    error: null as string | null,
    lastChecked: new Date().toISOString(),
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ? 'configured' : 'missing',
    secretKey: process.env.PAYSTACK_SECRET_KEY ? 'configured' : 'missing',
  }

  try {
    // Try to verify Paystack credentials
    const response = await fetch('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })
    
    if (response.ok) {
      paystackStatus.status = 'active'
    } else {
      paystackStatus.status = 'error'
      paystackStatus.error = 'Invalid API credentials'
    }
  } catch (error: any) {
    paystackStatus.status = 'error'
    paystackStatus.error = error.message || 'Failed to connect to Paystack'
  }

  // Check environment variables
  const envStatus = {
    name: 'Environment Configuration',
    variables: {
      VTU_API_KEY: process.env.VTU_API_KEY ? 'configured' : 'missing',
      VTU_PUBLIC_KEY: process.env.VTU_PUBLIC_KEY ? 'configured' : 'missing',
      VTU_SECRET_KEY: process.env.VTU_SECRET_KEY ? 'configured' : 'missing',
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ? 'configured' : 'missing',
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? 'configured' : 'missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'missing',
    },
    allConfigured: Object.values({
      VTU_API_KEY: process.env.VTU_API_KEY,
      VTU_PUBLIC_KEY: process.env.VTU_PUBLIC_KEY,
      VTU_SECRET_KEY: process.env.VTU_SECRET_KEY,
      PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    }).every(Boolean),
  }

  // Overall system health
  const overallHealth = {
    status: vtuStatus.status === 'active' && paystackStatus.status === 'active' && envStatus.allConfigured
      ? 'healthy'
      : vtuStatus.status === 'error' || paystackStatus.status === 'error'
      ? 'critical'
      : 'warning',
    timestamp: new Date().toISOString(),
  }

  // Get recent transaction success rates
  const recentStats = await getRecentTransactionStats()

  return successResponse({
    health: overallHealth,
    vendors: {
      vtu: vtuStatus,
      paystack: paystackStatus,
    },
    environment: envStatus,
    transactionStats: recentStats,
    recommendations: generateRecommendations(vtuStatus, paystackStatus, envStatus),
  })
})

/**
 * Get recent transaction statistics
 */
async function getRecentTransactionStats() {
  const { prisma } = await import('@/lib/prisma')
  
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const [total, completed, failed, pending] = await Promise.all([
    prisma.transaction.count({
      where: { createdAt: { gte: last24Hours } },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: last24Hours }, status: 'COMPLETED' },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: last24Hours }, status: 'FAILED' },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: last24Hours }, status: 'PENDING' },
    }),
  ])

  const successRate = total > 0 ? (completed / total) * 100 : 0

  return {
    period: 'last24Hours',
    total,
    completed,
    failed,
    pending,
    successRate: Math.round(successRate * 100) / 100,
  }
}

/**
 * Generate recommendations based on vendor status
 */
function generateRecommendations(
  vtu: any,
  paystack: any,
  env: any
): string[] {
  const recommendations: string[] = []

  // VTU.NG recommendations
  if (vtu.status === 'error') {
    recommendations.push('🔴 CRITICAL: VTU.NG service is not responding. Check API credentials.')
  } else if (vtu.balance < 1000) {
    recommendations.push('⚠️ WARNING: VTU.NG balance is low (₦' + vtu.balance.toLocaleString() + '). Please top up.')
  } else if (vtu.balance < 5000) {
    recommendations.push('⚠️ VTU.NG balance is below ₦5,000. Consider topping up soon.')
  }

  // Paystack recommendations
  if (paystack.status === 'error') {
    recommendations.push('🔴 CRITICAL: Paystack service is not responding. Verify API credentials.')
  } else if (paystack.publicKey === 'missing' || paystack.secretKey === 'missing') {
    recommendations.push('⚠️ WARNING: Paystack credentials are missing. Payment processing may fail.')
  }

  // Environment recommendations
  if (!env.allConfigured) {
    const missing = Object.entries(env.variables)
      .filter(([_, value]) => value === 'missing')
      .map(([key]) => key)
    
    recommendations.push(
      `⚠️ Missing environment variables: ${missing.join(', ')}. Configure these in your .env file.`
    )
  }

  // Success rate recommendations
  // This would be populated by the transaction stats
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operational. No issues detected.')
  }

  return recommendations
}
