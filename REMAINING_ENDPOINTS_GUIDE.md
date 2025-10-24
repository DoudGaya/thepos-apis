# 🎯 REMAINING ENDPOINTS - Implementation Guide

## ✅ COMPLETED ENDPOINTS

### 1. Data Purchase (`app/api/data/purchase/route.ts`)
- ✅ ₦100 fixed profit margin
- ✅ NextAuth authentication
- ✅ Pricing service integration
- ✅ formatTransactionDetails
- ✅ Automatic refund on failure
- **Status**: PRODUCTION READY

### 2. Electricity Purchase (`app/api/bills/electricity/route.ts`)
- ✅ ₦100 fixed profit margin
- ✅ NextAuth authentication
- ✅ Pricing service integration
- ✅ formatTransactionDetails
- ✅ Automatic refund on failure
- **Status**: PRODUCTION READY

---

## ⚠️ ENDPOINTS NEEDING UPDATE

### 3. Cable TV (`app/api/bills/cable-tv/route.ts`)
**Current Status**: Old auth system, 0.5% markup  
**Needs**: ₦100 profit margin, NextAuth, pricing service

**Template to Use** (Copy from electricity endpoint):
```typescript
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateCableTVPricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const schema = z.object({
  provider: z.enum(['DSTV', 'GOTV', 'STARTIMES']),
  smartcardNumber: z.string().min(10),
  planCode: z.string(),
  vendorCost: z.number().positive(),
  planName: z.string().optional(),
})

export const POST = apiHandler(async (req) => {
  const user = await getAuthenticatedUser()
  const body = await validateRequestBody(req, schema)
  const { provider, smartcardNumber, planCode, vendorCost, planName } = body as z.infer<typeof schema>

  // Calculate ₦100 profit
  const { sellingPrice, profit } = calculateCableTVPricing(vendorCost)

  // Get user
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, credits: true },
  })

  if (!dbUser) throw new BadRequestError('User not found')
  
  // Check balance
  if (dbUser.credits < sellingPrice) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Required: ₦${sellingPrice}, Available: ₦${dbUser.credits}`
    )
  }

  const reference = generateReference('CABLE')
  
  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      type: 'CABLE',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
        description: `${provider} - ${planName || planCode}`,
        provider,
        smartcardNumber,
        planCode,
        planName,
      }),
    },
  })

  try {
    // Deduct from wallet
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: sellingPrice } },
    })

    // Call VTU
    const vtuResponse = await vtuService.purchaseCableTV(provider, smartcardNumber, planCode)

    // Update transaction
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          description: `${provider} - ${planName || planCode}`,
          provider,
          smartcardNumber,
          vtuTransactionId: vtuResponse.transaction_id,
        }),
      },
    })

    // Notification
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Cable TV Subscription Successful',
        message: `${provider} subscription successful. Cost: ₦${sellingPrice.toLocaleString()}`,
        type: 'TRANSACTION',
      },
    })

    return successResponse({
      message: 'Subscription successful',
      data: { vendorCost, sellingPrice, profit, reference },
    })
  } catch (error: any) {
    // Refund
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { increment: sellingPrice } },
    })

    // Mark failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    })

    // Notification
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Subscription Failed',
        message: `Refunded: ₦${sellingPrice.toLocaleString()}`,
        type: 'SYSTEM',
      },
    })

    throw new BadRequestError(error.message || 'Failed')
  }
})
```

---

### 4. Airtime (`app/api/airtime/purchase/route.ts`)
**Current Status**: Working, but uses percentage-based margin  
**Needs**: Keep percentage-based (already correct), just verify structure

**Note**: Airtime uses **percentage-based** profit (2.5%-3%), NOT ₦100 fixed.  
**Action**: Review to ensure it uses `calculateAirtimePricing()` from pricing service.

---

### 5. Betting (`app/api/bills/betting/`)
**Current Status**: Unknown (needs investigation)  
**Needs**: ₦100 profit margin, NextAuth, pricing service

**Schema**:
```typescript
const schema = z.object({
  provider: z.enum(['BET9JA', 'SPORTYBET', '1XBET', 'BETKING']),
  customerId: z.string(),
  vendorCost: z.number().positive(),
})
```

**VTU Method**: `vtuService.purchaseBetting(provider, customerId, amount)`  
**Pricing Function**: `calculateBettingPricing(vendorCost)`  
**Transaction Type**: `'BETTING'`

---

### 6. E-Pins (`app/api/bills/epins/`)
**Current Status**: Unknown (needs investigation)  
**Needs**: ₦100 profit margin, NextAuth, pricing service

**Schema**:
```typescript
const schema = z.object({
  provider: z.enum(['WAEC', 'NECO', 'NABTEB']),
  quantity: z.number().positive(),
  vendorCost: z.number().positive(),
})
```

**VTU Method**: `vtuService.purchaseEpins(provider, quantity)`  
**Pricing Function**: `calculateEpinsPricing(vendorCost)`  
**Transaction Type**: `'EPIN'`

---

## 📋 UPDATE CHECKLIST

For each endpoint:

- [ ] Replace old auth with `getAuthenticatedUser()`
- [ ] Import pricing service: `calculateXxxPricing()`
- [ ] Import `formatTransactionDetails()`
- [ ] Change schema to use `vendorCost` (not `amount`)
- [ ] Calculate: `const { sellingPrice, profit } = calculateXxxPricing(vendorCost)`
- [ ] Use `dbUser.credits` (not `walletBalance`)
- [ ] Deduct `sellingPrice` from wallet
- [ ] Call VTU with `vendorCost`
- [ ] Store pricing breakdown in transaction details
- [ ] On failure: Refund `sellingPrice`
- [ ] Create notifications with type `'TRANSACTION'` or `'SYSTEM'`
- [ ] Return `successResponse()` with data

---

## 🧪 TESTING EACH ENDPOINT

### Test Pattern:
```bash
curl -X POST http://localhost:3000/api/bills/[service] \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "provider": "...",
    "vendorCost": 1000,
    ...other fields
  }'
