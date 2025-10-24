# Wallet Balance API - Enhanced Debugging Guide

## What Changed

### Enhanced Logging in Backend (`app/api/wallet/balance/route.ts`)

Added detailed console logs at each step:

```typescript
console.log('🔵 [Wallet Balance] Request received')
console.log('✅ [Wallet Balance] User authenticated:', authUser.id)
console.log('✅ [Wallet Balance] User found, fetching transactions')
console.log('✅ [Wallet Balance] Returning success response')
console.error('❌ [Wallet Balance] Authentication failed:', authError.message)
console.error('❌ [Wallet Balance] User not found in database:', authUser.id)
console.error('🔴 [Wallet Balance] ApiError caught:', error.statusCode, error.message)
```

### Enhanced Logging in Frontend (`app/dashboard/wallet/page.tsx`)

Added detailed console logs:

```typescript
console.log('📊 Balance API Response Status:', balanceResponse.status)
console.log('📊 Balance API Response Data:', balanceData)
console.log('✅ Balance fetched successfully:', balanceData.data?.balance)
console.log('👤 Session available, fetching wallet data:', session.user?.email)
console.error('❌ Balance fetch error:', errorMsg, balanceData)
console.error('❌ Transactions fetch error:', transactionsResponse.status)
```

## How to Debug

### Step 1: Restart Dev Server

```bash
# Kill current process (Ctrl+C)
cd /c/projects/the-pos/the-backend
npm run dev
```

### Step 2: Open Browser DevTools

1. **Open Chrome DevTools** (F12 or Right-click → Inspect)
2. **Go to Console tab**
3. **Filter logs:**
   - Type `[Wallet Balance]` to see backend logs
   - Type `📊` to see API response logs
   - Type `👤` to see session logs

### Step 3: Test the Wallet Page

1. **Clear browser cache** (or use Incognito window)
2. **Login** to the dashboard
3. **Go to** `/dashboard/wallet`
4. **Check Console** for logs

### What to Look For

#### Success Flow (Expected Logs):

```
👤 Session available, fetching wallet data: user@example.com
📊 Balance API Response Status: 200
📊 Balance API Response Data: {success: true, data: {...}}
✅ Balance fetched successfully: 0
🔵 [Wallet Balance] Request received
✅ [Wallet Balance] User authenticated: user-id-123
✅ [Wallet Balance] User found, fetching transactions
✅ [Wallet Balance] Returning success response
```

#### Authentication Error (401):

```
⚠️ No session available
    OR
📊 Balance API Response Status: 401
📊 Balance API Response Data: {success: false, error: "Authentication required"}
❌ [Wallet Balance] Authentication failed: Authentication required
```

**What it means:** Session cookie not sent or session expired
**Fix:** Login again or clear browser cookies

#### User Not Found Error (404):

```
📊 Balance API Response Status: 404
📊 Balance API Response Data: {success: false, error: "User not found"}
❌ [Wallet Balance] User not found in database: user-id-123
```

**What it means:** Session user ID doesn't exist in database
**Fix:** Check if user was deleted, or re-register

#### API Error (500):

```
📊 Balance API Response Status: 500
📊 Balance API Response Data: {success: false, error: "Failed to fetch wallet balance", details: "..."}
🔴 [Wallet Balance] ApiError caught: 500
```

**What it means:** Server-side error
**Fix:** Check server logs for detailed error message

## Testing Checklist

### ✅ Before Testing
- [ ] Dev server restarted (`npm run dev`)
- [ ] Browser cache cleared or using Incognito
- [ ] User is logged in (check `/dashboard`)
- [ ] Console is open and filtering `[Wallet Balance]`

### ✅ During Testing
- [ ] Frontend shows "Loading..." initially
- [ ] Server logs appear in console (within 1-2 seconds)
- [ ] Balance loads successfully OR meaningful error shown
- [ ] No empty error objects `{}`

### ✅ After Testing
- [ ] Balance displays (₦0 or actual amount)
- [ ] "Recent Transactions" section visible
- [ ] Virtual Account details visible
- [ ] "Fund Wallet" and "Transfer" buttons clickable

## Common Issues & Fixes

### Issue 1: Empty Error Object `{}`

**Cause:** Old response format being returned

