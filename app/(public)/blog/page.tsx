import React from 'react'

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">NillarPay Blog</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-white">Coming Soon</h2>
          <p className="text-zinc-600 dark:text-zinc-400">Our blog is currently under construction. Check back soon for updates, tips, and news.</p>
        </div>
      </div>
    </div>
  )
}
