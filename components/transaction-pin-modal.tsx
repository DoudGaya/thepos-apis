"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

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

  const handleConfirm = () => {
    if (pin.length === 4) {
      onConfirm(pin)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Transaction</DialogTitle>
          <DialogDescription>
            Enter your 4-digit security PIN to authorize this payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
            {network && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{network}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-medium">{recipient}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">₦{amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4">
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
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : "Confirm Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
