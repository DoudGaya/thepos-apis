# Real API Implementation Complete Guide

## Overview
This document provides a comprehensive guide to the real API implementation that connects your frontend to live backend services including Paystack, VTU.ng, and database operations.

## 1. Wallet System (Paystack Integration)

### Flow: Wallet Funding

```
User clicks "Fund Wallet" 
→ Calls POST /api/wallet/fund 
→ Creates PENDING transaction 
→ Initializes Paystack payment 
→ Returns payment authorization URL
→ User completes payment on Paystack
→ Paystack sends webhook to /api/wallet/webhook
→ Webhook verifies payment
→ Credits user's wallet (credits field)
→ Updates transaction to SUCCESS
→ Sends notification
```

### Key Endpoints

#### POST /api/wallet/fund
**Purpose**: Initialize wallet funding with Paystack

**Request**:
```json
{
  "amount": 5000,
  "callbackUrl": "http://localhost:3000/dashboard/wallet?payment=success"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "FUND_ABC123",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "accessCode": "...",
    "transaction": {
      "id": "tx_123",
      "amount": 5000,
      "status": "PENDING",
      "createdAt": "2025-10-18T..."
    }
  }
}
```

#### GET /api/wallet/verify?reference=FUND_XXX
**Purpose**: Check transaction status (called after Paystack callback)

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "tx_123",
    "reference": "FUND_ABC123",
    "amount": 5000,
    "status": "PENDING",
    "createdAt": "2025-10-18T..."
  }
}
```

#### POST /api/wallet/verify
**Purpose**: Manually verify and credit wallet after payment

**Request**:
```json
{
  "reference": "FUND_ABC123"
}
```

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "tx_123",
    "reference": "FUND_ABC123",
    "amount": 5000,
    "status": "SUCCESS"
  },
  "wallet": {
    "balance": 15000
  }
}
```

#### GET /api/wallet/balance
**Purpose**: Fetch current wallet balance

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": 15000,
    "availableBalance": 15000,
    "commissionBalance": 2500,
    "pending": 0,
    "total": 15000,
    "lastUpdated": "2025-10-18T...",
    "recentTransactions": [...]
  }
}
```

### Webhook Handler
**URL**: POST /api/wallet/webhook
**Headers**: Expects `x-paystack-signature` for verification
**Events Handled**:
- `charge.success`: Automatically credits wallet
- `charge.failed`: Updates transaction status to FAILED
- Other events: Ignored

## 2. Data Purchase System

### Flow: Buy Data Bundle

```
User selects network, phone, plan
→ Calls POST /api/data/purchase
→ Validates user balance
→ Deducts amount from wallet
→ Calls VTU.ng API
→ Updates transaction to COMPLETED
→ Creates notification
```

### Key Endpoints

#### POST /api/data/purchase
**Purpose**: Purchase data bundle

**Request**:
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "planId": "plan_1gb",
  "amount": 500,
  "planName": "1GB Data"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx_456",
      "reference": "DATA_ABC123",
      "network": "MTN",
      "phone": "08012345678",
      "plan": "1GB Data",
      "amount": 500,
      "status": "COMPLETED",
      "createdAt": "2025-10-18T..."
    },
    "vtu": {
      "transactionId": "vtu_123",
      "status": "success"
    },
    "balance": 14500
  }
}
```

### Error Handling
- **Insufficient Balance**: Returns `402` with message
- **Invalid Phone**: Returns `400` with validation error
- **VTU Failure**: Refunds user wallet and returns `400`

## 3. Referral System

### Flow: Referral Bonus

```
User A refers User B
→ When User B signs up, gets ₦500 signup bonus
→ When User B makes first purchase
→ User A gets ₦50 commission
→ User B gets ₦100 referral bonus
→ Both wallets credited automatically
→ Referral marked as COMPLETED
```

### Service Functions

**Location**: `/lib/services/referral.ts`

#### processReferralBonus(referredUserId, transactionId, amount)
Processes referral bonus after referred user's purchase

#### awardSignupBonus(userId, referrerId)
Awards ₦500 bonus when user signs up via referral

#### getReferralStats(userId)
Returns:
```json
{
  "totalReferrals": 5,
  "completedReferrals": 3,
  "pendingReferrals": 2,
  "totalEarned": 250,
  "paidEarnings": 250,
  "pendingEarnings": 0
}
```

### Key Endpoints

#### GET /api/referrals
**Purpose**: Fetch user's referral data

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalReferrals": 5,
      "totalEarned": 1500,
      "availableBalance": 1500,
      "pendingAmount": 0
    },
    "referrals": [...],
    "history": [...]
  }
}
```

## 4. Transaction System

### Transaction States

```
PENDING → SUCCESS → COMPLETED
       ↘ FAILED
         CANCELLED
```

### Transaction Types

- `DATA`: Data bundle purchase
- `AIRTIME`: Airtime top-up
- `ELECTRICITY`: Electricity token
- `CABLE` / `CABLE_TV`: Cable subscription
- `WALLET_FUNDING`: Wallet credit
- `REFERRAL_BONUS`: Referral earnings
- `BETTING`, `EPINS`, `WATER`: Future features

### Key Endpoints

#### GET /api/transactions?limit=20&type=DATA&status=SUCCESS
**Purpose**: Fetch user transactions with filters

**Query Params**:
- `limit`: Page size (default 20)
- `page`: Page number (default 1)
- `type`: Filter by transaction type
- `status`: Filter by status
- `startDate`: Filter by date (ISO string)
- `endDate`: Filter by date (ISO string)
- `search`: Search by reference

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": {
      "data": [...],
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "pages": 3
    },
    "stats": {
      "totalTransactions": 50,
      "totalSpent": 25000
    }
  }
}
```

