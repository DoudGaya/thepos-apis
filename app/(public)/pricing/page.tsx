'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Phone, Wifi, Zap, Tv, Trophy, GraduationCap,
  ArrowRight, Loader2, ChevronDown, ChevronUp,
  Check, Sparkles, Shield
} from 'lucide-react'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone,
  Wifi,
  Zap,
  Tv,
  Trophy,
  GraduationCap,
}

// Types
interface DataPlan {
  id: string
  name: string
  size: string
  sizeGB?: number
  validity: string
  price: number
  discount?: number
  pricePerGB?: number
}

interface NetworkData {
  network: string
  plans: DataPlan[]
  totalPlans: number
  colors: {
    bg: string
    text: string
    accent: string
  }
}

interface AirtimeNetwork {
  network: string
  discountPercent: number
  minAmount: number
  maxAmount: number
  colors: {
    bg: string
    text: string
    accent: string
  }
}

interface ServiceInfo {
  id: string
  name: string
  description: string
  icon: string
  networks?: string[]
  providers?: string[]
  discountRange?: string
  minAmount?: number
  maxAmount?: number
}

interface PricingData {
  services: ServiceInfo[]
  dataPricing: {
    networks: NetworkData[]
    totalPlans: number
  }
  airtimePricing: {
    networks: AirtimeNetwork[]
  }
  electricityProviders: string[]
  cableProviders: string[]
  bettingProviders: string[]
  examProviders: string[]
}

// Format currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price)
}

