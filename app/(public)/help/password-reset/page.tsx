import React from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Lock, Mail, Smartphone } from 'lucide-react'

export default function PasswordResetGuide() {
  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/help" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Help Center
        </Link>
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">How to reset your password</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10">Forgot your password? No problem. Follow these simple steps to regain access to your NillarPay account.</p>
        
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">1</div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Go to the Login Page</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Navigate to the login screen and click on the <span className="font-semibold text-zinc-900 dark:text-zinc-200">"Forgot Password?"</span> link located just below the password input field.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                 <Lock className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">2</div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Enter your Email or Phone</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Provide the email address or phone number associated with your account. We will send you a verification code (OTP).
              </p>
               <div className="flex gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-2 text-zinc-500">
                     <Mail size={20} /> <span className="text-sm">name@example.com</span>
                  </div>
                   <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-2 text-zinc-500">
                     <Smartphone size={20} /> <span className="text-sm">+234 80...</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6">
             <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">3</div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Verify & Set New Password</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Enter the OTP you received and then type your new password twice to confirm. Click "Reset Password" and you're all set!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-6 flex gap-4">
          <CheckCircle className="flex-shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-300">Security Tip</h4>
            <p className="text-sm text-green-800 dark:text-green-400 mt-1">
              Always choose a strong password combining letters, numbers, and symbols. Never share your OTP with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
