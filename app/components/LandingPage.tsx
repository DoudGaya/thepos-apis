'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import {
  ArrowRight, Check, Loader2, Smartphone, CheckCircle2,
  TrendingUp, Headset, Star, Zap, ShieldCheck,
  Wallet, CreditCard, Globe, BadgeCheck,
  ChevronRight, Sparkles, Shield, Lock
} from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { cn } from '@/lib/utils'

// Types
type PurchaseStep = 'PHONE' | 'OTP' | 'PLAN' | 'PAYMENT' | 'SUCCESS'
type ServiceType = 'DATA' | 'AIRTIME'

// Constants
const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']
const DATA_PLANS = [
  { id: '1GB', network: 'MTN', name: '1GB SME', price: 250, validity: '30 Days' },
  { id: '2GB', network: 'MTN', name: '2GB SME', price: 500, validity: '30 Days' },
  { id: '5GB', network: 'MTN', name: '5GB SME', price: 1250, validity: '30 Days' },
  { id: '10GB', network: 'MTN', name: '10GB SME', price: 2500, validity: '30 Days' },
  { id: '1GB', network: 'AIRTEL', name: '1GB Corporate', price: 260, validity: '30 Days' },
  { id: '2GB', network: 'AIRTEL', name: '5GB Corporate', price: 1300, validity: '30 Days' },
  { id: '1GB', network: 'GLO', name: '1GB Corporate', price: 240, validity: '30 Days' },
  { id: '2GB', network: 'GLO', name: '2GB Corporate', price: 480, validity: '30 Days' },
  { id: '1GB', network: '9MOBILE', name: '1GB SME', price: 230, validity: '30 Days' },
]

const STATS = [
  { value: '₦2B+', label: 'Transaction Volume' },
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<3s', label: 'Avg. Delivery' },
]

const PARTNERS = [
  'MTN Nigeria', 'Airtel', 'Glo', '9mobile', 'Paystack', 'Flutterwave', 
  'DSTV', 'GOtv', 'EKEDC', 'IKEDC', 'BET9JA', 'SportyBet'
]

const SERVICES = [
  { icon: Smartphone, title: 'Airtime & Data', description: 'Instant VTU for all networks at unbeatable rates' },
  { icon: Zap, title: 'Electricity', description: 'Pay DISCO bills instantly for all distribution companies' },
  { icon: Globe, title: 'Cable TV', description: 'DSTV, GOtv, Startimes subscriptions made easy' },
  { icon: CreditCard, title: 'Betting Wallets', description: 'Fund Bet9ja, SportyBet, 1xBet and more' },
  { icon: BadgeCheck, title: 'Exam Pins', description: 'WAEC, NECO, NABTEB scratch cards' },
  { icon: Wallet, title: 'Wallet System', description: 'Secure wallet with instant funding options' },
]

const BENEFITS = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Transactions processed in under 3 seconds with our advanced automation systems.',
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    icon: ShieldCheck,
    title: 'Bank-Grade Security',
    description: 'PCI-DSS compliant with 256-bit encryption. Your money is always safe.',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    icon: TrendingUp,
    title: 'Best Market Rates',
    description: 'Wholesale pricing for everyone. Resellers earn up to 10% margins.',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    icon: Headset,
    title: '24/7 Support',
    description: 'Round-the-clock customer support via chat, email, and phone.',
    gradient: 'from-purple-500 to-pink-600'
  },
]

const PRICING_PREVIEW = [
  { network: 'MTN', plan: '1GB SME', price: '₦250', validity: '30 Days', savings: '38%' },
  { network: 'Glo', plan: '2GB Corporate', price: '₦480', validity: '30 Days', savings: '40%' },
  { network: 'Airtel', plan: '1GB CG', price: '₦260', validity: '30 Days', savings: '35%' },
  { network: '9mobile', plan: '1.5GB SME', price: '₦300', validity: '30 Days', savings: '42%' },
]

const TESTIMONIALS = [
  {
    name: 'Emmanuel Adebayo',
    role: 'VTU Reseller, Lagos',
    content: 'NillarPay transformed my business. I went from making ₦50k to over ₦300k monthly just by reselling data. The API is incredibly reliable.',
    avatar: 'EA',
    rating: 5
  },
  {
    name: 'Chioma Okonkwo',
    role: 'Business Owner, Abuja',
    content: 'The instant delivery is game-changing. My customers never have to wait, and the rates are the best I\'ve found anywhere. Highly recommended!',
    avatar: 'CO',
    rating: 5
  },
  {
    name: 'David Williams',
    role: 'Software Developer',
    content: 'As a developer, I integrated their API into my fintech app. Documentation is excellent, support is responsive, and uptime is impeccable.',
    avatar: 'DW',
    rating: 5
  },
  {
    name: 'Fatima Hassan',
    role: 'POS Agent, Kano',
    content: 'I\'ve tried many platforms but NillarPay stands out. Failed transactions are rare and refunds are automatic. My customers trust me more now.',
    avatar: 'FH',
    rating: 5
  }
]

