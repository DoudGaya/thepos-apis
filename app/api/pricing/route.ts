/**
 * Public Pricing API
 * GET - Fetch all service pricing for display on public pricing page
 * Cached for 1 hour (3600 seconds) to reduce database load
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

// Cache configuration - revalidate every hour
export const revalidate = 3600
export const dynamic = 'force-static'

// Network colors for UI
const networkColors: Record<string, { bg: string; text: string; accent: string }> = {
  MTN: { bg: 'bg-yellow-50', text: 'text-yellow-700', accent: 'bg-yellow-500' },
  GLO: { bg: 'bg-green-50', text: 'text-green-700', accent: 'bg-green-500' },
  AIRTEL: { bg: 'bg-red-50', text: 'text-red-700', accent: 'bg-red-500' },
  '9MOBILE': { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'bg-emerald-500' },
}

// Service configurations
const serviceConfig = {
  airtime: {
    name: 'Airtime',
    description: 'Instant airtime top-up',
    icon: 'Phone',
    networks: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'],
    discountRange: '1% - 3%',
    minAmount: 50,
    maxAmount: 50000,
  },
  data: {
    name: 'Data Bundles',
    description: 'Affordable data packages',
    icon: 'Wifi',
    networks: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'],
    discountRange: '2% - 10%',
    minAmount: 100,
    maxAmount: 50000,
  },
  electricity: {
    name: 'Electricity',
    description: 'Pay electricity bills instantly',
    icon: 'Zap',
    providers: ['EKEDC', 'IKEDC', 'AEDC', 'PHED', 'IBEDC', 'KEDC', 'EEDC', 'JED', 'BEDC', 'KAEDCO'],
    minAmount: 1000,
    maxAmount: 500000,
  },
  cable: {
    name: 'Cable TV',
    description: 'TV subscription payments',
    icon: 'Tv',
    providers: ['DSTV', 'GOTV', 'STARTIMES', 'SHOWMAX'],
    minAmount: 500,
    maxAmount: 100000,
  },
  betting: {
    name: 'Betting',
    description: 'Fund your betting wallets',
    icon: 'Trophy',
    providers: ['BET9JA', 'SPORTYBET', '1XBET', 'BETKING', 'BETWAY', 'NAIRABET', 'BETLAND', 'SUPABET', '22BET', 'MERRYBET'],
    minAmount: 100,
    maxAmount: 500000,
  },
  epins: {
    name: 'Exam E-Pins',
    description: 'Educational pins & vouchers',
    icon: 'GraduationCap',
    providers: ['WAEC', 'NECO', 'NABTEB', 'JAMB'],
    minAmount: 500,
    maxAmount: 50000,
  },
}

export async function GET() {
  try {
    // Fetch data plans from database
    const dataPlans = await prisma.dataPlan.findMany({
      where: { isActive: true },
      include: { vendor: true },
      orderBy: [{ network: 'asc' }, { sellingPrice: 'asc' }],
    })

    // Fetch Amigo plans from database
    const amigoPlans = await prisma.amigoPlans.findMany({
      where: { isEnabled: true },
      orderBy: [{ networkName: 'asc' }, { dataCapacityValue: 'asc' }],
    })

    // Fetch pricing configurations
    const pricingConfigs = await prisma.pricing.findMany({
      where: { isActive: true },
    })

    // Group data plans by network
    const groupedDataPlans = dataPlans.reduce((acc, plan) => {
      const network = plan.network.toUpperCase()
      if (!acc[network]) acc[network] = []
      acc[network].push({
        id: plan.id,
        name: `${plan.size} ${plan.planType}`,
        size: plan.size,
        type: plan.planType,
        validity: plan.validity,
        price: plan.sellingPrice,
        costPrice: plan.costPrice,
        discount: plan.costPrice > 0 
          ? Math.round(((plan.costPrice - plan.sellingPrice) / plan.costPrice) * 100) 
          : 0,
        vendor: plan.vendor?.vendorName || 'Unknown',
      })
      return acc
    }, {} as Record<string, any[]>)

    // Group Amigo plans by network
    const groupedAmigoPlans = amigoPlans.reduce((acc, plan) => {
      const network = plan.networkName.toUpperCase()
      if (!acc[network]) acc[network] = []
      const price = plan.adminOverridePrice ?? plan.amigoBasePrice
      acc[network].push({
        id: plan.id,
        planId: plan.planId,
        name: `${plan.dataCapacity} (${plan.validityLabel})`,
        size: plan.dataCapacity,
        sizeGB: plan.dataCapacityValue,
        validity: plan.validityLabel,
        validityDays: plan.validityDays,
        price: price,
        basePrice: plan.amigoBasePrice,
        pricePerGB: plan.pricePerGB,
        margin: plan.margin || 0,
      })
      return acc
    }, {} as Record<string, any[]>)

    // Merge plans, preferring Amigo plans if available
    const allDataPlans: Record<string, any[]> = {}
    const networks = new Set([
      ...Object.keys(groupedDataPlans),
      ...Object.keys(groupedAmigoPlans),
    ])

    networks.forEach(network => {
      const amigo = groupedAmigoPlans[network] || []
      const others = groupedDataPlans[network] || []
      // Use Amigo plans if available, otherwise use other vendors
      allDataPlans[network] = amigo.length > 0 ? amigo : others
    })

    // Build response
    const response = {
      services: Object.entries(serviceConfig).map(([key, config]) => ({
        id: key,
        ...config,
        colors: networkColors,
      })),
      dataPricing: {
        networks: Object.entries(allDataPlans).map(([network, plans]) => ({
          network,
          plans: plans.slice(0, 10), // Limit to 10 plans per network for display
          totalPlans: plans.length,
          colors: networkColors[network] || { bg: 'bg-gray-50', text: 'text-gray-700', accent: 'bg-gray-500' },
        })),
        totalPlans: Object.values(allDataPlans).flat().length,
      },
      airtimePricing: {
        networks: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map(network => ({
          network,
          discountPercent: pricingConfigs.find(p => p.service === 'airtime' && p.network === network)?.profitMargin || 2,
          minAmount: 50,
          maxAmount: 50000,
          colors: networkColors[network],
        })),
      },
      electricityProviders: serviceConfig.electricity.providers,
      cableProviders: serviceConfig.cable.providers,
      bettingProviders: serviceConfig.betting.providers,
      examProviders: serviceConfig.epins.providers,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    
    // Return fallback data if database is unavailable
    return NextResponse.json({
      success: true,
      data: {
        services: Object.entries(serviceConfig).map(([key, config]) => ({
          id: key,
          ...config,
          colors: networkColors,
        })),
        dataPricing: {
          networks: [
            {
              network: 'MTN',
              plans: [
                { id: '1', name: '1GB SME (30 Days)', size: '1GB', validity: '30 Days', price: 250 },
                { id: '2', name: '2GB SME (30 Days)', size: '2GB', validity: '30 Days', price: 500 },
                { id: '3', name: '5GB SME (30 Days)', size: '5GB', validity: '30 Days', price: 1250 },
                { id: '4', name: '10GB SME (30 Days)', size: '10GB', validity: '30 Days', price: 2500 },
              ],
              totalPlans: 4,
              colors: networkColors['MTN'],
            },
            {
              network: 'GLO',
              plans: [
                { id: '5', name: '1GB (30 Days)', size: '1GB', validity: '30 Days', price: 240 },
                { id: '6', name: '2GB (30 Days)', size: '2GB', validity: '30 Days', price: 480 },
                { id: '7', name: '5GB (30 Days)', size: '5GB', validity: '30 Days', price: 1200 },
              ],
              totalPlans: 3,
              colors: networkColors['GLO'],
            },
            {
              network: 'AIRTEL',
              plans: [
                { id: '8', name: '1GB CG (30 Days)', size: '1GB', validity: '30 Days', price: 260 },
                { id: '9', name: '2GB CG (30 Days)', size: '2GB', validity: '30 Days', price: 520 },
                { id: '10', name: '5GB CG (30 Days)', size: '5GB', validity: '30 Days', price: 1300 },
              ],
              totalPlans: 3,
              colors: networkColors['AIRTEL'],
            },
            {
              network: '9MOBILE',
              plans: [
                { id: '11', name: '1GB (30 Days)', size: '1GB', validity: '30 Days', price: 230 },
                { id: '12', name: '2GB (30 Days)', size: '2GB', validity: '30 Days', price: 460 },
              ],
              totalPlans: 2,
              colors: networkColors['9MOBILE'],
            },
          ],
          totalPlans: 12,
        },
        airtimePricing: {
          networks: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map(network => ({
            network,
            discountPercent: 2,
            minAmount: 50,
            maxAmount: 50000,
            colors: networkColors[network],
          })),
        },
        electricityProviders: serviceConfig.electricity.providers,
        cableProviders: serviceConfig.cable.providers,
        bettingProviders: serviceConfig.betting.providers,
        examProviders: serviceConfig.epins.providers,
      },
    })
  }
}
