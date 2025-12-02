/**
 * DATA PLANS - Fallback Plans (Used when Amigo API is unavailable)
 * These are temporary plans with fixed ₦100 margin for testing/fallback
 */

export const DATA_PLANS = {
  MTN: [
    { id: 'mtn-50mb', name: '50MB', costPrice: 100, validity: '1 Day', dataCapacity: 50, description: 'Daily plan' },
    { id: 'mtn-100mb', name: '100MB', costPrice: 150, validity: '1 Day', dataCapacity: 100, description: 'Daily plan' },
    { id: 'mtn-200mb', name: '200MB', costPrice: 200, validity: '2 Days', dataCapacity: 200, description: '2-day plan' },
    { id: 'mtn-1gb', name: '1GB', costPrice: 300, validity: '1 Day', dataCapacity: 1024, description: 'Daily plan' },
    { id: 'mtn-1gb-7', name: '1GB', costPrice: 500, validity: '7 Days', dataCapacity: 1024, description: 'Weekly plan' },
    { id: 'mtn-2gb', name: '2GB', costPrice: 800, validity: '1 Month', dataCapacity: 2048, description: 'Monthly plan' },
    { id: 'mtn-3gb', name: '3GB', costPrice: 1200, validity: '1 Month', dataCapacity: 3072, description: 'Monthly plan' },
    { id: 'mtn-5gb', name: '5GB', costPrice: 1800, validity: '1 Month', dataCapacity: 5120, description: 'Monthly plan' },
    { id: 'mtn-10gb', name: '10GB', costPrice: 3000, validity: '1 Month', dataCapacity: 10240, description: 'Monthly plan' },
  ],
  GLO: [
    { id: 'glo-50mb', name: '50MB', costPrice: 90, validity: '1 Day', dataCapacity: 50, description: 'Daily plan' },
    { id: 'glo-100mb', name: '100MB', costPrice: 140, validity: '1 Day', dataCapacity: 100, description: 'Daily plan' },
    { id: 'glo-200mb', name: '200MB', costPrice: 190, validity: '2 Days', dataCapacity: 200, description: '2-day plan' },
    { id: 'glo-1gb', name: '1GB', costPrice: 290, validity: '1 Day', dataCapacity: 1024, description: 'Daily plan' },
    { id: 'glo-1gb-7', name: '1GB', costPrice: 490, validity: '7 Days', dataCapacity: 1024, description: 'Weekly plan' },
    { id: 'glo-2gb', name: '2GB', costPrice: 790, validity: '1 Month', dataCapacity: 2048, description: 'Monthly plan' },
    { id: 'glo-3gb', name: '3GB', costPrice: 1190, validity: '1 Month', dataCapacity: 3072, description: 'Monthly plan' },
    { id: 'glo-5gb', name: '5GB', costPrice: 1790, validity: '1 Month', dataCapacity: 5120, description: 'Monthly plan' },
    { id: 'glo-10gb', name: '10GB', costPrice: 2990, validity: '1 Month', dataCapacity: 10240, description: 'Monthly plan' },
  ],
  AIRTEL: [
    { id: 'airtel-50mb', name: '50MB', costPrice: 95, validity: '1 Day', dataCapacity: 50, description: 'Daily plan' },
    { id: 'airtel-100mb', name: '100MB', costPrice: 145, validity: '1 Day', dataCapacity: 100, description: 'Daily plan' },
    { id: 'airtel-200mb', name: '200MB', costPrice: 195, validity: '2 Days', dataCapacity: 200, description: '2-day plan' },
    { id: 'airtel-1gb', name: '1GB', costPrice: 295, validity: '1 Day', dataCapacity: 1024, description: 'Daily plan' },
    { id: 'airtel-1gb-7', name: '1GB', costPrice: 495, validity: '7 Days', dataCapacity: 1024, description: 'Weekly plan' },
    { id: 'airtel-2gb', name: '2GB', costPrice: 795, validity: '1 Month', dataCapacity: 2048, description: 'Monthly plan' },
    { id: 'airtel-3gb', name: '3GB', costPrice: 1195, validity: '1 Month', dataCapacity: 3072, description: 'Monthly plan' },
    { id: 'airtel-5gb', name: '5GB', costPrice: 1795, validity: '1 Month', dataCapacity: 5120, description: 'Monthly plan' },
    { id: 'airtel-10gb', name: '10GB', costPrice: 2995, validity: '1 Month', dataCapacity: 10240, description: 'Monthly plan' },
  ],
  '9MOBILE': [
    { id: '9mobile-50mb', name: '50MB', costPrice: 98, validity: '1 Day', dataCapacity: 50, description: 'Daily plan' },
    { id: '9mobile-100mb', name: '100MB', costPrice: 148, validity: '1 Day', dataCapacity: 100, description: 'Daily plan' },
    { id: '9mobile-200mb', name: '200MB', costPrice: 198, validity: '2 Days', dataCapacity: 200, description: '2-day plan' },
    { id: '9mobile-1gb', name: '1GB', costPrice: 298, validity: '1 Day', dataCapacity: 1024, description: 'Daily plan' },
    { id: '9mobile-1gb-7', name: '1GB', costPrice: 498, validity: '7 Days', dataCapacity: 1024, description: 'Weekly plan' },
    { id: '9mobile-2gb', name: '2GB', costPrice: 798, validity: '1 Month', dataCapacity: 2048, description: 'Monthly plan' },
    { id: '9mobile-3gb', name: '3GB', costPrice: 1198, validity: '1 Month', dataCapacity: 3072, description: 'Monthly plan' },
    { id: '9mobile-5gb', name: '5GB', costPrice: 1798, validity: '1 Month', dataCapacity: 5120, description: 'Monthly plan' },
    { id: '9mobile-10gb', name: '10GB', costPrice: 2998, validity: '1 Month', dataCapacity: 10240, description: 'Monthly plan' },
  ],
} as const

