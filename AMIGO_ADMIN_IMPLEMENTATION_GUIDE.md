# Amigo Admin Pricing System - Implementation Guide

## Current Status

✅ **Completed:**
1. Updated Prisma schema with `AmigoPlans` model for storing admin-overridden prices
2. Enhanced `/lib/constants/data-plans.ts` with:
   - All 17 Amigo plan definitions (10 MTN, 7 GLO)
   - `AMIGO_MTN_PLANS` constant array with exact Amigo planIds (5000, 1001, 6666, etc.)
   - `AMIGO_GLO_PLANS` constant array with exact Amigo planIds (296, 258, 261, etc.)
   - Helper functions: `getAmigoPlans()`, `getAmigoPlansById()`
3. Improved error handling in `/app/api/data/purchase/route.ts` with comprehensive plan lookup debugging and error messages
4. Build verified and compiling successfully (✓ 30.8s, 104 pages)

## Next Steps (Priority Order)

### 1. Database Migration (BLOCKED - Waiting for DB Connectivity)
**Status:** ⏳ Waiting for Neon PostgreSQL connectivity
**Command to run once DB is back online:**
```bash
cd c:/projects/the-pos/the-backend
npx prisma migrate dev --name add_amigo_plans_model
```
**What it does:** Creates the `amigo_plans` table in PostgreSQL for storing admin pricing overrides

### 2. Create Admin Amigo Pricing API Endpoint
**File:** `/app/api/admin/amigo-pricing/route.ts`
**Requirements:**
- GET endpoint: Fetch all 17 Amigo plans with admin overrides from database
- PUT endpoint: Update admin override prices for specific plans
- Admin auth check using `requireAdmin()` middleware
- Response includes:
  - Plan details (planId, network, capacity, validity)
  - Amigo base price (read-only reference)
  - Admin override price (null = use Amigo base price)
  - Calculated margin (override - base)
  - Enabled status

**Key Logic:**
```typescript
// Seed database with all 17 plans on first access
if (plansCount === 0) {
  // Insert all AMIGO_MTN_PLANS and AMIGO_GLO_PLANS with adminOverridePrice = null
  // This means admins haven't set prices yet, so use Amigo base prices
}

// GET response
{
  success: true,
  data: {
    plans: [
      {
        planId: 5000,
        networkName: 'MTN',
        dataCapacity: '500MB',
        amigoBasePrice: 299,
        adminOverridePrice: null, // or 320 if admin set it
        margin: 21, // 320 - 299
        isEnabled: true,
        createdAt, updatedAt
      },
      // ... 16 more plans
    ],
    summary: {
      totalPlans: 17,
      mtnPlans: 10,
      gloPlans: 7,
      withOverrides: 3, // count where adminOverridePrice != null
    }
  }
}
```

### 3. Create Admin Pricing Management Page
**File:** `/app/admin/amigo-pricing/page.tsx`
**Features:**
- Responsive table showing all 17 plans:
  - Network (MTN/GLO badge with color)
  - Data capacity (500MB, 1GB, 200GB, etc.)
  - Validity (30 Days / 60 Days)
  - Amigo Base Price (₦299, ₦449, etc.) - read-only
  - Admin Override Price (editable input field)
  - Calculated Margin (auto-calculated, read-only)
  - Profit Margin % (auto-calculated, read-only)
  - Edit/Save buttons per row

**UI Elements:**
- Filter buttons: Show All / MTN Only / GLO Only
- Bulk actions: Apply 15% margin to all, Apply 10% margin to all, etc.
- Summary cards:
  - Total plans: 17
  - Plans with overrides: X
  - Avg margin: ₦XXX
  - Min margin: ₦XXX
- Validation:
  - Override price must be ≥ Amigo base price (profit rule)
  - Cannot set negative margins
  - Must be whole number (Naira)

**Implementation:**
```tsx
export default function AmigosPricingPage() {
  const [plans, setPlans] = useState<AmigosPlan[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch /api/admin/amigo-pricing
    // Display in table with inline editing
  }, [])

  const handleSave = async (planId: number, newPrice: number) => {
    // PUT /api/admin/amigo-pricing
    // Body: { planId, adminOverridePrice: newPrice }
  }

  const applyBulkMargin = async (marginPercent: number) => {
    // For each plan: newPrice = amigoBasePrice * (1 + marginPercent/100)
    // Bulk update via API
  }
}
```

### 4. Integrate Admin Pricing into Purchase Flow
**File:** `/app/api/data/purchase/route.ts` (enhance existing)
**Change:**
- When plan lookup succeeds, check if admin has override price
- Use admin override price instead of Amigo base price
- Calculate profit as: adminPrice - amigoBasePrice
- Log which price source was used (admin override vs base)

**Code change location** (around line 150):
```typescript
// Get admin override price if exists
const amigoPlansDb = await prisma.amigoPlans.findUnique({
  where: { planId: selectedPlan.planId }, // Need to add this field to plan object
})

const finalPrice = amigoPlansDb?.adminOverridePrice ?? selectedPlan.amigoBasePrice
const actualProfit = finalPrice - selectedPlan.amigoBasePrice

console.log('��� Pricing source:', amigoPlansDb?.adminOverridePrice ? 'Admin override' : 'Amigo base')
```

