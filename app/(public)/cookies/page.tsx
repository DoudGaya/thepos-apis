import React from 'react'

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Cookie Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. What are Cookies</h2>
        <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website.</p>
        
        <h2>2. How We Use Cookies</h2>
        <p>We use cookies to understand how you use our website, to remember your preferences, and to improve your experience.</p>
        
        {/* Add more sections as needed */}
      </div>
    </div>
  )
}