**Solution:**
1. Verify file has proper error handling
2. Check that all responses include `error` field:
   ```javascript
   // Correct
   { success: false, error: 'Message' }
   
   // Wrong
   { }
   ```
3. Restart server
4. Clear browser cache

### Issue 2: "Authentication required" Error

**Cause:** Session not being sent with request

**Verification:**
```javascript
// In console:
fetch('/api/wallet/balance', {
  credentials: 'include'  // ← This is REQUIRED
})
```

**Check:**
1. Is `credentials: 'include'` in fetch call? ✅
2. Are you logged in? Check session with:
   ```javascript
   // In console:
   const res = await fetch('/api/auth/session')
   console.log(await res.json())
   ```
3. Do cookies exist? Check DevTools → Application → Cookies

**Fix:**
- Re-login
- Or check if NEXTAUTH_SECRET is set in `.env`

### Issue 3: "User not found" Error

**Cause:** User exists in session but not in database

**Verification:**
```javascript
// Check session has correct user ID
console.log(session.user?.id)

// Check database has this user
```

**Fix:**
1. Verify user was created properly during registration
2. Check database directly (Prisma Studio):
   ```bash
   npx prisma studio
   ```
3. If user missing, re-register account

### Issue 4: Status 500 Error

**Cause:** Unexpected server error

**How to debug:**
1. Check full error message in console
2. Look for red text in server logs
3. Check Prisma connection is working
4. Verify `.env` variables are set

**Fix:**
```bash
# Check Prisma connection
npx prisma db push

# Check .env file exists and has DATABASE_URL
cat .env
```

## API Response Formats

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "balance": 0,
    "availableBalance": 0,
    "commissionBalance": 0,
    "pending": 0,
    "total": 0,
    "lastUpdated": "2025-10-19T12:00:00Z",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "recentTransactions": []
  }
}
```

### Authentication Error (401)

```json
{
  "success": false,
  "error": "Authentication required"
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "error": "User not found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Failed to fetch wallet balance",
  "details": "Error message details"
}
```

## Console Log Reference

| Log | Meaning | Status |
|-----|---------|--------|
| 👤 Session available | User is logged in | ✅ OK |
| ⚠️ No session | User not logged in | ❌ Problem |
| 🔵 Request received | API call started | ℹ️ Info |
| ✅ User authenticated | Session valid | ✅ OK |
| ❌ Authentication failed | Session invalid | ❌ Problem |
| ✅ User found | Database lookup success | ✅ OK |
| ❌ User not found | Database lookup failed | ❌ Problem |
| 📊 Response Status | HTTP status code | ℹ️ Info |
| 📊 Response Data | Full API response | ℹ️ Info |
| ✅ Balance fetched | Data loaded | ✅ OK |
| ❌ Balance fetch error | Failed to load | ❌ Problem |

## Quick Test Commands

### Test API directly (in browser console):

```javascript
// Test with credentials
const res = await fetch('/api/wallet/balance', {
  credentials: 'include'
})
const data = await res.json()
console.log('Status:', res.status)
console.log('Data:', data)
```

### Check session:

```javascript
const res = await fetch('/api/auth/session')
const session = await res.json()
console.log('Session:', session)
```

### Check cookies:

```javascript
// In DevTools Console:
// Application → Cookies → your-domain.com
// Look for: next-auth.session-token
```

## Next Steps

If you still see errors after applying these changes:

1. **Run the test in incognito window**
   ```
   - Press Ctrl+Shift+N
   - Login
   - Check console logs
   ```

2. **Check server logs** (in terminal running `npm run dev`)
   ```
   Look for 🔵 [Wallet Balance] logs
   ```

3. **Check database** (Prisma Studio)
   ```bash
   npx prisma studio
   # Navigate to User table
   # Verify user exists with correct ID
   ```

4. **Check environment variables**
   ```bash
   # Should have:
   DATABASE_URL=...
   NEXTAUTH_SECRET=...
   NEXT_PUBLIC_API_URL=...
   ```

## Support

If you still have issues after debugging:

1. Share the console logs (copy entire log output)
2. Share the server logs (from terminal running `npm run dev`)
3. Screenshot of DevTools → Network tab showing the request/response
4. State whether you're logged in or not
5. State what you see on the wallet page (loading, error, or blank)

---

**Last Updated:** October 19, 2025  
**Version:** Enhanced Debugging Guide v2  
**Status:** Complete with detailed logging
