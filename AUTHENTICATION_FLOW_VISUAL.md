# Authentication Flow Comparison

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API REQUESTS                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                     WEB APP (Next.js)                             │
│                                                                   │
│  1. User logs in → NextAuth creates JWT                          │
│  2. JWT stored in HTTP-only cookie                               │
│  3. Makes request:                                               │
│                                                                   │
│     fetch('/api/wallet/balance', {                               │
│       credentials: 'include'  ← Browser adds cookie              │
│     })                                                            │
│                                                                   │
│  4. Cookie Header:                                               │
│     Cookie: next-auth.session-token=eyJ...                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    MIDDLEWARE (middleware.ts)                     │
│                                                                   │
│  1. Check for NextAuth token in cookie                           │
│     const nextAuthToken = await getToken({                       │
│       req: request,                                              │
│       secret: process.env.NEXTAUTH_SECRET                        │
│     })                                                            │
│                                                                   │
│  2. If found → ✅ ALLOW WEB APP                                 │
│                                                                   │
│  3. If not found → Check for Bearer token                        │
│     const authHeader = request.headers.get('authorization')      │
│                                                                   │
│  4. If "Bearer ..." found → ✅ ALLOW MOBILE APP                 │
│                                                                   │
│  5. If neither found → ❌ REJECT (401)                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ Check passes
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                   API ROUTE (route.ts)                            │
│                                                                   │
│  1. Call getAuthenticatedUser()                                  │
│  2. For NextAuth: getServerSession() reads cookie                │
│  3. For Bearer: Headers already have user info                   │
│  4. Return user data ✅                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    MOBILE APP (React Native)                      │
│                                                                   │
│  1. User logs in → Backend returns JWT                           │
│  2. JWT stored in SecureStore (encrypted)                        │
│  3. Makes request:                                               │
│                                                                   │
│     apiClient.get('/api/wallet/balance', {                       │
│       headers: {                                                 │
│         'Authorization': 'Bearer eyJ...'                         │
│       }                                                           │
│     })                                                            │
│                                                                   │
│  4. Authorization Header:                                        │
│     Authorization: Bearer eyJ...                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    MIDDLEWARE (middleware.ts)                     │
│                                                                   │
│  1. Check for NextAuth token in cookie                           │
│     → NOT FOUND (mobile has no cookies)                          │
│                                                                   │
│  2. Check for Bearer token in header                             │
│     const authHeader = 'Authorization: Bearer eyJ...'            │
│     → FOUND! ✅                                                  │
│                                                                   │
│  3. Verify token signature                                       │
│     const decoded = verifyToken(token)                           │
│     → VALID! ✅                                                  │
│                                                                   │
│  4. Add to headers and allow through                             │
│     ✅ ALLOW MOBILE APP                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ Check passes
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                   API ROUTE (route.ts)                            │
│                                                                   │
│  1. Call getAuthenticatedUser()                                  │
│  2. For Bearer: Use x-user-id header from middleware             │
│  3. Return user data ✅                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Examples

### Web App Request (NextAuth + Cookie)
```http
GET /api/wallet/balance HTTP/1.1
Host: api.NillarPay.ng
Cookie: next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Middleware Processing:**
```
✓ Check NextAuth token: FOUND
✓ Decode JWT: SUCCESS
✓ Verify signature: VALID
→ ALLOW REQUEST ✅
```

---

### Mobile App Request (Bearer Token)
```http
GET /api/wallet/balance HTTP/1.1
Host: api.NillarPay.ng
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Middleware Processing:**
```
✓ Check NextAuth token: NOT FOUND
✓ Check Bearer token: FOUND
✓ Verify JWT signature: VALID
→ ALLOW REQUEST ✅
```

---

### No Authentication (Should Fail)
```http
GET /api/wallet/balance HTTP/1.1
Host: api.NillarPay.ng
```

**Middleware Processing:**
```
✗ Check NextAuth token: NOT FOUND
✗ Check Bearer token: NOT FOUND
→ REJECT REQUEST (401) ✅
```

---

## Token Comparison