const FAQS = [
  { q: 'How do I get started?', a: 'Simply create a free account with your phone number, fund your wallet, and start transacting. No documentation required for personal accounts.' },
  { q: 'How do I fund my wallet?', a: 'Fund instantly via Bank Transfer, Card Payment, or USSD. We support all major Nigerian banks with instant crediting.' },
  { q: 'Is the data delivery instant?', a: 'Yes! 99.9% of transactions are delivered within 3 seconds automatically. Our system is fully automated 24/7.' },
  { q: 'What are the reseller benefits?', a: 'Resellers get access to even better rates (up to 10% discount), dedicated support, API access, and volume-based bonuses.' },
  { q: 'What happens if a transaction fails?', a: 'Our system automatically detects failures and refunds your wallet instantly. No need to contact support.' },
  { q: 'Is my money safe?', a: 'Absolutely. We use bank-grade encryption, and your funds are held in regulated escrow accounts. We\'re CBN-compliant.' },
]

export default function LandingPage() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initialTheme = savedTheme || systemTheme
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  // Quick Purchase State
  const [step, setStep] = useState<PurchaseStep>('PHONE')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [userToken, setUserToken] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('DATA')
  const [network, setNetwork] = useState('MTN')
  const [plan, setPlan] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState('')

  // Quick Purchase Actions
  const handleSendOtp = async () => {
    if (phone.length < 10) {
      toast.error('Invalid phone number')
      return
    }
    setLoading(true)
    try {
      try {
        await axios.post('/api/auth/send-otp', { phone, type: 'REGISTER' })
        toast.success('OTP Sent!')
        setStep('OTP')
      } catch (regError: unknown) {
        const err = regError as { response?: { data?: { error?: string } } }
        if (err.response?.data?.error?.includes('already registered')) {
          await axios.post('/api/auth/send-otp', { phone, type: 'LOGIN' })
          toast.success('OTP sent (Account exists)')
          setStep('OTP')
        } else {
          throw regError
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Invalid OTP')
      return
    }
    setLoading(true)
    try {
      try {
        const res = await axios.post('/api/auth/verify-otp', { phone, code: otp, type: 'REGISTER' })
        setUserToken(res.data.token)
        setUserEmail(res.data.user?.email || `${phone}@nillarpay.app`)
        setStep('PLAN')
        return
      } catch { /* Try login */ }
      const res = await axios.post('/api/auth/verify-otp', { phone, code: otp, type: 'LOGIN' })
      setUserToken(res.data.token)
      setUserEmail(res.data.user?.email || `${phone}@nillarpay.app`)
      setStep('PLAN')
    } catch {
      toast.error('Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = () => {
    if (!amount || amount < 50) {
      toast.error('Invalid amount')
      return
    }
    if (serviceType === 'DATA' && !plan) {
      toast.error('Please select a plan')
      return
    }
    const paystack = (window as unknown as { PaystackPop?: { setup: (config: unknown) => { openIframe: () => void } } }).PaystackPop
    if (!paystack) {
      toast.error('Payment gateway loading...')
      return
    }
    const ref = `QP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const handler = paystack.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amount * 100,
      ref,
      currency: 'NGN',
      callback: async (response: { reference: string }) => {
        setLoading(true)
        try {
          await axios.post('/api/store/quick-checkout', {
            reference: response.reference,
            email: userEmail,
            amount,
            serviceType,
            network,
            phoneNumber: phone,
            planCode: plan
          })
          setStep('SUCCESS')
          toast.success('Order Completed!')
        } catch {
          toast.error('Order processing failed. Contact support.')
        } finally {
          setLoading(false)
        }
      },
      onClose: () => toast.info('Payment cancelled'),
    })
    handler.openIframe()
  }

  // Suppress unused variable warnings
  void userToken

  return (
    <div className="relative overflow-hidden">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      
      {/* Crystal Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Light Mode Crystal Effect */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-white via-zinc-100 to-transparent rounded-full blur-3xl opacity-60 dark:opacity-0 transition-opacity duration-500" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-zinc-100 via-white to-transparent rounded-full blur-3xl opacity-40 dark:opacity-0 transition-opacity duration-500" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-zinc-50 to-transparent rounded-full blur-3xl opacity-50 dark:opacity-0 transition-opacity duration-500" />
        
        {/* Dark Mode Crystal Effect */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-zinc-800 via-zinc-900 to-transparent rounded-full blur-3xl opacity-0 dark:opacity-40 transition-opacity duration-500" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-r from-zinc-900 via-zinc-800 to-transparent rounded-full blur-3xl opacity-0 dark:opacity-30 transition-opacity duration-500" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-zinc-800 to-transparent rounded-full blur-3xl opacity-0 dark:opacity-40 transition-opacity duration-500" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200/50 dark:border-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Trusted by 50,000+ Nigerians</span>
              <ChevronRight className="h-4 w-4" />
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-zinc-900 dark:text-white">The Future of</span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                  Bill Payments
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
              Experience lightning-fast airtime, data, electricity, and bill payments. 
              Built for speed. Designed for Nigeria.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/auth/register" 
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-all shadow-lg shadow-zinc-900/20 dark:shadow-white/20"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#quick-buy" 
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-zinc-900 dark:text-white bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 backdrop-blur-sm transition-all"
              >
                Try Quick Top-up
              </Link>
            </div>

            {/* Trust Signals */}
            <div className="pt-8 flex flex-wrap items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span>CBN Licensed</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-500" />
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>99.9% Uptime</span>
              </div>
            </div>
          </div>

          {/* Quick Purchase Widget */}
          <div id="quick-buy" className="relative z-10">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-red-500/10 rounded-3xl blur-2xl opacity-60" />
            
            <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/20 p-8">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Quick Top-up</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No account needed</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-6">
                {step === 'PHONE' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 outline-none transition-all text-lg text-zinc-900 dark:text-white"
                        placeholder="080 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
                    </button>
                  </div>
                )}

                {step === 'OTP' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Verification Code</label>
                      <input
                        type="number"
                        className="w-full px-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-center tracking-[0.5em] text-2xl font-mono text-zinc-900 dark:text-white"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                      />
                      <p className="text-xs text-zinc-500 mt-3 text-center">
                        Sent to {phone} 
                        <button onClick={() => setStep('PHONE')} className="text-amber-600 dark:text-amber-400 font-medium ml-2 hover:underline">Change</button>
                      </p>
                    </div>
                    <button
                      onClick={handleVerifyOtp}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}

                {step === 'PLAN' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <button onClick={() => setServiceType('DATA')} className={cn("py-3 text-sm font-semibold rounded-lg transition-all", serviceType === 'DATA' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500")}>Data</button>
                      <button onClick={() => setServiceType('AIRTIME')} className={cn("py-3 text-sm font-semibold rounded-lg transition-all", serviceType === 'AIRTIME' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500")}>Airtime</button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {NETWORKS.map(net => (
                        <button
                          key={net}
                          onClick={() => setNetwork(net)}
                          className={cn("py-3 text-xs font-semibold rounded-lg border-2 transition-all", network === net ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300")}
                        >
                          {net}
                        </button>
                      ))}
                    </div>

                    {serviceType === 'DATA' ? (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                        {DATA_PLANS.filter(p => p.network === network).map(p => (
                          <button
                            key={`${p.network}-${p.id}`}
                            onClick={() => { setPlan(p.id); setAmount(p.price); }}
                            className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all", plan === p.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300")}
                          >
                            <div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</div>
                              <div className="text-xs text-zinc-500">{p.validity}</div>
                            </div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">₦{p.price}</div>
                          </button>
                        ))}
                        {DATA_PLANS.filter(p => p.network === network).length === 0 && (
                          <div className="text-center py-8 text-zinc-500">No plans available</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Amount</label>
                        <input
                          type="number"
                          className="w-full px-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-lg text-zinc-900 dark:text-white"
                          placeholder="₦100 - ₦50,000"
                          value={customAmount}
                          onChange={(e) => { setCustomAmount(e.target.value); setAmount(Number(e.target.value)) }}
                        />
                      </div>
                    )}

                    <button
                      onClick={() => setStep('PAYMENT')}
                      disabled={!amount || amount <= 0}
                      className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Proceed to Pay
                    </button>
                  </div>
                )}

                {step === 'PAYMENT' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Service</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{serviceType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Network</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{network}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Recipient</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{phone}</span>
                      </div>
                      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                        <span className="font-semibold text-zinc-900 dark:text-white">Total</span>
                        <span className="text-2xl font-bold text-zinc-900 dark:text-white">₦{amount.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay ₦${amount.toLocaleString()}`}
                    </button>
                    <button onClick={() => setStep('PLAN')} className="w-full text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 font-medium">← Back</button>
                  </div>
                )}

                {step === 'SUCCESS' && (
                  <div className="text-center py-10 animate-in zoom-in duration-300">
                    <div className="h-20 w-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Success!</h3>
                    <p className="text-zinc-500 mb-8">Your transaction has been processed.</p>
                    <button onClick={() => { setStep('PHONE'); setAmount(0); setPlan(''); setOtp(''); }} className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">Make another purchase</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners - Infinite Scroll */}
      <section className="py-12 overflow-hidden bg-white/50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <p className="text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Trusted Partners & Networks</p>
        </div>
        
        {/* Scrolling Container */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling track */}
          <div className="flex partners-scroll">
            {[...PARTNERS, ...PARTNERS].map((partner, idx) => (
              <div 
                key={idx} 
                className="flex-shrink-0 mx-8 px-8 py-4 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <span className="text-lg font-bold text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{partner}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Add scroll animation */}
        <style jsx>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .partners-scroll {
            animation: scroll 30s linear infinite;
          }
          .partners-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* Services Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
              All Your Bills, One Platform
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              From airtime to electricity, we&apos;ve got you covered with instant, reliable payments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, idx) => (
              <div 
                key={idx} 
                className="group relative p-8 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-zinc-900/5 dark:hover:shadow-black/20"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <service.icon className="h-7 w-7 text-zinc-700 dark:text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{service.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-zinc-50/80 to-white dark:from-zinc-900/80 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
              Why Choose NillarPay?
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Built for speed, reliability, and scale. The platform of choice for 50,000+ Nigerians.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {BENEFITS.map((benefit, idx) => (
              <div 
                key={idx} 
                className="relative p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden group hover:shadow-2xl hover:shadow-zinc-900/10 dark:hover:shadow-black/30 transition-all duration-300"
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${benefit.gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
                
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <benefit.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">{benefit.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-6">
                <TrendingUp className="h-4 w-4" />
                Save up to 40%
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
                Unbeatable Rates
              </h2>
              <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                Why pay more? Get wholesale prices on every transaction. 
                Whether you&apos;re buying for personal use or reselling, our rates maximize your value.
              </p>
              <div className="space-y-4 mb-10">
                {['No hidden fees or subscriptions', 'Instant delivery on all transactions', 'Volume discounts for resellers', 'API access for developers'].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-lg text-zinc-700 dark:text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                View full pricing
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-5 gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <div>Network</div>
                  <div>Plan</div>
                  <div>Validity</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Savings</div>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {PRICING_PREVIEW.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-4 p-5 text-sm items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <div className="font-bold text-zinc-900 dark:text-white">{item.network}</div>
                      <div className="text-zinc-600 dark:text-zinc-400">{item.plan}</div>
                      <div className="text-zinc-500">{item.validity}</div>
                      <div className="text-right font-bold text-zinc-900 dark:text-white">{item.price}</div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {item.savings}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
              Loved by Nigerians
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Join thousands of satisfied customers who trust NillarPay for their daily transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="relative p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-shadow">
                {/* Quote mark */}
                <div className="absolute top-6 right-8 text-6xl font-serif text-zinc-100 dark:text-zinc-800">&quot;</div>
                
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-8 leading-relaxed relative z-10">&quot;{t.content}&quot;</p>
                
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-white">{t.name}</div>
                    <div className="text-sm text-zinc-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Everything you need to know about NillarPay.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <details 
                key={idx} 
                className="group rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer select-none">
                  <span className="text-lg font-semibold text-zinc-900 dark:text-white pr-8">{faq.q}</span>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-open:bg-zinc-900 dark:group-open:bg-white transition-colors">
                    <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400 group-open:rotate-90 group-open:text-white dark:group-open:text-zinc-900 transition-all" />
                  </div>
                </summary>
                <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white" />
            
            {/* Crystal overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] dark:bg-[radial-gradient(circle_at_30%_50%,rgba(0,0,0,0.1),transparent)]" />
            
            <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-4xl sm:text-5xl font-bold text-white dark:text-zinc-900 mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-zinc-300 dark:text-zinc-600 max-w-2xl mx-auto mb-10">
                Join 50,000+ Nigerians saving money on every transaction. Create your free account in seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-lg"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link 
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl border-2 border-white/30 dark:border-zinc-900/30 text-white dark:text-zinc-900 hover:bg-white/10 dark:hover:bg-zinc-900/10 transition-all"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
