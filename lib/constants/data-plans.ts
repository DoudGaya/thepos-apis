// Temporary data plans while vendor integration is fixed
// Base prices - we add ₦100 margin to each plan

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

// Helper to calculate selling price (cost + ₦100 margin)
export const calculateSellingPrice = (costPrice: number) => costPrice + 100

// Helper to format data size
export const formatDataSize = (mb: number) => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)}GB`
  }
  return `${mb}MB`
}

export const getAllPlansForNetwork = (network: keyof typeof DATA_PLANS) => {
  return DATA_PLANS[network].map(plan => ({
    ...plan,
    network,
    sellingPrice: calculateSellingPrice(plan.costPrice),
    profit: 100, // Fixed ₦100 margin
    isAvailable: true,
  }))
}