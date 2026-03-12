'use client'

import React, { useState, useEffect } from 'react'
import { Check, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { cn } from '@/lib/utils'

type PurchaseStep = 'PHONE' | 'OTP' | 'PLAN' | 'PAYMENT' | 'SUCCESS'
type ServiceType = 'DATA' | 'AIRTIME'

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']

export const QuickOrderLanding = () => {
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
  const [dataPlans, setDataPlans] = useState<any[]>([])

  // Suppress unused variable warning
  void userToken

  // Check for payment callback on mount
  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get('payment_status') === 'verifying') {
        const reference = params.get('reference') || params.get('orderNo')
        if (!reference) return

        setLoading(true)
        setStep('PAYMENT')

        try {
          await axios.post('/api/store/quick-checkout', {
            reference,
            email: params.get('email'),
            amount: Number(params.get('amount')),
            serviceType: params.get('serviceType'),
            network: params.get('network'),
            phoneNumber: params.get('phone'),
            planCode: params.get('plan'),
            provider: 'opay',
          })
          setStep('SUCCESS')
          toast.success('Order Completed!')
        } catch {
          toast.error('Order processing failed. Contact support.')
        } finally {
          setLoading(false)
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    }
    verifyPayment()
  }, [])

  // Fetch data plans when network or serviceType changes
  useEffect(() => {
    if (serviceType === 'DATA') {
      const fetchPlans = async () => {
        try {
          const res = await axios.get(`/api/data/plans?network=${network}`)
          const data = res.data.data || {}
          const margin = data.profitMargin || 0
          const mappedPlans = (data.plans || []).map((p: any) => ({
            ...p,
            price: (p.costPrice || 0) + margin,
          }))
          setDataPlans(mappedPlans)
        } catch {
          setDataPlans([])
        }
      }
      fetchPlans()
    }
  }, [network, serviceType])

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
        const errMsg = err.response?.data?.error || ''
        const isExistingUser =
          errMsg.includes('already registered') ||
          errMsg.includes('already used by another account') ||
          errMsg.includes('already registered and verified')
        if (isExistingUser) {
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

  const handlePayment = async () => {
    if (!amount || amount < 50) {
      toast.error('Invalid amount')
      return
    }
    if (serviceType === 'DATA' && !plan) {
      toast.error('Please select a plan')
      return
    }
    setLoading(true)
    try {
      const callbackUrl = new URL(window.location.href)
      callbackUrl.searchParams.set('payment_status', 'verifying')
      callbackUrl.searchParams.set('plan', plan)
      callbackUrl.searchParams.set('network', network)
      callbackUrl.searchParams.set('phone', phone)
      callbackUrl.searchParams.set('amount', amount.toString())
      callbackUrl.searchParams.set('serviceType', serviceType)
      callbackUrl.searchParams.set('email', userEmail)

      const res = await axios.post('/api/store/init-payment', {
        amount,
        email: userEmail,
        phoneNumber: phone,
        callbackUrl: callbackUrl.toString(),
      })

      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url
      } else {
        toast.error('Failed to initialize payment')
        setLoading(false)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment initialization failed')
      setLoading(false)
    }
  }

  return (
    <div>
          <div id="quick-buy" className="relative z-10">
                    {/* Glow Effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-gray-500/20 via-gray-500/20 to-red-500/20 dark:from-gray-500/10 dark:via-gray-500/10 dark:to-red-500/10 rounded-3xl blur-2xl opacity-60" />
        
                    <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/20 p-8">
                      {/* Header */}
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Quick Top-up</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">No account needed</p>
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg shadow-gray-500/30">
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
                                className="w-full px-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 outline-none transition-all text-lg text-zinc-900 dark:text-white"
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
                                className="w-full px-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-gray-500 outline-none transition-all text-center tracking-[0.5em] text-2xl font-mono text-zinc-900 dark:text-white"
                                placeholder="••••••"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                              />
                              <p className="text-xs text-zinc-500 mt-3 text-center">
                                Sent to {phone}
                                <button onClick={() => setStep('PHONE')} className="text-gray-600 dark:text-gray-400 font-medium ml-2 hover:underline">Change</button>
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
                                  className={cn("py-3 text-xs font-semibold rounded-lg border-2 transition-all", network === net ? "border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300")}
                                >
                                  {net}
                                </button>
                              ))}
                            </div>
        
                            {serviceType === 'DATA' ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {dataPlans.map(p => (
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
                                {dataPlans.length === 0 && (
                                  <div className="text-center py-4 text-sm text-zinc-500">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'No plans available'}
                                  </div>
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
                            <button onClick={() => { setStep('PHONE'); setAmount(0); setPlan(''); setOtp(''); }} className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:underline">Make another purchase</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
    </div>
  )
}