// Network Tab Component
function NetworkTab({ 
  network, 
  isActive, 
  onClick, 
  colors 
}: { 
  network: string
  isActive: boolean
  onClick: () => void
  colors: { bg: string; text: string; accent: string }
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
        isActive
          ? `${colors.accent} text-white shadow-lg`
          : `${colors.bg} ${colors.text} hover:shadow-md`
      }`}
    >
      {network}
    </button>
  )
}

// Data Plan Card
function DataPlanCard({ plan }: { plan: DataPlan }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.size}</h4>
        {plan.discount && plan.discount > 0 && (
          <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
            -{plan.discount}%
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{plan.validity}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(plan.price)}</span>
      </div>
      {plan.pricePerGB && (
        <p className="text-xs text-zinc-400 mt-1">
          {formatPrice(plan.pricePerGB)}/GB
        </p>
      )}
    </div>
  )
}

// Service Card Component
function ServiceCard({ 
  service, 
  children 
}: { 
  service: ServiceInfo
  children?: React.ReactNode 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const IconComponent = iconMap[service.icon] || Wifi

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{service.name}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{service.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {service.discountRange && (
              <span className="hidden sm:inline-block text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                Save {service.discountRange}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && children && (
        <div className="px-6 pb-6 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          {children}
        </div>
      )}
    </div>
  )
}

// Cache configuration
const CACHE_KEY = 'nillarpay_pricing_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

interface CachedData {
  data: PricingData
  timestamp: number
}

// Helper to get cached data from localStorage
function getCachedPricing(): PricingData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const { data, timestamp }: CachedData = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_TTL
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return data
  } catch {
    return null
  }
}

// Helper to save data to localStorage cache
function setCachedPricing(data: PricingData): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheEntry: CachedData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry))
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

// Main Pricing Page Component
export default function PricingPage() {
  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeNetwork, setActiveNetwork] = useState<string>('MTN')
  const [isFromCache, setIsFromCache] = useState(false)

  useEffect(() => {
    const loadPricing = async () => {
      // First, try to load from cache
      const cachedData = getCachedPricing()
      
      if (cachedData) {
        setPricingData(cachedData)
        setIsFromCache(true)
        if (cachedData.dataPricing.networks.length > 0) {
          setActiveNetwork(cachedData.dataPricing.networks[0].network)
        }
        setIsLoading(false)
        
        // Optionally refresh in background after 30 minutes
        const shouldRefresh = true // Could add more logic here
        if (!shouldRefresh) return
      }
      
      // Fetch fresh data from API
      try {
        const response = await fetch('/api/pricing', {
          next: { revalidate: 3600 } // Next.js fetch cache
        })
        const data = await response.json()
        
        if (data.success) {
          setPricingData(data.data)
          setCachedPricing(data.data)
          setIsFromCache(false)
          
          // Set first available network as active (only if not already set from cache)
          if (!cachedData && data.data.dataPricing.networks.length > 0) {
            setActiveNetwork(data.data.dataPricing.networks[0].network)
          }
        } else if (!cachedData) {
          setError('Failed to load pricing data')
        }
      } catch (err) {
        if (!cachedData) {
          setError('Failed to load pricing data')
          console.error('Pricing fetch error:', err)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPricing()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading pricing...</p>
        </div>
      </div>
    )
  }

  if (error || !pricingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Something went wrong'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-zinc-900 dark:text-zinc-100 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const activeNetworkData = pricingData.dataPricing.networks.find(
    n => n.network === activeNetwork
  )

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-zinc-900 to-zinc-800 text-white py-20 pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Our Pricing
          </h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-8">
            Enjoy the best rates in Nigeria for data, airtime, and bill payments. 
            No hidden charges, instant delivery.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Check className="w-5 h-5 text-green-400" />
              <span>Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span>Best Rates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Data Plans Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Data Bundles</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Choose from our wide range of affordable data plans across all networks.
              {pricingData.dataPricing.totalPlans > 0 && (
                <span className="text-zinc-900 dark:text-zinc-100 font-medium"> {pricingData.dataPricing.totalPlans}+ plans available.</span>
              )}
            </p>
          </div>

          {/* Network Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {pricingData.dataPricing.networks.map(networkData => (
              <NetworkTab
                key={networkData.network}
                network={networkData.network}
                isActive={activeNetwork === networkData.network}
                onClick={() => setActiveNetwork(networkData.network)}
                colors={networkData.colors}
              />
            ))}
          </div>

          {/* Plans Grid */}
          {activeNetworkData && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {activeNetwork} Data Plans
                </h3>
                {activeNetworkData.totalPlans > 10 && (
                  <span className="text-sm text-zinc-500">
                    Showing 10 of {activeNetworkData.totalPlans} plans
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {activeNetworkData.plans.map(plan => (
                  <DataPlanCard key={plan.id} plan={plan} />
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                >
                  Get Started to Purchase
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Airtime Section */}
      <section className="py-16 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Airtime Top-up</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Buy airtime at discounted rates for all Nigerian networks. Instant delivery guaranteed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pricingData.airtimePricing.networks.map(network => (
              <div 
                key={network.network}
                className={`${network.colors.bg} rounded-2xl p-6 border border-zinc-200 dark:border-zinc-700`}
              >
                <div className={`w-12 h-12 ${network.colors.accent} rounded-xl flex items-center justify-center mb-4`}>
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <h3 className={`text-xl font-bold ${network.colors.text} mb-1`}>
                  {network.network}
                </h3>
                <p className="text-zinc-600 text-sm mb-4">
                  {network.discountPercent}% discount
                </p>
                <div className="text-sm text-zinc-500">
                  <p>Min: {formatPrice(network.minAmount)}</p>
                  <p>Max: {formatPrice(network.maxAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Services Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Bill Payments</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Pay your bills instantly with no extra charges. We support all major providers.
            </p>
          </div>

          <div className="space-y-4">
            {/* Electricity */}
            <ServiceCard service={{ 
              id: 'electricity', 
              name: 'Electricity', 
              description: 'Pay electricity bills instantly',
              icon: 'Zap'
            }}>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Supported Providers:</p>
                <div className="flex flex-wrap gap-2">
                  {pricingData.electricityProviders.map(provider => (
                    <span 
                      key={provider}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Amount Range: ₦1,000 - ₦500,000
                </p>
              </div>
            </ServiceCard>

            {/* Cable TV */}
            <ServiceCard service={{ 
              id: 'cable', 
              name: 'Cable TV', 
              description: 'Subscribe to your favorite TV packages',
              icon: 'Tv'
            }}>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Supported Providers:</p>
                <div className="flex flex-wrap gap-2">
                  {pricingData.cableProviders.map(provider => (
                    <span 
                      key={provider}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
            </ServiceCard>

            {/* Betting */}
            <ServiceCard service={{ 
              id: 'betting', 
              name: 'Betting Wallet Funding', 
              description: 'Fund your betting accounts instantly',
              icon: 'Trophy'
            }}>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Supported Platforms:</p>
                <div className="flex flex-wrap gap-2">
                  {pricingData.bettingProviders.map(provider => (
                    <span 
                      key={provider}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-zinc-500 mt-4">
                  Amount Range: ₦100 - ₦500,000
                </p>
              </div>
            </ServiceCard>

            {/* Exam E-Pins */}
            <ServiceCard service={{ 
              id: 'epins', 
              name: 'Exam E-Pins', 
              description: 'Purchase exam scratch cards and tokens',
              icon: 'GraduationCap'
            }}>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Supported Exams:</p>
                <div className="flex flex-wrap gap-2">
                  {pricingData.examProviders.map(provider => (
                    <span 
                      key={provider}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
            </ServiceCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-zinc-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Join thousands of Nigerians enjoying the best rates on data, airtime, and bills.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-zinc-100 transition-colors"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
