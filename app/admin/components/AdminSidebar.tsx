"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Receipt, Server, DollarSign, TrendingUp, Settings } from 'lucide-react'

const navigationItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { href: '/admin/vendors', label: 'Vendors', icon: Server },
  { href: '/admin/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="h-full p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">NillarPay</h2>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>
      
      <ul className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