## 5. Environment Configuration

### Required Environment Variables

```env
# NextAuth
NEXTAUTH_SECRET=63c755db67f6547ae57064428adb5ef4a43ee8a6bcd05912e3c6b5edbfd26fc0

# Database
DATABASE_URL=postgresql://...

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_BASE_URL=https://api.paystack.co

# VTU.NG (if using)
VTU_USERNAME=your-username
VTU_PASSWORD=your-password
VTU_USER_PIN=your-pin
VTU_BASE_URL=https://vtu.ng/wp-json/api/v2
```

## 6. Database Schema Key Relations

```prisma
User {
  id: String
  email: String
  credits: Float          // Wallet balance
  referralCode: String    // Unique referral code
  referredBy: String?     // Who referred this user
  
  transactions: Transaction[]
  referrals: Referral[]           // As referrer
  referredUsers: Referral[]       // As referred
  referralEarnings: ReferralEarning[]
}

Transaction {
  id: String
  userId: String
  type: TransactionType
  amount: Float
  status: TransactionStatus
  reference: String              // Unique reference
  details: Json                  // Type-specific data
  
  user: User
  referralEarnings: ReferralEarning[]
}

Referral {
  id: String
  referrerId: String
  referredId: String
  reward: Float
  status: String                 // PENDING, COMPLETED
}

ReferralEarning {
  id: String
  userId: String
  referredUserId: String?
  transactionId: String?
  amount: Float
  type: String                   // REFERRAL_BONUS, AGENT_COMMISSION
  status: String                 // PENDING, PAID
  paidAt: DateTime?
}
```

## 7. Error Handling

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error, insufficient balance)
- `401`: Unauthorized (authentication required)
- `402`: Payment Required (insufficient wallet balance)
- `404`: Not Found
- `500`: Server Error

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| `INSUFFICIENT_BALANCE` | Not enough wallet balance | Fund wallet via Paystack |
| `INVALID_PHONE` | Invalid Nigerian phone number | Use valid format: 08XXXXXXXXX |
| `INVALID_NETWORK` | Invalid network selection | Choose MTN, GLO, AIRTEL, or 9MOBILE |
| `TRANSACTION_NOT_FOUND` | Transaction doesn't exist | Verify transaction reference |
| `INVALID_SIGNATURE` | Webhook signature mismatch | Check Paystack secret key |

## 8. Security Best Practices

### Never Do This:
- ❌ Expose PAYSTACK_SECRET_KEY in frontend code
- ❌ Expose VTU credentials in frontend code
- ❌ Store passwords in plain text
- ❌ Skip webhook signature verification
- ❌ Trust client-side amount values

### Always Do This:
- ✅ Verify webhook signatures on server
- ✅ Validate all user input on server
- ✅ Use HTTPS for production
- ✅ Keep secrets in .env file
- ✅ Log all transactions for audit trail
- ✅ Implement rate limiting
- ✅ Use authentication middleware

## 9. Testing Checklist

### Wallet Funding
- [ ] POST /api/wallet/fund returns authorization URL
- [ ] Paystack webhook processes payment correctly
- [ ] User balance increases after successful payment
- [ ] Failed payments update transaction status
- [ ] Notifications sent on success/failure

### Data Purchase
- [ ] POST /api/data/purchase validates phone number
- [ ] Balance insufficient error returns 402
- [ ] VTU API called with correct parameters
- [ ] Wallet deducted on success
- [ ] Wallet refunded on failure
- [ ] Transaction created with correct status

### Referral System
- [ ] Signup bonus awarded when user joins via referral
- [ ] First purchase bonus awarded to referred user
- [ ] Commission awarded to referrer
- [ ] Both wallets credited correctly
- [ ] Stats calculated accurately

### Transaction Tracking
- [ ] All transactions logged to database
- [ ] Filters work correctly (type, status, date)
- [ ] Pagination works
- [ ] Transaction details saved correctly

## 10. Deployment Checklist

- [ ] NEXTAUTH_SECRET set in production
- [ ] Paystack keys configured for production
- [ ] Database URL points to production database
- [ ] Webhook URL updated to production domain
- [ ] Error logging configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Database migrations applied
- [ ] Environment variables validated
- [ ] Backup strategy in place

## 11. Monitoring & Logs

### Log Locations
- Console: Development logs
- Database: Transaction records with full audit trail
- Paystack: Payment status and errors
- VTU.NG: API responses and failures

### Key Metrics to Monitor
- Transaction success rate
- Average transaction time
- Failed transactions count
- Wallet funding volume
- Referral conversion rate
- API response times

## 12. Integration Points

### Frontend to Backend Flow

```
Login (NextAuth) 
→ Session established 
→ Dashboard loads 
→ Fetch /api/wallet/balance 
→ Display balance 
→ User clicks "Fund Wallet" 
→ Show Paystack checkout 
→ Verify after payment 
→ Update UI with new balance
```

### Complete Transaction Flow

```
Transaction Initiated
→ Validate (balance, input)
→ Create PENDING transaction
→ Call external API (VTU/Paystack)
→ Update to SUCCESS
→ Increment wallet
→ Create notification
→ Log to database
→ Return result to frontend
```

---

**Last Updated**: October 18, 2025
**Status**: Production Ready
**Maintenance**: Regular monitoring and log review recommended
