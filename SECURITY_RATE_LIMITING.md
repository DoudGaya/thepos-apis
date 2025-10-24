# Security & Rate Limiting Documentation

## Rate Limiting Implementation

### Current Setup (Development)
An in-memory rate limiter is implemented in `app/lib/rateLimiter.ts` with the following limits:

#### OTP Endpoints
- **Send OTP** (`/api/auth/send-otp`): 3 requests per 15 minutes per phone
- **Resend OTP** (`/api/auth/resend-otp`): 3 requests per 15 minutes per phone
- **Verify OTP** (`/api/auth/verify-otp`): 5 attempts per 15 minutes per phone

### Response Format
When rate limit is exceeded:
```json
{
  "error": "Too many OTP requests. Please try again later."
}
```
HTTP Status: `429 Too Many Requests`

## Production Recommendations

### 1. Redis-Based Rate Limiting
Replace in-memory implementation with Redis for multi-instance deployments:

```typescript
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function consumeToken(key: string, limit = 5, windowMs = 900000) {
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.pexpire(key, windowMs)
  }
  
  if (current > limit) {
    const ttl = await redis.pttl(key)
    return { allowed: false, remaining: 0, resetAt: Date.now() + ttl }
  }
  
  return { allowed: true, remaining: limit - current, resetAt: Date.now() + windowMs }
}
```

### 2. Additional Security Measures

#### Input Sanitization
All inputs are validated using Zod schemas:
- Phone numbers: Nigerian format validation
- Emails: RFC-compliant email validation
- OTP codes: Exactly 6 digits
- Passwords: Minimum 8 chars, uppercase, lowercase, numbers

#### Password Hashing
- Algorithm: bcrypt with cost factor 12
- Both `passwordHash` and `pinHash` are hashed before storage
- Never expose hashes in API responses

#### OTP Security
- OTPs expire after 10 minutes
- Used OTPs are immediately deleted from database
- Each new OTP invalidates previous ones for the same phone/type

### 3. Monitoring & Alerts

Set up alerts for:
- High rate of 429 responses (potential DDoS)
- Failed OTP verifications (potential brute force)
- Unusual geographic patterns in registrations

### 4. Additional Hardening

#### Implement CAPTCHA
Add reCAPTCHA or hCaptcha for:
- Registration form
- OTP resend after 3 attempts
- Login after 5 failed attempts

#### IP-Based Throttling
Track requests by IP address:
```typescript
const clientIp = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
const rl = consumeToken(`ip:${clientIp}`, 20, 60000) // 20 per minute
```

#### Account Lockout
Implement temporary account lockout after repeated failed attempts:
- Lock duration: 15-30 minutes
- Notification: Email user about lockout
- Manual unlock: Admin panel or support ticket

## Testing Rate Limits

```bash
# Test send-otp rate limit
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/auth/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"08012345678","type":"REGISTER"}'
  echo "\nAttempt $i"
done
```

Expected: First 3 succeed, 4th returns 429.

## Environment Variables

Add to `.env`:
```env
# Rate Limiting (if using Redis)
REDIS_URL=redis://localhost:6379

# Security
BCRYPT_ROUNDS=12
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS=5
```
