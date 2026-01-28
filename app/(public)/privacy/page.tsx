import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Information Collection</h2>
        <p>We collect information that you provide directly to us when you create an account, make a transaction, or communicate with us.</p>
        
        <h2>2. Use of Information</h2>
        <p>We use the information we collect to operate, maintain, and improve our services, to process transactions, and to communicate with you.</p>
        
        {/* Add more sections as needed */}
      </div>
    </div>
  )
}
