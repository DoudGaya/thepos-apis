'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  onClose: () => void
  autoClose?: number // milliseconds, 0 = no auto-close
}

export function Toast({ type, message, onClose, autoClose = 4000 }: ToastProps) {
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(onClose, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  const bgColorClass = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  }[type]

  const textColorClass = {
    success: 'text-green-700',
    error: 'text-red-700',
    info: 'text-blue-700',
    warning: 'text-yellow-700',
  }[type]

  const iconColorClass = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
  }[type]

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={`fixed top-4 right-4 max-w-md rounded-lg border ${bgColorClass} p-4 shadow-lg z-50 animate-in fade-in slide-in-from-top-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${iconColorClass} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm ${textColorClass} flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`${textColorClass} hover:opacity-70 transition-opacity`}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
