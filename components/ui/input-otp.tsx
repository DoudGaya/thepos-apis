import * as React from "react"
import { cn } from "@/lib/utils"

interface InputOTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  maxLength: number
  value: string
  onChange: (value: string) => void
}

const InputOTP = React.forwardRef<HTMLDivElement, InputOTPProps & { children: React.ReactNode }>(
  ({ maxLength, value, onChange, children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement, {
            value,
            onChange,
            maxLength,
          })
        )}
      </div>
    )
  }
)
InputOTP.displayName = "InputOTP"

interface InputOTPGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const InputOTPGroup = React.forwardRef<HTMLDivElement, InputOTPGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
InputOTPGroup.displayName = "InputOTPGroup"

interface InputOTPSlotProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  index: number
  value?: string
  onChange?: (value: string) => void
  maxLength?: number
}

const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(
  ({ index, value = "", onChange, maxLength = 4, className, ...props }, ref) => {
    const char = value[index] || ""

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.replace(/\D/g, "")
      if (input.length <= maxLength) {
        onChange?.(input)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !char) {
        onChange?.(value.slice(0, index))
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-12 w-12 text-center text-sm transition-all border border-input rounded-md bg-background shadow-sm",
          "flex items-center justify-center",
          className
        )}
        {...props}
      >
        <input
          type="text"
          inputMode="numeric"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span className="text-lg font-semibold">{char}</span>
      </div>
    )
  }
)
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => (
  <div ref={ref} {...props}>
    <span className="text-gray-400">•</span>
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
