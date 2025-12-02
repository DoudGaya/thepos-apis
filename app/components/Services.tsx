'use client';

import { Wifi, Phone, Zap, Tv, DollarSign, CreditCard } from 'lucide-react';

const services = [
  {
    icon: Wifi,
    title: 'Data Bundles',
    description: 'MTN, Airtel, Glo, 9mobile data at wholesale prices',
    price: 'From ₦240/GB',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Phone,
    title: 'Airtime VTU',
    description: 'Instant airtime top-up for all networks',
    price: 'From 2.5% discount',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50'
  },
  {
    icon: Zap,
    title: 'Electricity Bills',
    description: 'AEDC, EKEDC, IKEDC, and all DISCOs',
    price: 'Up to 2% cashback',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50'
  },
  {
    icon: Tv,
    title: 'Cable TV',
    description: 'DSTV, GOTV, Startimes subscriptions',
    price: 'Instant activation',
    color: 'from-gray-700 to-gray-900',
    bgColor: 'bg-gray-50'
  },
  {
    icon: DollarSign,
    title: 'Betting Wallet',
    description: 'Fund Bet9ja, 1xBet, SportyBet accounts',
    price: 'Zero charges',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-50'
  },
  {
    icon: CreditCard,
    title: 'ePins & Vouchers',
    description: 'Waec, Neco, Nabteb result checkers',
    price: 'Bulk available',
    color: 'from-gray-700 to-gray-900',
    bgColor: 'bg-gray-50'
  }
];

export default function Services() {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Our Services
          </h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            One Platform, Endless Possibilities
          </h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything your customers need, all in one place. Start reselling today.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className={`group relative ${service.bgColor} rounded-2xl p-8 border-2 border-transparent hover:border-gray-900 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl`}
              >
                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${service.color} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h4 className="text-2xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h4>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Price Tag */}
                <div className={`inline-block px-4 py-2 bg-gradient-to-r ${service.color} text-white rounded-full text-sm font-semibold`}>
                  {service.price}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-300 rounded-2xl transition-all duration-300"></div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-gray-900 rounded-2xl text-white">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">2.5%</div>
            <div className="text-gray-400">Airtime Discount</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">₦240</div>
            <div className="text-gray-400">Per GB Data</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">5min</div>
            <div className="text-gray-400">Setup Time</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">24/7</div>
            <div className="text-indigo-200">Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}
