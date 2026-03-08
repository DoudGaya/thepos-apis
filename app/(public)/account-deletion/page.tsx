'use client'

import React, { useState } from 'react'

export default function AccountDeletionPage() {
  const [identifier, setIdentifier] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), reason: reason.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setStatus('success')
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Request Account Deletion
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Submit this form to request the deletion of your NillarPay account and all associated data.
            We will process your request within <strong>30 days</strong> in accordance with applicable data protection regulations.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Request Received
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Your account deletion request has been submitted. Our team will review it and you will
              receive a confirmation email once the process is complete (within 30 days).
            </p>
            <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
              If you have any questions, contact{' '}
              <a href="mailto:support@nillar.com" className="underline text-zinc-600 dark:text-zinc-300">
                support@nillar.com
              </a>
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Phone number or email address <span className="text-red-500">*</span>
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+234 800 000 0000 or you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                />
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Enter the phone number or email linked to your NillarPay account.
                </p>
              </div>

              {/* Reason (optional) */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Reason for deletion{' '}
                  <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Let us know why you're leaving (optional)…"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition resize-none"
                />
              </div>

              {/* What gets deleted */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 uppercase tracking-wide">
                  What will be deleted
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                  <li>Account credentials and personal information</li>
                  <li>Transaction history and wallet data</li>
                  <li>Saved beneficiaries and preferences</li>
                  <li>KYC documents and verification records</li>
                </ul>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  Some records may be retained as required by Nigerian financial regulations (EFCC, CBN).
                </p>
              </div>

              {/* Error */}
              {status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'submitting' || !identifier.trim()}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit Deletion Request'}
              </button>

              <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                Changed your mind?{' '}
                <a href="/" className="underline text-zinc-600 dark:text-zinc-300">
                  Go back
                </a>
              </p>
            </form>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-6">
          NillarPay · RC No. 123456 ·{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>
          {' · '}
          <a href="mailto:support@nillar.com" className="underline">Contact Support</a>
        </p>
      </div>
    </div>
  )
}
