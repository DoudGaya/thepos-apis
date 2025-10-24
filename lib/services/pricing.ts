/**
 * Pricing Configuration Service
 * Centralized pricing and profit margin management
 */

/**
 * Fixed profit margin for all services (₦100)
 */
export const FIXED_PROFIT_MARGIN = 100

/**
 * Service-specific profit margins
 * These can be overridden by database Pricing model when available
 */
export const PROFIT_MARGINS = {
  // Data bundles
  DATA: {
    MTN: FIXED_PROFIT_MARGIN,
    GLO: FIXED_PROFIT_MARGIN,
    AIRTEL: FIXED_PROFIT_MARGIN,
    '9MOBILE': FIXED_PROFIT_MARGIN,
  },
  
  // Airtime (percentage-based)
  AIRTIME: {
    MTN: 2.5, // 2.5% profit
    GLO: 3.0,
    AIRTEL: 2.5,
    '9MOBILE': 3.0,
  },
  
  // Electricity
  ELECTRICITY: FIXED_PROFIT_MARGIN,
  
  // Cable TV
  CABLE_TV: FIXED_PROFIT_MARGIN,
  
  // Betting
  BETTING: FIXED_PROFIT_MARGIN,
  
  // E-pins
  EPINS: FIXED_PROFIT_MARGIN,
}

/**
 * Calculate selling price with profit margin
 */
export function calculateSellingPrice(
  vendorCost: number,
  profitMargin: number,
  isPercentage: boolean = false
): { sellingPrice: number; profit: number } {
  const profit = isPercentage 
    ? (vendorCost * profitMargin) / 100 
    : profitMargin

  return {
    sellingPrice: vendorCost + profit,
    profit,
  }
}

/**
 * Get profit margin for a service
 */
export function getProfitMargin(
  service: keyof typeof PROFIT_MARGINS,
  network?: string
): number {
  const margins = PROFIT_MARGINS[service]
  
  if (typeof margins === 'number') {
    return margins
  }
  
  if (network && typeof margins === 'object' && network in margins) {
    return (margins as any)[network]
  }
  
  return FIXED_PROFIT_MARGIN
}

/**
 * Calculate data bundle pricing
 */
export function calculateDataPricing(vendorCost: number, network: string) {
  const profitMargin = getProfitMargin('DATA', network)
  return calculateSellingPrice(vendorCost, profitMargin, false)
}

/**
 * Calculate airtime pricing
 */
export function calculateAirtimePricing(amount: number, network: string) {
  const profitMargin = getProfitMargin('AIRTIME', network)
  return calculateSellingPrice(amount, profitMargin, true) // Percentage-based
}

/**
 * Calculate electricity pricing
 */
export function calculateElectricityPricing(vendorCost: number) {
  return calculateSellingPrice(vendorCost, FIXED_PROFIT_MARGIN, false)
}

/**
 * Calculate cable TV pricing
 */
export function calculateCableTVPricing(vendorCost: number) {
  return calculateSellingPrice(vendorCost, FIXED_PROFIT_MARGIN, false)
}

/**
 * Calculate betting wallet pricing
 */
export function calculateBettingPricing(vendorCost: number) {
  return calculateSellingPrice(vendorCost, FIXED_PROFIT_MARGIN, false)
}

/**
 * Calculate e-pins pricing
 */
export function calculateEpinsPricing(vendorCost: number) {
  return calculateSellingPrice(vendorCost, FIXED_PROFIT_MARGIN, false)
}

/**
 * Format transaction details with pricing breakdown
 */
export function formatTransactionDetails(
  vendorCost: number,
  sellingPrice: number,
  profit: number,
  additionalDetails: Record<string, any> = {}
) {
  return {
    ...additionalDetails,
    pricing: {
      vendorCost,
      sellingPrice,
      profit,
      profitMargin: profit,
    },
  }
}

export default {
  FIXED_PROFIT_MARGIN,
  PROFIT_MARGINS,
  calculateSellingPrice,
  getProfitMargin,
  calculateDataPricing,
  calculateAirtimePricing,
  calculateElectricityPricing,
  calculateCableTVPricing,
  calculateBettingPricing,
  calculateEpinsPricing,
  formatTransactionDetails,
}
