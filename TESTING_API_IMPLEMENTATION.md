# Real API Implementation - Testing Guide

## Quick Start Testing

### 1. Test Wallet Funding (Paystack)

#### Step 1: Initialize Payment
```bash
curl -X POST http://localhost:3000/api/wallet/fund \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_session_cookie]" \
  -d '{
    "amount": 1000,
    "callbackUrl": "http://localhost:3000/dashboard/wallet"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "reference": "FUND_XXX",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "transaction": {
      "id": "tx_123",
      "amount": 1000,
      "status": "PENDING"
    }
  }
}
```

#### Step 2: Verify Payment
After completing payment on Paystack, verify it:

```bash
curl -X GET "http://localhost:3000/api/wallet/verify?reference=FUND_XXX" \
  -H "Cookie: [your_session_cookie]"
```

**Expected Response** (after successful payment):
```json
{
  "success": true,
  "transaction": {
    "id": "tx_123",
    "reference": "FUND_XXX",
    "amount": 1000,
    "status": "SUCCESS"
  }
}
```

#### Step 3: Check Balance
```bash
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Cookie: [your_session_cookie]"
```

**Expected**: Balance increased by 1000

---

### 2. Test Data Purchase (VTU.NG Integration)

#### Purchase Data Bundle
```bash
curl -X POST http://localhost:3000/api/data/purchase \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_session_cookie]" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "planId": "1gb",
    "amount": 500,
    "planName": "1GB Data"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx_456",
      "reference": "DATA_ABC123",
      "network": "MTN",
      "phone": "08012345678",
      "status": "COMPLETED"
    },
    "balance": 14500
  }
}
```

#### Test Cases

| Test | Input | Expected | Notes |
|------|-------|----------|-------|
| Valid Purchase | network: MTN, valid phone, plan_1gb | SUCCESS | Balance decreases |
| Insufficient Balance | amount > user balance | 402 error | Returns insufficient balance message |
| Invalid Phone | phone: "123" | 400 error | Returns validation error |
| Invalid Network | network: "INVALID" | 400 error | Returns network error |
| VTU Failure | (simulated) | 400 error | Wallet refunded |

---

### 3. Test Referral System

#### Get Referral Stats
```bash
curl -X GET http://localhost:3000/api/referrals \
  -H "Cookie: [your_session_cookie]"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalReferrals": 5,
      "completedReferrals": 3,
      "totalEarned": 1500,
      "availableBalance": 1500
    },
    "referrals": [...],
    "history": [...]
  }
}
```

#### Test Cases

| Test | Action | Expected |
|------|--------|----------|
| New User Signup | User joins with referral code | ₦500 bonus credited |
| First Purchase | Referred user buys data | ₦100 bonus to referred user + ₦50 to referrer |
| Commission Tracking | User makes 5 purchases | User's wallet shows commission × 5 |
| Stats Accuracy | Get referral stats | Totals match transactions |

---

### 4. Test Transactions API

#### Fetch All Transactions
```bash
curl -X GET "http://localhost:3000/api/transactions?limit=10&page=1" \
  -H "Cookie: [your_session_cookie]"
```

#### Filter by Type
```bash
curl -X GET "http://localhost:3000/api/transactions?type=DATA&status=COMPLETED" \
  -H "Cookie: [your_session_cookie]"
```

#### Filter by Date Range
```bash
curl -X GET "http://localhost:3000/api/transactions?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Cookie: [your_session_cookie]"
```

---

### 5. Test Admin Dashboard Metrics

```bash
curl -X GET http://localhost:3000/api/admin/metrics \
  -H "Cookie: [your_session_cookie]"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 150,
      "newUsersThisMonth": 23,
      "totalTransactions": 1250,
      "totalRevenue": 125000,
      "monthlyProfit": 5000
    },
    "walletFunding": {
      "totalVolume": 500000,
      "transactionCount": 250
    },
    "referrals": {
      "totalCompleted": 45,
      "totalEarnings": 7500
    },
    "transactionBreakdown": {...},
    "trends": {...}
  }
}
```

---

## End-to-End Testing Scenarios

### Scenario 1: Complete User Journey

```javascript
// 1. User signs up
POST /api/auth/register
  → User created with referral code

// 2. Fund wallet with Paystack
POST /api/wallet/fund (amount: 5000)
  → Get authorization URL
  → User completes payment on Paystack
  → Webhook credits wallet
  
// 3. Check balance
GET /api/wallet/balance
  → Balance = 5000

// 4. Purchase data
POST /api/data/purchase (network: MTN, amount: 500)
  → VTU.NG API called
  → Wallet updated to 4500
  → Transaction created
  → Notification sent

// 5. View transactions
GET /api/transactions
  → Shows WALLET_FUNDING and DATA transactions
  → Total spent: 500

// 6. Check referrals (if applicable)
GET /api/referrals
  → Shows completed referrals
  → Shows earned commissions
```

