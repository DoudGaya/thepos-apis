"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface TransactionDetail {
  id: string
  reference: string
  type: string
  amount: number
  status: string
  network: string | null
  details: any
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  vendorConfig?: {
    id: string
    vendorName: string
    isHealthy: boolean
  }
}

export default function AdminTransactionDetailPage() {
  const params = useParams()
  const transactionId = params.id as string
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetail()
    }
  }, [transactionId])

  const fetchTransactionDetail = async () => {
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}`)
      const result = await response.json()

      if (result.success) {
        setTransaction(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch transaction detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTransactionStatus = async (newStatus: string) => {
    if (!transaction) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (result.success) {
        setTransaction({ ...transaction, status: newStatus, updatedAt: new Date().toISOString() })
        alert('Transaction status updated successfully')
      } else {
        alert('Failed to update transaction status')
      }
    } catch (error) {
      console.error('Failed to update transaction:', error)
      alert('Failed to update transaction status')
    } finally {
      setUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading transaction details...</div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center text-red-500">
        Transaction not found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/transactions"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Transactions
          </Link>
          <h1 className="text-2xl font-semibold">Transaction Details</h1>
          <p className="text-sm text-gray-600">ID: {transaction.id}</p>
        </div>
        <div className="flex gap-2">
          {transaction.status === 'PENDING' && (
            <>
              <button
                onClick={() => updateTransactionStatus('COMPLETED')}
                disabled={updating}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Mark Completed'}
              </button>
              <button
                onClick={() => updateTransactionStatus('FAILED')}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Mark Failed'}
              </button>
            </>
          )}
          {transaction.status === 'FAILED' && (
            <button
              onClick={() => updateTransactionStatus('PENDING')}
              disabled={updating}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Retry Transaction'}
            </button>
          )}
        </div>
      </div>

      {/* Transaction Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Transaction Info</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Reference</label>
              <p className="text-sm font-mono">{transaction.reference || transaction.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Type</label>
              <p className="text-sm">{transaction.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Amount</label>
              <p className="text-lg font-semibold">{formatCurrency(transaction.amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                transaction.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : transaction.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : transaction.status === 'FAILED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {transaction.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Network</label>
              <p className="text-sm">{transaction.network || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">User Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-sm">{transaction.user.firstName} {transaction.user.lastName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-sm">{transaction.user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-sm">{transaction.user.phone}</p>
            </div>
            <div>
              <Link
                href={`/admin/users/${transaction.user.id}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View User Profile →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Vendor Information</h3>
          {transaction.vendorConfig ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Vendor Name</label>
                <p className="text-sm">{transaction.vendorConfig.vendorName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Health Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  transaction.vendorConfig.isHealthy
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transaction.vendorConfig.isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No vendor information available</p>
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Transaction Details</h3>
        {transaction.details ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(transaction.details, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No additional details available</p>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Transaction Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Transaction Created</p>
              <p className="text-sm text-gray-500">{format(new Date(transaction.createdAt), 'PPP p')}</p>
            </div>
          </div>

          {transaction.updatedAt !== transaction.createdAt && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Last Updated</p>
                <p className="text-sm text-gray-500">{format(new Date(transaction.updatedAt), 'PPP p')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}