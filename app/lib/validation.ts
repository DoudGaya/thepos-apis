export type PersonalInfo = { firstName: string; lastName: string }
export type ContactInfo = { email: string; phone: string }

export function validatePersonalInfo(data: PersonalInfo) {
  const errors: Record<string, string> = {}

  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required'
  } else if (data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters'
  } else if (!/^[a-zA-Z\s]+$/.test(data.firstName.trim())) {
    errors.firstName = 'First name can only contain letters'
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required'
  } else if (data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters'
  } else if (!/^[a-zA-Z\s]+$/.test(data.lastName.trim())) {
    errors.lastName = 'Last name can only contain letters'
  }

  return errors
}

export function validateContactInfo(data: ContactInfo) {
  const errors: Record<string, string> = {}

  if (!data.email?.trim()) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address'
  }

  const phoneRegex = /^(\+234|234|0)?[789]\d{9}$/
  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required'
  } else if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
    errors.phone = 'Please enter a valid Nigerian phone number'
  }

  return errors
}

export function validateOTP(otp: string) {
  const errors: Record<string, string> = {}
  if (!otp || otp.length !== 6) {
    errors.otp = 'Please enter a valid 6-digit OTP'
  }
  return errors
}

export function validatePassword(password: string, confirm: string) {
  const errors: Record<string, string> = {}
  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.password = 'Password must contain uppercase, lowercase, and numbers'
  }

  if (!confirm) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirm) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}

export function validatePin(pin: string, confirm: string) {
  const errors: Record<string, string> = {}
  if (!pin || pin.length !== 6) {
    errors.pin = 'PIN must be 6 digits'
  } else if (!/^\d+$/.test(pin)) {
    errors.pin = 'PIN must contain only numbers'
  }

  if (!confirm) {
    errors.confirmPin = 'Please confirm your PIN'
  } else if (pin !== confirm) {
    errors.confirmPin = 'PINs do not match'
  }

  return errors
}
