import React from 'react'

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>Welcome to NillarPay. specific terms and conditions.</p>
        
        <h2>2. Acceptance of Terms</h2>
        <p>By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the service.</p>
        
        {/* Add more sections as needed */}
      </div>
    </div>
  )
}
