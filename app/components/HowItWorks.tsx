'use client';

import { UserPlus, Wallet, ShoppingCart, TrendingUp } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Create Account',
    description: 'Sign up in minutes with your email and phone number. Verify your account and you\'re ready to go.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Wallet,
    step: '2',
    title: 'Fund Wallet',
    description: 'Add money to your wallet via bank transfer, card payment, or USSD. Funds reflect instantly.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: ShoppingCart,
    step: '3',
    title: 'Make Purchase',
    description: 'Buy data, airtime, or pay bills at wholesale prices. Delivery is automatic and instant.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: TrendingUp,
    step: '4',
    title: 'Resell & Profit',
    description: 'Resell to your customers at retail prices and enjoy your profit margins. Repeat and scale.',
    color: 'from-yellow-500 to-orange-500'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-wide mb-2">
            How It Works
          </h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Get Started in 4 Simple Steps
          </h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From signup to profit in under 5 minutes. It's that easy.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform -translate-y-1/2"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Step Card */}
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-gray-100">
                    {/* Step Number */}
                    <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center mb-6 mt-4">
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${step.color}`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <h4 className="text-xl font-bold text-gray-900 mb-3 text-center">
                      {step.title}
                    </h4>
                    <p className="text-gray-600 text-center leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <a
            href="/api/auth/register"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            Start Your Journey Today
          </a>
        </div>
      </div>
    </section>
  );
}
