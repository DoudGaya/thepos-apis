'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Phone,
  Sun,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react'

const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

type RegistrationStep = 'info' | 'otp' | 'success'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  otp: string
  password: string
  confirmPassword: string
  pin: string
  confirmPin: string
  acceptTerms: boolean
}

interface FormErrors {
  [key: string]: string
}

import InputField from './ui/InputField'
import PasswordField from './ui/PasswordField'


export default function MultiStepRegistration() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>('light')
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('info')
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    otp: '',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Component initialization
    return () => {
      // Cleanup
    }
  }, [])

  // stable toggles for password/pin visibility to avoid new function identities on each render
  const toggleShowPassword = useCallback(() => setShowPassword(s => !s), [])
  const toggleShowConfirmPassword = useCallback(() => setShowConfirmPassword(s => !s), [])
  const toggleShowPin = useCallback(() => setShowPin(s => !s), [])
  const toggleShowConfirmPin = useCallback(() => setShowConfirmPin(s => !s), [])

  const applyTheme = useCallback((mode: Theme) => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('dark', mode === 'dark')
    document.documentElement.style.colorScheme = mode
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme: Theme = stored ?? (mediaQuery.matches ? 'dark' : 'light')

    setTheme(initialTheme)
    applyTheme(initialTheme)

    const handleChange = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (saved) return
      const next: Theme = event.matches ? 'dark' : 'light'
      setTheme(next)
      applyTheme(next)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [applyTheme])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    applyTheme(next)
  }

  // OTP timer effect
  useEffect(() => {
    if (otpTimer <= 0) return
    const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
    return () => clearTimeout(timer)
  }, [otpTimer])

  const validatePersonalInfo = () => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = 'First name can only contain letters'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = 'Last name can only contain letters'
    }

    return newErrors
  }

  const validateContactInfo = () => {
    const newErrors: FormErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    const phoneRegex = /^(\+234|234|0)?[789]\d{9}$/
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Nigerian phone number'
    }

    return newErrors
  }

  const validateOTP = () => {
    const newErrors: FormErrors = {}
    if (!formData.otp || formData.otp.length !== 6) {
      newErrors.otp = 'Please enter a valid 6-digit OTP'
    }
    return newErrors
  }

  const validatePassword = () => {
    const newErrors: FormErrors = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    return newErrors
  }

  const validatePin = () => {
    const newErrors: FormErrors = {}

    if (!formData.pin || formData.pin.length !== 6) {
      newErrors.pin = 'PIN must be 6 digits'
    } else if (!/^\d+$/.test(formData.pin)) {
      newErrors.pin = 'PIN must contain only numbers'
    }

    if (!formData.confirmPin) {
      newErrors.confirmPin = 'Please confirm your PIN'
    } else if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = 'PINs do not match'
    }

    return newErrors
  }

  // API Integration Functions
  const registerUser = async () => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\s/g, ''),
          // Temporary password - will be updated after OTP verification
          password: 'TempPassword123!',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const verifyOTP = async () => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone.replace(/\s/g, ''),
          code: formData.otp,
          type: 'REGISTER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const updateUserPassword = async () => {
    try {
      const response = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone.replace(/\s/g, ''),
          password: formData.password,
          pin: formData.pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password and PIN')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const resendOTP = async () => {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone.replace(/\s/g, ''),
          type: 'REGISTER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  const handleNext = async () => {
    let validationErrors: FormErrors = {}

    switch (currentStep) {
      case 'info':
        // Validate all information at once
        const personalErrors = validatePersonalInfo()
        const contactErrors = validateContactInfo()
        const passwordErrors = validatePassword()
        const pinErrors = validatePin()
        
        validationErrors = {
          ...personalErrors,
          ...contactErrors,
          ...passwordErrors,
          ...pinErrors
        }
        
        if (Object.keys(validationErrors).length === 0) {
          setIsLoading(true)
          try {
            const result = await registerUser()
            if (result.requiresVerification) {
              setUserId(result.data.userId)
              setOtpSent(true)
              setOtpTimer(60)
              setCurrentStep('otp')
            }
          } catch (error: any) {
            validationErrors.form = error.message || 'Registration failed. Please try again.'
          } finally {
            setIsLoading(false)
          }
        }
        break

      case 'otp':
        validationErrors = validateOTP()
        if (Object.keys(validationErrors).length === 0) {
          setIsLoading(true)
          try {
            await verifyOTP()
            await updateUserPassword()
            setCurrentStep('success')
          } catch (error: any) {
            validationErrors.otp = error.message || 'OTP verification failed. Please try again.'
          } finally {
            setIsLoading(false)
          }
        }
        break
    }

    setErrors(validationErrors)
  }

  const handleBack = () => {
    if (currentStep === 'info') return

    const steps: RegistrationStep[] = ['info', 'otp']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
      setErrors({})
    }
  }

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      if (prev[field]) {
        const updated = { ...prev }
        delete updated[field]
        return updated
      }
      return prev
    })
  }, [])

  // Create stable handler functions for each field
  const handleFirstNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, firstName: value }))
    setErrors(prev => {
      if (prev.firstName) {
        const updated = { ...prev }
        delete updated.firstName
        return updated
      }
      return prev
    })
  }, [])

  const handleLastNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, lastName: value }))
    setErrors(prev => {
      if (prev.lastName) {
        const updated = { ...prev }
        delete updated.lastName
        return updated
      }
      return prev
    })
  }, [])

  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }))
    setErrors(prev => {
      if (prev.email) {
        const updated = { ...prev }
        delete updated.email
        return updated
      }
      return prev
    })
  }, [])

  const handlePhoneChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, phone: value }))
    setErrors(prev => {
      if (prev.phone) {
        const updated = { ...prev }
        delete updated.phone
        return updated
      }
      return prev
    })
  }, [])

  const handlePasswordChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, password: value }))
    setErrors(prev => {
      if (prev.password) {
        const updated = { ...prev }
        delete updated.password
        return updated
      }
      return prev
    })
  }, [])

  const handleConfirmPasswordChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: value }))
    setErrors(prev => {
      if (prev.confirmPassword) {
        const updated = { ...prev }
        delete updated.confirmPassword
        return updated
      }
      return prev
    })
  }, [])

  const handlePinChange = useCallback((value: string) => {
    if (/^\d{0,6}$/.test(value)) {
      setFormData(prev => ({ ...prev, pin: value }))
      setErrors(prev => {
        if (prev.pin) {
          const updated = { ...prev }
          delete updated.pin
          return updated
        }
        return prev
      })
    }
  }, [])

  const handleConfirmPinChange = useCallback((value: string) => {
    if (/^\d{0,6}$/.test(value)) {
      setFormData(prev => ({ ...prev, confirmPin: value }))
      setErrors(prev => {
        if (prev.confirmPin) {
          const updated = { ...prev }
          delete updated.confirmPin
          return updated
        }
        return prev
      })
    }
  }, [])

  const handleOtpChange = useCallback((value: string) => {
    if (/^\d{0,6}$/.test(value)) {
      setFormData(prev => ({ ...prev, otp: value }))
      setErrors(prev => {
        if (prev.otp) {
          const updated = { ...prev }
          delete updated.otp
          return updated
        }
        return prev
      })
    }
  }, [])

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      await resendOTP()
      setOtpTimer(60)
      setFormData(prev => ({ ...prev, otp: '' }))
      setErrors({})
    } catch (error: any) {
      setErrors({ otp: error.message || 'Failed to resend OTP. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const getStepNumber = (): number => {
    const steps: RegistrationStep[] = ['info', 'otp', 'success']
    return steps.indexOf(currentStep) + 1
  }

  return (
    <div className="min-h-screen antialiased bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white ring-1 ring-inset ring-green-500/70 transition-all duration-300 group-hover:shadow-sm group-hover:ring-green-400/80">
              <span className="text-sm font-semibold tracking-tight">V</span>
            </span>
            <span className="text-base font-semibold tracking-tight">VTU</span>
          </Link>

          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-slate-200" />
            ) : (
              <Sun className="h-4 w-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentStep !== 'success' && (
          <div className="mb-8">
            {/* Progress Bar */}
            <div className="flex items-center mx-auto justify-center mb-6">
              {[1, 2].map((step) => {
                const stepNum = getStepNumber()
                const isActive = step <= stepNum
                const isCompleted = step < stepNum
                return (
                  <div key={step} className="flex items-center justify-center mx-auto flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all ${
                        isCompleted
                          ? 'bg-green-600 text-white shadow-sm'
                          : isActive
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : step}
                    </div>
                    {step < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                          isActive ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step Labels */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`text-xs font-medium transition-colors ${getStepNumber() >= 1 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                Information
              </div>
              <div className={`text-xs font-medium transition-colors ${getStepNumber() >= 2 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                Verification
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          {/* Form-level error */}
          {errors.form && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">{errors.form}</p>
              </div>
            </div>
          )}

          {/* Information Step */}
          {currentStep === 'info' && (
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Create Your Account
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Please provide your information to get started
                </p>
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Personal Information
                </h2>
                <InputField
                  label="First Name"
                  icon={User}
                  value={formData.firstName}
                  onChange={handleFirstNameChange}
                  placeholder="John"
                  error={errors.firstName}
                />

                <InputField
                  label="Last Name"
                  icon={User}
                  value={formData.lastName}
                  onChange={handleLastNameChange}
                  placeholder="Doe"
                  error={errors.lastName}
                />
              </div>

              {/* Contact Information */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Contact Information
                </h2>
                <InputField
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  error={errors.email}
                />

                <InputField
                  label="Phone Number"
                  icon={Phone}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="08012345678"
                  error={errors.phone}
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Create Password
                </h2>
                <PasswordField
                  label="Password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  show={showPassword}
                  onToggle={toggleShowPassword}
                  placeholder="Enter your password"
                  error={errors.password}
                />

                <PasswordField
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  show={showConfirmPassword}
                  onToggle={toggleShowConfirmPassword}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword}
                />

                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Password requirements:</p>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      <span>At least 8 characters</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      <span>At least one uppercase letter</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      <span>At least one lowercase letter</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      <span>At least one number</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* PIN */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Transaction PIN
                </h2>
                <InputField
                  label="PIN"
                  icon={Lock}
                  type="password"
                  value={formData.pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
                  error={errors.pin}
                />

                <InputField
                  label="Confirm PIN"
                  icon={Lock}
                  type="password"
                  value={formData.confirmPin}
                  onChange={handleConfirmPinChange}
                  placeholder="••••••"
                  error={errors.confirmPin}
                />

                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">Security Tip</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">You'll use this PIN to confirm transactions. Keep it safe and don't share it with anyone.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTP Verification Step */}
          {currentStep === 'otp' && (
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Verify Your Number
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  We've sent a 6-digit code to {formData.phone}
                </p>
              </div>

              {otpSent && (
                <div className="mb-5 p-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-300">
                      OTP sent successfully to your phone and email. Please enter the code below.
                    </p>
                  </div>
                </div>
              )}

              <InputField
                label="OTP Code"
                icon={Lock}
                value={formData.otp}
                onChange={handleOtpChange}
                placeholder="000000"
                error={errors.otp}
              />

              {otpSent && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {otpTimer > 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Resend code in <span className="font-medium text-slate-900 dark:text-white">{otpTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? 'Sending...' : 'Resend OTP'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}



          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center py-8 sm:py-12">
              <div className="flex justify-center mb-8">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-25 blur-sm" />
                  <div className="relative bg-green-50 dark:bg-green-900/20 p-4 rounded-full">
                    <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                Account Created!
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-2 max-w-md mx-auto">
                Welcome to VTU, {formData.firstName}! Your account is ready to use.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-8 max-w-md mx-auto">
                You can now start buying data bundles, airtime, and paying bills instantly.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-base font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'success' && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 'info' || isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 font-medium text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-green-500 hover:border-green-500 hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {currentStep === 'info' ? 'Send OTP' : 'Verify'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sign In Link */}
        {currentStep !== 'success' && (
          <div className="text-center mt-6">
            <span className="text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
              >
                Sign in
              </Link>
            </span>
          </div>
        )}
      </main>
    </div>
  )
}