### 5. Add Amigo API Configuration Page
**File:** `/app/admin/settings/amigo-config/page.tsx`
**Features:**
- Input field for Amigo API Key
- Input field for Amigo API Token
- Test Connection button that:
  - Calls `/api/admin/amigo-config/test`
  - Verifies credentials with Amigo API
  - Shows status: ✅ Connected / ❌ Failed
- Display last test time and status
- Save button to update credentials in environment

**API Endpoint:** `/app/api/admin/amigo-config/route.ts`
- POST to set API key (stores in env or database)
- GET to retrieve config (API key masked for security)
- POST /test to verify connection

### 6. Navigation Update
**File:** `/app/admin/layout.tsx` or `/app/admin/page.tsx`
**Add links to:**
- Admin Amigo Pricing Management → `/admin/amigo-pricing`
- Amigo Configuration → `/admin/settings/amigo-config`

## Database Schema Reference

```prisma
model AmigoPlans {
  id                String   @id @default(cuid())
  planId            Int      @unique // Amigo's plan ID (5000, 1001, etc.)
  networkName       String   // 'MTN' or 'GLO'
  dataCapacity      String   // "500MB", "1GB", etc.
  dataCapacityValue Float    // 0.5, 1, 2, etc.
  validityDays      Int      // 30 or 60
  validityLabel     String   // "30 Days", "60 Days"
  amigoBasePrice    Float    // Amigo's official price
  adminOverridePrice Float? // Admin-set price (if null, use base)
  pricePerGB        Float    // Calculated
  efficiencyRating  Float    @default(100)
  isEnabled         Boolean  @default(true)
  margin            Float?   // Calculated as override - base
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([planId, networkName])
  @@index([networkName])
  @@index([isEnabled])
  @@map("amigo_plans")
}
```

## Amigo Plans Reference

**MTN Plans (10 total):**
| PlanId | Capacity | Price | Per GB |
|--------|----------|-------|--------|
| 5000   | 500MB    | ₦299  | ₦598   |
| 1001   | 1GB      | ₦449  | ₦449   |
| 6666   | 2GB      | ₦849  | ₦424.5 |
| 3333   | 3GB      | ₦1379 | ₦459.67|
| 9999   | 5GB      | ₦1899 | ₦379.8 |
| 1110   | 10GB     | ₦3899 | ₦389.9 |
| 1515   | 15GB     | ₦5790 | ₦386   |
| 424    | 20GB     | ₦7999 | ₦399.95|
| 379    | 36GB     | ₦11900| ₦330.56|
| 301    | 200GB    | ₦49900| ₦249.5 |

**GLO Plans (7 total):**
| PlanId | Capacity | Price | Per GB |
|--------|----------|-------|--------|
| 296    | 200MB    | ₦99   | ₦495   |
| 258    | 500MB    | ₦239  | ₦478   |
| 261    | 1GB      | ₦439  | ₦439   |
| 262    | 2GB      | ₦849  | ₦424.5 |
| 263    | 3GB      | ₦1289 | ₦429.67|
| 297    | 5GB      | ₦2245 | ₦449   |
| 265    | 10GB     | ₦4490 | ₦449   |

## Error Handling Improvements

✅ **Completed:**
- Purchase endpoint now provides detailed plan lookup debug info
- Error messages include available plans when lookup fails
- Plan ID mismatch is logged with string length and type info
- Helpful error: "Selected plan not found. Requested: 'mtn-1gb-7'. Available plans..."

## Testing Checklist

Once implementation is complete:

1. ✓ Admin can access `/admin/amigo-pricing`
2. ✓ All 17 plans display with correct prices
3. ✓ Admin can set override price for a plan
4. ✓ Admin price updates in database
5. ✓ User purchase uses admin price if set, else Amigo base price
6. ✓ Profit calculation: override - base (if override), else fixed margin
7. ✓ Amigo API key can be configured in `/admin/settings/amigo-config`
8. ✓ Connection test shows proper status
9. ✓ Purchase error "Plan not found" is resolved
10. ✓ Bulk margin operations work correctly

## Files Summary

**Modified:**
- `prisma/schema.prisma` - Added AmigoPlans model ✓
- `lib/constants/data-plans.ts` - Added all 17 Amigo plans ✓
- `app/api/data/purchase/route.ts` - Improved error handling ✓

**To Create:**
- `app/api/admin/amigo-pricing/route.ts` - GET/PUT prices
- `app/admin/amigo-pricing/page.tsx` - Admin UI for pricing
- `app/api/admin/amigo-config/route.ts` - API key management
- `app/admin/settings/amigo-config/page.tsx` - API config UI

## Migration Steps

1. Wait for Neon DB connectivity
2. Run migration: `npx prisma migrate dev --name add_amigo_plans_model`
3. Run seed (auto-populate 17 plans): Include in migration or API endpoint
4. Create API endpoint for pricing management
5. Create admin UI page
6. Test complete purchase flow
7. Deploy to production

---

**Next Session:** Start with step 1 (run migration) and step 2 (create API endpoint)
