# Amigo Admin System - Quick Reference Card

## Ì≥ä All 17 Amigo Plans at a Glance

### MTN Network (10 Plans)
```
PlanID  Data        Price   Per GB    Validity
5000    500MB       ‚Ç¶299    ‚Ç¶598      30 Days
1001    1GB         ‚Ç¶449    ‚Ç¶449      30 Days ‚≠ê Best Value
6666    2GB         ‚Ç¶849    ‚Ç¶424.5    30 Days
3333    3GB         ‚Ç¶1,379  ‚Ç¶459.67   30 Days
9999    5GB         ‚Ç¶1,899  ‚Ç¶379.8    30 Days
1110    10GB        ‚Ç¶3,899  ‚Ç¶389.9    30 Days
1515    15GB        ‚Ç¶5,790  ‚Ç¶386      30 Days
424     20GB        ‚Ç¶7,999  ‚Ç¶399.95   30 Days
379     36GB        ‚Ç¶11,900 ‚Ç¶330.56   30 Days
301     200GB       ‚Ç¶49,900 ‚Ç¶249.5    60 Days Ì¥• Bulk Option
```

### GLO Network (7 Plans)
```
PlanID  Data        Price   Per GB    Validity
296     200MB       ‚Ç¶99     ‚Ç¶495      30 Days Ì≤∞ Cheapest
258     500MB       ‚Ç¶239    ‚Ç¶478      30 Days
261     1GB         ‚Ç¶439    ‚Ç¶439      30 Days ‚≠ê Best Value
262     2GB         ‚Ç¶849    ‚Ç¶424.5    30 Days
263     3GB         ‚Ç¶1,289  ‚Ç¶429.67   30 Days
297     5GB         ‚Ç¶2,245  ‚Ç¶449      30 Days
265     10GB        ‚Ç¶4,490  ‚Ç¶449      30 Days
```

---

## Ì∑ÑÔ∏è Database Schema Location
**File:** `prisma/schema.prisma` (lines 224-254)

```prisma
model AmigoPlans {
  id                String   @id @default(cuid())
  planId            Int      @unique         // Amigo's ID (5000, 1001, etc.)
  networkName       String                   // 'MTN' or 'GLO'
  dataCapacity      String                   // '500MB', '1GB', etc.
  dataCapacityValue Float                    // 0.5, 1, 2, etc. (in GB)
  validityDays      Int                      // 30 or 60
  validityLabel     String                   // '30 Days', '60 Days'
  amigoBasePrice    Float                    // Official Amigo price
  adminOverridePrice Float?                  // Admin-set price (null = use base)
  pricePerGB        Float
  efficiencyRating  Float    @default(100)
  isEnabled         Boolean  @default(true)
  margin            Float?                   // override - base
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Ì≥Å Code Locations

| What | Where |
|------|-------|
| All 17 Plans | `lib/constants/data-plans.ts` (lines 1-280) |
| MTN Plans Array | `AMIGO_MTN_PLANS` constant |
| GLO Plans Array | `AMIGO_GLO_PLANS` constant |
| Get Plans by Network | `getAmigoPlans(network)` function |
| Get Plan by ID | `getAmigoPlansById(planId)` function |
| TypeScript Type | `AmigoBasePlan` interface |
| Error Handling | `app/api/data/purchase/route.ts` (lines 115-160) |

---

## Ì¥ß TypeScript Import Examples

```typescript
// Import all constants and helpers
import {
  AMIGO_MTN_PLANS,
  AMIGO_GLO_PLANS,
  getAmigoPlans,
  getAmigoPlansById,
  AmigoBasePlan,
} from '@/lib/constants/data-plans'

// Get all MTN plans
const mtnPlans = getAmigoPlans('MTN')  // Returns 10 plans

// Get specific plan
const plan = getAmigoPlansById(5000)   // Returns MTN 500MB plan
console.log(plan.amigoBasePrice)       // 299