/**
 * AMIGO PLANS - Official Amigo.ng Vendor Plans (17 total: MTN 10, GLO 7)
 * These use Amigo's actual plan IDs for vendor API compatibility
 */
export interface AmigoBasePlan {
  planId: number // Amigo's actual plan ID
  networkName: 'MTN' | 'GLO'
  dataCapacity: string // e.g., "500MB", "1GB", "200GB"
  dataCapacityValue: number // numeric value in GB
  validityDays: number
  validityLabel: string
  amigoBasePrice: number // Amigo's official price in ₦
  pricePerGB: number
  efficiencyRating: number // 100 = 100%
}

/**
 * MTN PLANS from Amigo (10 total)
 * PlanIds: 5000, 1001, 6666, 3333, 9999, 1110, 1515, 424, 379, 301
 */
export const AMIGO_MTN_PLANS: AmigoBasePlan[] = [
  {
    planId: 5000,
    networkName: 'MTN',
    dataCapacity: '500MB',
    dataCapacityValue: 0.5,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 299,
    pricePerGB: 598,
    efficiencyRating: 100,
  },
  {
    planId: 1001,
    networkName: 'MTN',
    dataCapacity: '1GB',
    dataCapacityValue: 1,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 449,
    pricePerGB: 449,
    efficiencyRating: 100,
  },
  {
    planId: 6666,
    networkName: 'MTN',
    dataCapacity: '2GB',
    dataCapacityValue: 2,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 849,
    pricePerGB: 424.5,
    efficiencyRating: 100,
  },
  {
    planId: 3333,
    networkName: 'MTN',
    dataCapacity: '3GB',
    dataCapacityValue: 3,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 1379,
    pricePerGB: 459.67,
    efficiencyRating: 100,
  },
  {
    planId: 9999,
    networkName: 'MTN',
    dataCapacity: '5GB',
    dataCapacityValue: 5,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 1899,
    pricePerGB: 379.8,
    efficiencyRating: 100,
  },
  {
    planId: 1110,
    networkName: 'MTN',
    dataCapacity: '10GB',
    dataCapacityValue: 10,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 3899,
    pricePerGB: 389.9,
    efficiencyRating: 100,
  },
  {
    planId: 1515,
    networkName: 'MTN',
    dataCapacity: '15GB',
    dataCapacityValue: 15,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 5790,
    pricePerGB: 386,
    efficiencyRating: 100,
  },
  {
    planId: 424,
    networkName: 'MTN',
    dataCapacity: '20GB',
    dataCapacityValue: 20,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 7999,
    pricePerGB: 399.95,
    efficiencyRating: 100,
  },
  {
    planId: 379,
    networkName: 'MTN',
    dataCapacity: '36GB',
    dataCapacityValue: 36,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 11900,
    pricePerGB: 330.56,
    efficiencyRating: 100,
  },
  {
    planId: 301,
    networkName: 'MTN',
    dataCapacity: '200GB',
    dataCapacityValue: 200,
    validityDays: 60,
    validityLabel: '60 Days',
    amigoBasePrice: 49900,
    pricePerGB: 249.5,
    efficiencyRating: 100,
  },
]

