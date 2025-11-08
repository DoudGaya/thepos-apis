import React from 'react'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'

export const metadata = {
  title: 'Admin - ThePOS',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        <aside className="w-64 hidden md:block border-r border-gray-200 bg-white">
          <AdminSidebar />
        </aside>

        <div className="flex-1 min-h-screen">
          <header className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <AdminHeader />
            </div>
          </header>

          <main className="p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </div>
  )
}