// Iterate all plans
const allPlans = [...AMIGO_MTN_PLANS, ...AMIGO_GLO_PLANS]
allPlans.forEach(plan => {
  console.log(`${plan.networkName} ${plan.dataCapacity} @ ‚Ç¶${plan.amigoBasePrice}`)
})
```

---

## Ì∫Ä API Endpoints (To Be Created)

### GET `/api/admin/amigo-pricing`
Returns all 17 plans with admin overrides
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "planId": 5000,
        "networkName": "MTN",
        "dataCapacity": "500MB",
        "amigoBasePrice": 299,
        "adminOverridePrice": null,
        "margin": null,
        "isEnabled": true
      },
      // ... 16 more
    ],
    "summary": {
      "totalPlans": 17,
      "mtnPlans": 10,
      "gloPlans": 7,
      "withOverrides": 0
    }
  }
}
```

### PUT `/api/admin/amigo-pricing`
Update admin override price for a plan
```json
{
  "planId": 5000,
  "adminOverridePrice": 350
}
```

---

## Ìæ® Admin Pages (To Be Created)

### `/admin/amigo-pricing`
- Table of all 17 plans
- Inline edit for admin price
- Bulk margin operations
- Summary statistics

### `/admin/settings/amigo-config`
- Amigo API Key input
- Connection test button
- Status indicator
- Last update timestamp

---

## Ì∑™ Testing Commands

Once implementation is complete:

```bash
# 1. Run migration (after DB is online)
npx prisma migrate dev --name add_amigo_plans_model

# 2. Test plan fetching
curl http://localhost:3000/api/admin/amigo-pricing

# 3. Update a plan price
curl -X PUT http://localhost:3000/api/admin/amigo-pricing \
  -H "Content-Type: application/json" \
  -d '{"planId": 5000, "adminOverridePrice": 350}'

# 4. Make data purchase
curl -X POST http://localhost:3000/api/data/purchase \
  -H "Content-Type: application/json" \
  -d '{"network": "MTN", "phone": "09012345678", "planId": 5000, "pin": "1234"}'
```

---

## Ì≤° Key Concepts

**Amigo Base Price:** Official price from Amigo.ng
- **Use:** Reference for admins
- **Immutable:** Read-only, can't be changed
- **Example:** ‚Ç¶299 for MTN 500MB

**Admin Override Price:** Price set by admin
- **Use:** Actual price customers pay
- **Mutable:** Can be changed via admin panel
- **Default:** NULL (means use Amigo base price)
- **Example:** ‚Ç¶350 for MTN 500MB

**Margin:** Profit per plan
- **Formula:** Admin Price - Amigo Base Price
- **Example:** ‚Ç¶350 - ‚Ç¶299 = ‚Ç¶51 profit
- **Calculated:** Auto-computed, not stored

---

## Ì≥ã Implementation Checklist

- [ ] Database migration (when DB online)
- [ ] Seed 17 plans in database
- [ ] Create `/api/admin/amigo-pricing/route.ts`
- [ ] Create `/app/admin/amigo-pricing/page.tsx`
- [ ] Create `/api/admin/amigo-config/route.ts`
- [ ] Create `/app/admin/settings/amigo-config/page.tsx`
- [ ] Update purchase endpoint to use admin prices
- [ ] Add admin nav links
- [ ] Test complete flow
- [ ] Deploy to production

---

## Ì≥ö Documentation Files

1. **SESSION_IMPLEMENTATION_SUMMARY.md** - What was done today
2. **AMIGO_ADMIN_IMPLEMENTATION_GUIDE.md** - Detailed next steps
3. **AMIGO_QUICK_REFERENCE.md** - This file

---

## Ì∞õ Current Issues

‚ùå Database unreachable (Neon PostgreSQL)
- Blocks: Migration, plan seeding
- Status: Waiting for connectivity
- Action: Run migration once DB is online

---

## ‚úÖ Current Status

- All 17 Amigo plans defined in code ‚úì
- Database schema ready ‚úì
- Error handling improved ‚úì
- Build compiling ‚úì
- Documentation complete ‚úì
- **Ready for:** Database connectivity, then API/UI implementation

---

Last Updated: November 19, 2025
Build Status: ‚úì Successful (24.3s, 104 pages, 0 errors)
