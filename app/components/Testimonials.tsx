'use client';

import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Chidi Okonkwo',
    role: 'Data Reseller, Lagos',
    image: '👨‍💼',
    rating: 5,
    text: 'ThePOS has transformed my business! I can now serve my customers instantly without delays. The prices are unbeatable and customer support is excellent.'
  },
  {
    name: 'Fatima Ahmed',
    role: 'Entrepreneur, Abuja',
    image: '👩‍💼',
    rating: 5,
    text: 'Best platform for reselling data and airtime. I\'ve been using it for 6 months and made over ₦500k in profit. Highly recommended for anyone serious about this business.'
  },
  {
    name: 'Emeka Johnson',
    role: 'Business Owner, Port Harcourt',
    image: '🧑‍💼',
    rating: 5,
    text: 'The API integration is seamless. I built my own app using their API and my customers love it. Transaction success rate is 99.9%. Simply the best!'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Testimonials
          </h2>
          <h3 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            What Our Users Say
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join thousands of satisfied resellers making money with ThePOS
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
                <Quote className="w-6 h-6 text-white" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 mt-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-white text-lg leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                <div className="text-4xl">
                  {testimonial.image}
                </div>
                <div>
                  <div className="font-bold text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-white mb-2">4.9/5</div>
            <div className="text-gray-400">Average Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">50,000+</div>
            <div className="text-gray-400">Happy Users</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">1M+</div>
            <div className="text-gray-400">Transactions</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">99.9%</div>
            <div className="text-gray-400">Uptime</div>
          </div>
        </div>
      </div>
    </section>
  );
}
