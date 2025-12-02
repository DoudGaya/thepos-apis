"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

interface TransactionPinModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (pin: string) => void
  amount: number
  recipient: string
  network?: string
  isLoading: boolean
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  recipient,
  network,
  isLoading
}: TransactionPinModalProps) {
  const [pin, setPin] = React.useState("")

  // Reset PIN when modal opens
  React.useEffect(() => {
    if (isOpen) setPin("")
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (pin.length === 4) {
      onConfirm(pin)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Transaction</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              disabled={isLoading}
            >
              <X size={24} />
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Service</span>
              <span className="font-medium text-gray-900 dark:text-white">{network} Airtime</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Recipient</span>
              <span className="font-medium text-gray-900 dark:text-white">{recipient}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">₦{amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-center text-gray-700 dark:text-gray-300">
              Enter Transaction PIN
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value) => setPin(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-center text-gray-500">
              Enter your 4-digit security PIN to authorize this payment
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleConfirm}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
