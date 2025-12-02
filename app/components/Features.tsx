'use client';

import { Zap, Shield, Clock, TrendingUp, Smartphone, HeadphonesIcon } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Get data, airtime, and bills delivered in seconds. Our automated system ensures instant fulfillment.',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Bank-grade security with 99.9% uptime. Your transactions are safe and your data is protected.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Buy anytime, anywhere. Our platform never sleeps, so you can transact whenever you need.',
    color: 'from-gray-600 to-gray-800'
  },
  {
    icon: TrendingUp,
    title: 'Best Prices',
    description: 'Competitive rates with attractive discounts. Maximize your profits with our wholesale pricing.',
    color: 'from-gray-700 to-gray-900'
  },
  {
    icon: Smartphone,
    title: 'Easy to Use',
    description: 'Simple interface on web and mobile. Start selling in minutes with our intuitive platform.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: HeadphonesIcon,
    title: 'Premium Support',
    description: 'Dedicated customer support team. Get help via WhatsApp, email, or phone anytime you need it.',
    color: 'from-red-500 to-pink-500'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Why Choose ThePOS
          </h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built for resellers, entrepreneurs, and businesses looking to provide seamless digital services.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Icon Container */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative Element */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-10 rounded-bl-full`}></div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-4">
            Ready to experience the difference?
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            View Pricing Plans
          </a>
        </div>
      </div>
    </section>
  );
}
