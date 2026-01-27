'use client';

import { Check, Star } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '0',
    description: 'Perfect for individuals getting started',
    features: [
      'Data & Airtime Reselling',
      'Basic API Access',
      'Email Support',
      'Standard Pricing',
      'Mobile App Access',
      'Transaction History'
    ],
    cta: 'Start Free',
    popular: false,
    color: 'from-gray-500 to-gray-600'
  },
  {
    name: 'Business',
    price: '5,000',
    description: 'Best for growing businesses',
    features: [
      'Everything in Starter',
      'Premium Pricing (Up to 5% discount)',
      'Priority Support',
      'Advanced API Features',
      'Bulk Purchase Options',
      'Custom Webhook',
      'Dedicated Account Manager',
      'Monthly Reports'
    ],
    cta: 'Upgrade to Business',
    popular: true,
    color: 'from-gray-800 to-gray-900'
  },
  {
    name: 'Enterprise',
    price: '20,000',
    description: 'For large-scale operations',
    features: [
      'Everything in Business',
      'Maximum Discount (Up to 10%)',
      '24/7 Phone Support',
      'Unlimited API Calls',
      'White Label Option',
      'Custom Integration',
      'SLA Guarantee',
      'Quarterly Business Review',
      'Custom Features'
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'from-yellow-500 to-orange-500'
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Pricing Plans
          </h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include our core features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 ${
                plan.popular ? 'ring-4 ring-gray-900 scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gray-900 text-white px-6 py-2 rounded-bl-2xl font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h4 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h4>
                <p className="text-gray-600 mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-gray-600 text-xl mr-2">₦</span>
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href="/api/auth/register"
                  className={`block w-full py-4 px-6 text-center rounded-xl font-semibold text-lg mb-8 transition-all duration-300 ${
                    plan.popular
                      ? `bg-gradient-to-r ${plan.color} text-white shadow-lg hover:shadow-xl transform hover:scale-105`
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features List */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    What's Included:
                  </p>
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mt-0.5`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Accent */}
              <div className={`h-2 bg-gradient-to-r ${plan.color}`}></div>
            </div>
          ))}
        </div>

        {/* FAQ Note */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            All plans include instant delivery, secure transactions, and access to our API.
          </p>
          <Link 
            href="/pricing"
            className="inline-flex items-center gap-2 text-gray-900 font-semibold hover:text-gray-700 transition-colors mb-4"
          >
            View All Service Prices →
          </Link>
          <p className="text-sm text-gray-500">
            Need a custom plan? <a href="#contact" className="text-indigo-600 hover:text-indigo-800 font-semibold">Contact our sales team</a>
          </p>
        </div>
      </div>
    </section>
  );
}
