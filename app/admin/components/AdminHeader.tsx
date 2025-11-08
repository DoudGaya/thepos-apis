"use client"
import React from 'react'
import { signOut } from 'next-auth/react'

export default function AdminHeader() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        <button className="md:hidden px-2 py-1 rounded bg-gray-100">Menu</button>
        <h2 className="text-lg font-medium">Admin</h2>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
