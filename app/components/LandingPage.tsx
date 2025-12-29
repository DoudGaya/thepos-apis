'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import {
  ArrowRight, Check, Loader2, Smartphone, CheckCircle2,
  TrendingUp, Headset, Star, HelpCircle, Zap, ShieldCheck
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
  // Add more mock plans as needed or fetch from API
]

const BENEFITS = [
  {
    title: "Instant Delivery",
    description: "Automated systems ensure your data and airtime are delivered in under 5 seconds.",
    className: "md:col-span-2",
    icon: Zap
  },
  {
    title: "Bank-Grade Security",
    description: "We use PCI-DSS compliant payment processors and strict encryption standards.",
    className: "md:col-span-1",
    icon: ShieldCheck
  },
  {
    title: "Best Market Rates",
    description: "Get wholesale prices on data bundles. Resell and keep the margins.",
    className: "md:col-span-1",
    icon: TrendingUp
  },
  {
    title: "24/7 Support",
    description: "Our team is always online to resolve any issues instantly.",
    className: "md:col-span-2",
    icon: Headset
  }
]

const PRICING_PREVIEW = [
  { network: 'MTN', plan: '1GB SME', price: '₦250', validity: '30 Days' },
  { network: 'GLO', plan: '1GB Corporate', price: '₦240', validity: '30 Days' },
  { network: 'Airtel', plan: '1GB Corporate', price: '₦260', validity: '30 Days' },
  { network: '9mobile', plan: '1GB SME', price: '₦230', validity: '30 Days' },
]

const TESTIMONIALS = [
  {
    name: "Emmanuel A.",
    role: "Data Reseller",
    content: "NillarPay transformed my business. The instant delivery means my customers are always happy.",
    initials: "EA"
  },
  {
    name: "Chioma O.",
    role: "Student",
    content: "I save so much money buying data here compared to banking apps. It's ridiculous.",
    initials: "CO"
  },
  {
    name: "David W.",
    role: "Freelancer",
    content: "The API is super reliable. I integrated it into my own dashboard and it just works.",
    initials: "DW"
  }
]