/**
 * GLO PLANS from Amigo (7 total)
 * PlanIds: 296, 258, 261, 262, 263, 297, 265
 */
export const AMIGO_GLO_PLANS: AmigoBasePlan[] = [
  {
    planId: 296,
    networkName: 'GLO',
    dataCapacity: '200MB',
    dataCapacityValue: 0.2,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 99,
    pricePerGB: 495,
    efficiencyRating: 100,
  },
  {
    planId: 258,
    networkName: 'GLO',
    dataCapacity: '500MB',
    dataCapacityValue: 0.5,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 239,
    pricePerGB: 478,
    efficiencyRating: 100,
  },
  {
    planId: 261,
    networkName: 'GLO',
    dataCapacity: '1GB',
    dataCapacityValue: 1,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 439,
    pricePerGB: 439,
    efficiencyRating: 100,
  },
  {
    planId: 262,
    networkName: 'GLO',
    dataCapacity: '2GB',
    dataCapacityValue: 2,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 849,
    pricePerGB: 424.5,
    efficiencyRating: 100,
  },
  {
    planId: 263,
    networkName: 'GLO',
    dataCapacity: '3GB',
    dataCapacityValue: 3,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 1289,
    pricePerGB: 429.67,
    efficiencyRating: 100,
  },
  {
    planId: 297,
    networkName: 'GLO',
    dataCapacity: '5GB',
    dataCapacityValue: 5,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 2245,
    pricePerGB: 449,
    efficiencyRating: 100,
  },
  {
    planId: 265,
    networkName: 'GLO',
    dataCapacity: '10GB',
    dataCapacityValue: 10,
    validityDays: 30,
    validityLabel: '30 Days',
    amigoBasePrice: 4490,
    pricePerGB: 449,
    efficiencyRating: 100,
  },
]

// Helper to calculate selling price (cost + margin)
export const calculateSellingPrice = (costPrice: number) => costPrice + 100

// Helper to format data size
export const formatDataSize = (mb: number) => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)}GB`
  }
  return `${mb}MB`
}

// Get Amigo plans by network
export const getAmigoPlans = (network: 'MTN' | 'GLO'): AmigoBasePlan[] => {
  return network === 'MTN' ? AMIGO_MTN_PLANS : AMIGO_GLO_PLANS
}

// Get Amigo plan by ID (planId is Amigo's actual plan ID)
export const getAmigoPlansById = (planId: number): AmigoBasePlan | undefined => {
  const allPlans = [...AMIGO_MTN_PLANS, ...AMIGO_GLO_PLANS]
  return allPlans.find(plan => plan.planId === planId)
}

export const getAllPlansForNetwork = (network: keyof typeof DATA_PLANS) => {
  // Use Amigo plans for MTN and GLO
  if (network === 'MTN') {
    return AMIGO_MTN_PLANS.map(plan => ({
      id: plan.planId.toString(),
      name: plan.dataCapacity,
      network,
      costPrice: plan.amigoBasePrice,
      sellingPrice: calculateSellingPrice(plan.amigoBasePrice),
      profit: 100,
      validity: plan.validityLabel,
      dataCapacity: plan.dataCapacityValue * 1024, // Convert GB to MB
      description: `${plan.validityLabel} plan`,
      isAvailable: true,
    }))
  }

  if (network === 'GLO') {
    return AMIGO_GLO_PLANS.map(plan => ({
      id: plan.planId.toString(),
      name: plan.dataCapacity,
      network,
      costPrice: plan.amigoBasePrice,
      sellingPrice: calculateSellingPrice(plan.amigoBasePrice),
      profit: 100,
      validity: plan.validityLabel,
      dataCapacity: plan.dataCapacityValue * 1024, // Convert GB to MB
      description: `${plan.validityLabel} plan`,
      isAvailable: true,
    }))
  }

  // Fallback for other networks
  return DATA_PLANS[network].map(plan => ({
    ...plan,
    network,
    sellingPrice: calculateSellingPrice(plan.costPrice),
    profit: 100, // Fixed ₦100 margin
    isAvailable: true,
  }))
}