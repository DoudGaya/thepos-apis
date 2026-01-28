import React from 'react'

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">API Documentation</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>Integrate NillarPay services directly into your application.</p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Developer access is required to view full API keys and endpoints. Please contact support to request access.
              </p>
            </div>
          </div>
        </div>
        
        <h2>Authentication</h2>
        <p>All API requests must be authenticated using your API Key in the header.</p>
        <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg overflow-x-auto">
          <code>Authorization: Bearer YOUR_API_KEY</code>
        </pre>
        
        {/* Simplified docs for now */}
      </div>
    </div>
  )
}