const FAQS = [
  { q: "How do I fund my wallet?", a: "You can fund your wallet via Bank Transfer or Card payment instantly from your dashboard." },
  { q: "Is the data delivery instant?", a: "Yes, 99.9% of transactions are delivered within 5 seconds automatically." },
  { q: "Can I upgrade my account?", a: "Yes, active resellers get access to even cheaper rates based on volume." },
  { q: "What happens if a transaction fails?", a: "Our system automatically detects failures and refunds your wallet instantly." },
]

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initialTheme = savedTheme || systemTheme
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  // Quick Purchase State
  const [step, setStep] = useState<PurchaseStep>('PHONE')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [userToken, setUserToken] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [serviceType, setServiceType] = useState<ServiceType>('DATA')
  const [network, setNetwork] = useState('MTN')
  const [plan, setPlan] = useState('') // Plan ID
  const [amount, setAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState('')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Quick Purchase Actions
  const handleSendOtp = async () => {
    if (phone.length < 10) {
      toast.error('Invalid phone number')
      return
    }
    setLoading(true)
    try {
      // Try Register flow first
      try {
        await axios.post('/api/auth/send-otp', { phone, type: 'REGISTER' })
        toast.success('OTP Sent!')
        setStep('OTP')
      } catch (regError: any) {
        // If already registered, try Login flow
        if (regError.response?.data?.error?.includes('already registered')) {
          await axios.post('/api/auth/send-otp', { phone, type: 'LOGIN' })
          toast.success('OTP sent (Account exists)')
          setStep('OTP')
        } else {
          throw regError
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send OTP')
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
      // Logic: Try Register, fallback to Login? 
      // We don't know the type for sure, but maybe we can guess or try both?
      // Actually verify-otp takes 'type' but mostly for looking up the OTP record.
      // We should know which one we sent.
      // Complexity: To keep it simple, we'll assume matching the last successful send.
      // But for robust quick purchase, let's try REGISTER first (most users new?), if fails try LOGIN.
      // Or better: `send-otp` could store state? No.

      // Let's assume passed type based on previous step success?
      // Simplified: Try LOGIN type first (since REGISTER marks verify). 
      // Actually, let's just try 'LOGIN' as default fallback?
      // Wait, Paystack requires email. If we login, we get email.

      // Attempt 1: Try as REGISTER
      try {
        const res = await axios.post('/api/auth/verify-otp', { phone, code: otp, type: 'REGISTER' })
        setUserToken(res.data.token)
        setUserEmail(res.data.user?.email || `${phone}@nillarpay.app`)
        setStep('PLAN')
        return
      } catch (e) { }

      // Attempt 2: Try as LOGIN
      const res = await axios.post('/api/auth/verify-otp', { phone, code: otp, type: 'LOGIN' })
      setUserToken(res.data.token)
      setUserEmail(res.data.user?.email || `${phone}@nillarpay.app`)
      setStep('PLAN')

    } catch (error: any) {
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

    const paystack = (window as any).PaystackPop
    if (!paystack) {
      toast.error('Payment gateway loading...')
      return
    }

    const ref = `QP-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const handler = paystack.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amount * 100, // kobo
      ref,
      currency: 'NGN',
      callback: async (response: any) => {
        setLoading(true)
        try {
          await axios.post('/api/store/quick-checkout', {
            reference: response.reference,
            email: userEmail,
            amount,
            serviceType,
            network,
            phoneNumber: phone, // Self topup for quick buy
            planCode: plan
          })
          setStep('SUCCESS')
          toast.success('Order Completed!')
        } catch (error) {
          toast.error('Order processing failed. Contact support.')
        } finally {
          setLoading(false)
        }
      },
      onClose: () => {
        toast.info('Payment cancelled')
      },
    })
    handler.openIframe()
  }

  return (
    <div className="animate-in fade-in duration-500">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-3 py-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Instant Network Settlement
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]">
              The modern standard for <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">VTU & Bills.</span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
              Experience lightning-fast top-ups, detailed analytics, and reseller-friendly rates. Built for speed, designed for scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all">
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="#quick-buy" className="inline-flex items-center justify-center px-6 py-3 border border-zinc-200 dark:border-zinc-800 text-base font-medium rounded-lg text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                Quick Top-up
              </Link>
            </div>

            <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-8 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> 99.9% Uptime</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Instant API</div>
            </div>
          </div>

          {/* Quick Purchase Widget */}
          <div id="quick-buy" className="relative z-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl transform rotate-3 scale-105 opacity-50 blur-xl"></div>
            <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">

              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Quick Top-up</h3>
                  <p className="text-sm text-zinc-500">No login required.</p>
                </div>
                <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-zinc-900 dark:text-white" />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-6">
                {/* Step 1: Phone */}
                {step === 'PHONE' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                        placeholder="080 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                    </button>
                  </div>
                )}

                {/* Step 2: OTP */}
                {step === 'OTP' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Enter Verification Code</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-center tracking-widest text-lg"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                      />
                      <p className="text-xs text-zinc-500 mt-2 text-center">Sent to {phone} <button onClick={() => setStep('PHONE')} className="text-zinc-900 dark:text-white underline ml-1">Change</button></p>
                    </div>
                    <button
                      onClick={handleVerifyOtp}
                      disabled={loading}
                      className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}

                {/* Step 3: Plan */}
                {step === 'PLAN' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    {/* Service Type Tab */}
                    <div className="grid grid-cols-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                      <button onClick={() => setServiceType('DATA')} className={cn("py-2 text-sm font-medium rounded-md transition-all", serviceType === 'DATA' ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-zinc-500")}>Data</button>
                      <button onClick={() => setServiceType('AIRTIME')} className={cn("py-2 text-sm font-medium rounded-md transition-all", serviceType === 'AIRTIME' ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-zinc-500")}>Airtime</button>
                    </div>

                    {/* Network */}
                    <div className="grid grid-cols-4 gap-2">
                      {NETWORKS.map(net => (
                        <button
                          key={net}
                          onClick={() => setNetwork(net)}
                          className={cn("py-2 px-1 text-xs font-medium rounded-lg border transition-all", network === net ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:border-zinc-400")}
                        >
                          {net}
                        </button>
                      ))}
                    </div>

                    {/* Plan Selection (Data) or Amount (Airtime) */}
                    {serviceType === 'DATA' ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {DATA_PLANS.filter(p => p.network === network).map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setPlan(p.id); setAmount(p.price); }}
                            className={cn("w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all", plan === p.id ? "border-green-500 bg-green-50 dark:bg-green-900/10 ring-1 ring-green-500" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300")}
                          >
                            <div>
                              <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{p.name}</div>
                              <div className="text-xs text-zinc-500">{p.validity}</div>
                            </div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">₦{p.price}</div>
                          </button>
                        ))}
                        {DATA_PLANS.filter(p => p.network === network).length === 0 && (
                          <div className="text-center py-4 text-sm text-zinc-500">No plans available</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount</label>
                        <input
                          type="number"
                          className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                          placeholder="100 - 50000"
                          value={customAmount}
                          onChange={(e) => { setCustomAmount(e.target.value); setAmount(Number(e.target.value)) }}
                        />
                      </div>
                    )}

                    <button
                      onClick={() => setStep('PAYMENT')}
                      disabled={!amount || amount <= 0}
                      className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4"
                    >
                      Proceed to Pay
                    </button>
                  </div>
                )}

                {/* Step 4: Payment */}
                {step === 'PAYMENT' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Service</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{serviceType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Network</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{network}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Recipient</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{phone}</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                        <span className="font-medium text-zinc-900 dark:text-white">Total</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white">₦{amount.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₦${amount.toLocaleString()}`}
                    </button>
                    <button onClick={() => setStep('PLAN')} className="w-full text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Back to Plan</button>
                  </div>
                )}

                {/* Success */}
                {step === 'SUCCESS' && (
                  <div className="text-center py-8 animate-in zoom-in duration-300">
                    <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600 dark:text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Top-up Successful!</h3>
                    <p className="text-zinc-500 mb-6">Your transaction has been processed and credited.</p>
                    <button onClick={() => { setStep('PLAN'); setAmount(0); }} className="text-sm font-medium text-zinc-900 dark:text-white underline">Make another purchase</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners / Trust Section */}
      <section className="py-10 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-zinc-500 mb-6">TRUSTED BY 10,000+ MERCHANTS & RESELLERS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 items-center justify-items-center">
            {['MTN', 'Airtel', 'Glo', '9mobile'].map(partner => (
              <div key={partner} className="h-12 flex items-center justify-center font-bold text-2xl text-zinc-400 dark:text-zinc-600">{partner}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits (Bento Grid) */}
      <section id="features" className="py-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">Everything you need to scale.</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Built for speed, reliability, and scale. NillarPay is the platform of choice for serious resellers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((benefit, idx) => (
              <div key={idx} className={cn("relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors", benefit.className)}>
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-6">
                  <benefit.icon className="h-6 w-6 text-zinc-900 dark:text-white" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 bg-white dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl mb-6">Unbeatable market rates.</h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
                Stop overpaying for data. Get wholesale prices instantly and keep the profit margin for yourself.
                Whether you're buying for personal use or reselling, our rates are designed to maximize your value.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">No hidden fees or monthly subscriptions</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">Instant activation upon payment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">API access for developers</span>
                </div>
              </div>
              <div className="mt-10">
                <Link href="/pricing" className="text-sm font-medium text-zinc-900 dark:text-white underline hover:no-underline">View full pricing sheet &rarr;</Link>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <div>Network</div>
                <div>Plan</div>
                <div>Validity</div>
                <div className="text-right">Price</div>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {PRICING_PREVIEW.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-4 p-4 text-sm items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="font-semibold text-zinc-900 dark:text-white">{item.network}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{item.plan}</div>
                    <div className="text-zinc-500">{item.validity}</div>
                    <div className="text-right font-bold text-zinc-900 dark:text-white">{item.price}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 text-center border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-500">Prices subject to network availability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white text-center mb-16">Loved by Nigerians.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative">
                <div className="flex items-center gap-1 mb-6 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-white">{t.name}</div>
                    <div className="text-sm text-zinc-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="group border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none select-none">
                  <span className="font-medium text-zinc-900 dark:text-white group-hover:text-black dark:group-hover:text-zinc-200 transition-colors">{faq.q}</span>
                  <HelpCircle className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                </summary>
                <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