| Aspect | NextAuth (Web) | Bearer (Mobile) |
|--------|---|---|
| **Storage** | HTTP-only Cookie | SecureStore |
| **Header** | Cookie | Authorization |
| **Sent by** | Browser (automatic) | SDK (manual) |
| **Encryption** | JWT (verified) | JWT (verified) |
| **Refresh** | NextAuth handles | Mobile app handles |
| **Access** | JS cannot read | JS cannot read |
| **Security** | High | High |

---

## Endpoints - Who Can Access

```
PUBLIC ENDPOINTS (No auth needed):
├─ GET  /api/health
├─ GET  /api/data/networks
├─ POST /api/auth/login
├─ POST /api/auth/register
└─ POST /api/auth/refresh

PROTECTED ENDPOINTS (NextAuth OR Bearer):
├─ GET  /api/wallet/balance
│   ├─ ✅ Web app (NextAuth cookie)
│   ├─ ✅ Mobile app (Bearer token)
│   └─ ❌ No auth
│
├─ POST /api/wallet/fund
│   ├─ ✅ Web app (NextAuth cookie)
│   ├─ ✅ Mobile app (Bearer token)
│   └─ ❌ No auth
│
├─ POST /api/airtime/purchase
│   ├─ ✅ Web app (NextAuth cookie)
│   ├─ ✅ Mobile app (Bearer token)
│   └─ ❌ No auth
│
└─ ... all other protected endpoints
    ├─ ✅ Both methods work
    └─ ❌ No auth fails
```

---

## Security Flow Summary

```
REQUEST ARRIVES
    ↓
[Middleware Decision Tree]
    ↓
    ├─ Has NextAuth cookie?
    │   ├─ YES → Decode & verify JWT
    │   │   ├─ VALID → ✅ ALLOW
    │   │   └─ INVALID → ❌ REJECT
    │   └─ NO → Check Bearer token
    │
    └─ Has Bearer token?
        ├─ YES → Verify JWT
        │   ├─ VALID → ✅ ALLOW
        │   └─ INVALID → ❌ REJECT
        └─ NO → ❌ REJECT (401)

REQUEST ALLOWED
    ↓
API Route Receives Request
    ↓
API calls getAuthenticatedUser()
    ↓
Returns User Data
    ↓
Response Sent to Client
```

---

## Implementation Details

### Middleware Code:
```typescript
// STEP 1: Try NextAuth
const nextAuthToken = await getToken({
  req: request,
  secret: process.env.NEXTAUTH_SECRET,
})

if (nextAuthToken) {
  console.log('✅ NextAuth token found')
  return response  // ✅ ALLOW WEB APP
}

// STEP 2: Try Bearer Token
const authHeader = request.headers.get('authorization')
if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7)
  try {
    const decoded = verifyToken(token)
    console.log('✅ Bearer token valid')
    return NextResponse.next({ ... })  // ✅ ALLOW MOBILE APP
  } catch (error) {
    console.log('❌ Bearer token invalid')
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

// STEP 3: No auth found
console.log('❌ No valid authentication')
return NextResponse.json(
  { error: 'Authorization header required' },
  { status: 401 }
)
```

---

## Testing Both Simultaneously

### Web App Test:
```bash
# 1. Restart server
npm run dev

# 2. Open browser
http://localhost:3000/dashboard/wallet

# 3. Check console
✅ Should see NextAuth token logs
```

### Mobile App Test:
```bash
# 1. Ensure backend running
npm run dev

# 2. Start mobile app
npx expo start

# 3. Test wallet operations
- Fund wallet
- Check balance
- Make purchases

# 4. Check server logs
✅ Should see Bearer token logs
```

### Both Simultaneously:
```
Server Logs:
✅ [Middleware] NextAuth token found for: user@example.com
✅ [Middleware] Bearer token valid for: user-mobile-123

Both working at same time! 🎉
```

---

## Conclusion

**The middleware now intelligently routes requests:**

1. **NextAuth cookie present?** → ✅ Allow web app users
2. **Bearer token present?** → ✅ Allow mobile app users
3. **Neither present?** → ❌ Reject with 401

**Result:** Both web and mobile apps work perfectly together! 🚀

---

**Last Updated:** October 19, 2025  
**Status:** ✅ Dual-Auth System Fully Compatible
