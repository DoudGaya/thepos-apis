import { describe, it, expect } from 'vitest'
import {
  validatePersonalInfo,
  validateContactInfo,
  validateOTP,
  validatePassword,
  validatePin,
} from '../app/lib/validation'

describe('validation utilities', () => {
  it('validates personal info correctly', () => {
    expect(validatePersonalInfo({ firstName: '', lastName: '' })).toHaveProperty('firstName')
    expect(validatePersonalInfo({ firstName: 'J', lastName: 'D' })).toHaveProperty('firstName')
    expect(validatePersonalInfo({ firstName: 'John', lastName: 'Doe' })).toEqual({})
  })

  it('validates contact info correctly', () => {
    expect(validateContactInfo({ email: '', phone: '' })).toHaveProperty('email')
    expect(validateContactInfo({ email: 'a@b', phone: '0801234' })).toHaveProperty('email')
    expect(validateContactInfo({ email: 'you@example.com', phone: '08012345678' })).toEqual({})
  })

  it('validates OTP', () => {
    expect(validateOTP('')).toHaveProperty('otp')
    expect(validateOTP('123')).toHaveProperty('otp')
    expect(validateOTP('123456')).toEqual({})
  })

  it('validates password', () => {
    expect(validatePassword('', '')).toHaveProperty('password')
    expect(validatePassword('short', 'short')).toHaveProperty('password')
    expect(validatePassword('Password1', 'Password1')).toEqual({})
    expect(validatePassword('Password1', 'Password2')).toHaveProperty('confirmPassword')
  })

  it('validates pin', () => {
    expect(validatePin('', '')).toHaveProperty('pin')
    expect(validatePin('abc123', 'abc123')).toHaveProperty('pin')
    expect(validatePin('123456', '123456')).toEqual({})
    expect(validatePin('123456', '654321')).toHaveProperty('confirmPin')
  })
})