```

### Expected Response:
```json
{
  "success": true,
  "message": "...",
  "data": {
    "vendorCost": 1000,
    "sellingPrice": 1100,
    "profit": 100,
    "reference": "XXXXX"
  }
}
```

### Verify in Database:
```sql
SELECT 
  type,
  amount as selling_price,
  details->>'vendorCost' as vendor_cost,
  details->>'profit' as profit,
  status
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:
- `amount` = 1100 (selling price)
- `details.vendorCost` = 1000
- `details.profit` = 100

---

## ⏱️ TIME ESTIMATES

| Endpoint | Complexity | Estimated Time |
|----------|-----------|----------------|
| Cable TV | Medium | 30-45 min |
| Airtime | Low (review only) | 15-20 min |
| Betting | Medium | 30-45 min |
| E-Pins | Medium | 30-45 min |
| Testing All | - | 30-45 min |

**Total**: 2-3 hours

---

## 🚀 QUICK START

1. **Cable TV** - Use the template above, copy to `app/api/bills/cable-tv/route.ts`
2. **Airtime** - Review existing file, update to use pricing service if needed
3. **Betting** - Check if directory exists, create using cable TV as template
4. **E-Pins** - Check if directory exists, create using cable TV as template
5. **Test** - Use cURL commands for each endpoint
6. **Verify** - Check database for correct pricing breakdown

---

## 📝 NOTES

- **All services use ₦100 profit EXCEPT airtime** (airtime uses 2.5%-3%)
- **Always use `credits` field** (not `walletBalance`)
- **Always store `vendorCost`, `sellingPrice`, `profit`** in transaction details
- **Always refund on failure** using same `sellingPrice`
- **Notification types**: `TRANSACTION` for success, `SYSTEM` for failures

---

**Next Session**: Complete these 4 endpoints → Frontend purchase pages → Admin dashboard UI
