import React, { memo, useEffect, useRef } from 'react'
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'

const PasswordField = ({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  error?: string
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try { console.log('PasswordField DOM node for', label, inputRef.current) } catch (e) {}
  }, [label])

  try { console.log('Render PasswordField:', label) } catch (e) {}

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          data-input-label={label}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-11 pr-11 py-2.5 rounded-lg border ${
            error
              ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-green-500'
          } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default memo(PasswordField)
