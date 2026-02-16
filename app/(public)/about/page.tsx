import React from 'react'
import { Shield, Zap, Users, Globe, Award } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="bg-white mt-20 dark:bg-zinc-950">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-gray-100/20 to-transparent dark:from-gray-900/20 pt-24 pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
              Empowering Nigeria's Digital Economy
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              NillarPay is Nigeria's leading platform for data bundles, airtime, and bill payments. We empower individuals and businesses with reliable, affordable, and instant transaction services.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
          <div className="mx-auto flex max-w-xs flex-col gap-y-4">
            <dt className="text-base leading-7 text-zinc-600 dark:text-zinc-400">Trusted Users</dt>
            <dd className="order-first text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">50,000+</dd>
          </div>
          <div className="mx-auto flex max-w-xs flex-col gap-y-4">
            <dt className="text-base leading-7 text-zinc-600 dark:text-zinc-400">Daily Transactions</dt>
            <dd className="order-first text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">12,000+</dd>
          </div>
          <div className="mx-auto flex max-w-xs flex-col gap-y-4">
            <dt className="text-base leading-7 text-zinc-600 dark:text-zinc-400">Service Uptime</dt>
            <dd className="order-first text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">99.9%</dd>
          </div>
        </dl>
      </div>

      {/* Values Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-gray-600">Our Values</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Built on Trust, Speed, and Innovation
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-600">
                  <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Uncompromised Security
              </dt>
              <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Your financial data is protected with enterprise-grade encryption and security protocols.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-600">
                  <Zap className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Lightning Fast
              </dt>
              <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Transactions are processed instantly. No more waiting for your airtime or data.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-600">
                  <Users className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Customer First
              </dt>
              <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Our support team is always available to help you resolve any issues quickly.
              </dd>
            </div>
             <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-600">
                  <Globe className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Nationwide Coverage
              </dt>
              <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Supporting all major Nigerian networks and utility providers effectively.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