---

## Testing with Paystack Sandbox

### Setup Paystack Sandbox

1. Create account at https://paystack.com
2. Go to Settings → API Keys
3. Copy test keys:
   - `PAYSTACK_SECRET_KEY=sk_test_...`
   - `PAYSTACK_PUBLIC_KEY=pk_test_...`

### Test Cards

| Card Number | CVV | Exp | Name | Result |
|-------------|-----|-----|------|--------|
| 4084084084084081 | Any | Any | Successful | Success |
| 5555555555554444 | Any | Any | Decline | Declined |

### Test Transaction Flow

1. Fund wallet with ₦1,000
2. Open Paystack checkout
3. Use test card `4084084084084081`
4. Enter any CVV, future expiry date
5. Enter test OTP: `123456`
6. Payment marked as successful
7. Webhook fires automatically
8. Wallet credited

---

## Common Issues & Fixes

### Issue 1: Webhook Not Firing

**Symptoms**: Transaction stays PENDING after payment

**Fixes**:
- Check PAYSTACK_SECRET_KEY is correct
- Verify webhook URL in Paystack dashboard
- Check webhook signature verification
- Look for errors in server logs

**Debug**:
```bash
# Check webhook URL is accessible
curl -X POST https://yourdomain.com/api/wallet/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "charge.success", "data": {...}}'
```

### Issue 2: Balance Not Updating

**Symptoms**: Payment successful but balance unchanged

**Causes**:
- Transaction not found in database
- User ID mismatch
- Database transaction not committed

**Debug**:
```bash
# Check transaction was created
SELECT * FROM transactions WHERE reference = 'FUND_XXX';

# Check user balance update
SELECT id, credits FROM users WHERE id = 'user_123';
```

### Issue 3: VTU Purchase Fails

**Symptoms**: Data purchase returns error

**Causes**:
- VTU API credentials incorrect
- Insufficient VTU balance
- Invalid phone number format
- Network API down

**Debug**:
```bash
# Check VTU credentials
echo "VTU_USERNAME: $VTU_USERNAME"
echo "VTU_BASE_URL: $VTU_BASE_URL"

# Check VTU balance
curl -X GET https://vtu.ng/api/balance \
  -H "Authorization: Bearer $VTU_USERNAME"
```

---

## Performance Testing

### Load Test: Simultaneous Purchases

```bash
# Test 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/data/purchase \
    -H "Content-Type: application/json" \
    -H "Cookie: [session_cookie_$i]" \
    -d "{...}" &
done
wait
```

**Expected**: All succeed without race conditions

### Metrics to Monitor
- Response time: < 1 second
- Error rate: < 0.5%
- Database connection pool usage
- Memory consumption

---

## Security Testing

### Test 1: API Key Exposure
```bash
# Verify PAYSTACK_SECRET_KEY not in frontend
grep -r "PAYSTACK_SECRET_KEY" app/
# Should find nothing
```

### Test 2: Session Hijacking
```bash
# Try accessing with fake session
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Cookie: session=fake_token"
# Should return 401 Unauthorized
```

### Test 3: CSRF Protection
```bash
# Try POST without CSRF token
curl -X POST http://localhost:3000/api/wallet/fund \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
# Should fail
```

---

## Database Integrity Checks

### Verify Transactions
```sql
-- Check transaction consistency
SELECT 
  COUNT(*) as total,
  status,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
  SUM(amount) as total_amount
FROM transactions
GROUP BY status;

-- Check for orphaned transactions
SELECT * FROM transactions WHERE user_id NOT IN (SELECT id FROM users);

-- Check wallet balance matches transactions
SELECT 
  u.id,
  u.credits,
  SUM(t.amount) as actual_balance
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'SUCCESS'
GROUP BY u.id
HAVING u.credits != COALESCE(SUM(t.amount), 0);
```

---

## Deployment Testing

### Pre-Production Checklist

- [ ] Test with production database (copy)
- [ ] Test with real Paystack keys
- [ ] Test with real VTU credentials
- [ ] Verify all environment variables
- [ ] Test email notifications
- [ ] Monitor server logs
- [ ] Test database backups
- [ ] Verify CORS configuration
- [ ] Test rate limiting
- [ ] Monitor API performance

---

## Continuous Testing

### Automated Tests (Recommended)

```javascript
// tests/wallet.test.ts
describe('Wallet System', () => {
  test('should fund wallet via Paystack', async () => {
    const response = await POST('/api/wallet/fund', { amount: 1000 })
    expect(response.status).toBe(200)
    expect(response.data.reference).toBeDefined()
  })

  test('should verify payment and credit wallet', async () => {
    // Fund wallet
    // Simulate webhook
    // Verify balance increased
  })
})
```

---

**Last Updated**: October 18, 2025
**Recommended Testing Frequency**: Before each deployment
