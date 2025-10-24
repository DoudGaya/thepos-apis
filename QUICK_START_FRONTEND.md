# 🚀 Quick Start - Frontend Purchase Pages

**Start Here for Next Session**

---

## ✅ What's Already Done

- All 6 purchase endpoints are production-ready
- Wallet page with Paystack integration is complete
- Transaction history page is complete
- Pricing service calculates all profits automatically

---

## 🎯 Next Task: Create Frontend Purchase Pages

**Goal:** Build 6 pages so users can actually make purchases

**Time Estimate:** 4-5 hours total

---

## 📋 Page Checklist

### 1. Data Purchase Page (1 hour)
**File:** `app/dashboard/data/page.tsx`

**Form Fields:**
- Network dropdown: MTN, GLO, AIRTEL, 9MOBILE
- Data plan selection (fetch from API or hardcode)
- Phone number input (with validation)
- Price display: "Vendor Cost: ₦500 → You Pay: ₦600"

**API Call:**
```typescript
POST /api/data/purchase
{
  "network": "MTN",
  "phone": "08012345678",
  "planCode": "MTN-1GB-30DAYS",
  "vendorCost": 500
}
```

**Response Shows:** `vendorCost: 500, sellingPrice: 600, profit: 100`

---

### 2. Airtime Purchase Page (45 min)
**File:** `app/dashboard/airtime/page.tsx`

**Form Fields:**
- Network dropdown
- Amount input (₦50 - ₦50,000)
- Phone number input
- Quick buttons: ₦100, ₦200, ₦500, ₦1000

**API Call:**
```typescript
POST /api/airtime/purchase
{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 1000
}
```

**Note:** Airtime uses percentage profit (2.5-3%), not ₦100

---

### 3. Electricity Purchase Page (1 hour)
**File:** `app/dashboard/electricity/page.tsx`

**Form Fields:**
- Provider dropdown (13 options: EKEDC, IKEDC, etc.)
- Meter number input
- Meter type: Prepaid or Postpaid
- Amount input
- Customer name (optional)

**API Call:**
```typescript
POST /api/bills/electricity
{
  "provider": "EKEDC",
  "meterNumber": "1234567890",
  "meterType": "prepaid",
  "vendorCost": 5000
}
```

---

### 4. Cable TV Purchase Page (45 min)
**File:** `app/dashboard/cable-tv/page.tsx`

**Form Fields:**
- Provider: DSTV, GOTV, STARTIMES
- Smartcard number input
- Plan selection dropdown
- Plan name (optional)

**API Call:**
```typescript
POST /api/bills/cable-tv
{
  "provider": "DSTV",
  "smartcardNumber": "1234567890",
  "planCode": "dstv-compact",
  "vendorCost": 9000,
  "planName": "DSTV Compact"
}
```

---

### 5. Betting Funding Page (45 min)
**File:** `app/dashboard/betting/page.tsx`

**Form Fields:**
- Provider dropdown (13 options: BET9JA, BETKING, etc.)
- Customer ID input
- Amount input (₦100 - ₦100,000)

**API Call:**
```typescript
POST /api/bills/betting
{
  "provider": "BET9JA",
  "customerId": "123456",
  "vendorCost": 2000
}
```

---

### 6. E-Pins Purchase Page (45 min)
**File:** `app/dashboard/epins/page.tsx`

**Form Fields:**
- Provider: WAEC, NECO, NABTEB
- Quantity selector (1-10)
- Price per pin display
- Total cost calculation

**API Call:**
```typescript
POST /api/bills/epins
{
  "provider": "WAEC",
  "quantity": 2,
  "vendorCost": 7000
}
```

---

## 🎨 Design Pattern (Copy This for All Pages)

```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function ServicePurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    network: '',
    phone: '',
    amount: 0,
    // ... other fields
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch wallet balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      const res = await fetch('/api/wallet/balance')
      const data = await res.json()
      setWalletBalance(data.data.balance)
    }
    fetchBalance()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/bills/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `Purchase successful! Reference: ${data.data.reference}. 
        You paid ₦${data.data.sellingPrice.toLocaleString()}, 
        Profit: ₦${data.data.profit}`
      )
      
      // Update balance
      setWalletBalance(prev => prev - data.data.sellingPrice)
      
      // Reset form
      setFormData({})
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <h1 className="text-2xl font-bold">Service Name Purchase</h1>
          <p className="text-gray-300 mt-2">
            Wallet Balance: ₦{walletBalance.toLocaleString()}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form fields here */}
            
            {/* Price Breakdown */}
            {formData.vendorCost > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Pricing Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <p>Vendor Cost: ₦{formData.vendorCost.toLocaleString()}</p>
                  <p className="font-bold text-lg">
                    You Pay: ₦{(formData.vendorCost + 100).toLocaleString()}
                  </p>
                  <p className="text-green-600">Profit: ₦100</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || walletBalance < (formData.vendorCost + 100)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing...
                </>
              ) : (
                'Complete Purchase'
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-600 mr-2 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle2 className="text-green-600 mr-2 mt-0.5" size={20} />
              <div>
                <p className="text-green-800 font-semibold">Success!</p>
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🎯 Implementation Order

**Do them in this order for easiest to hardest:**

1. **Airtime** (Simplest: 3 fields)
2. **Data** (4 fields, similar to airtime)
3. **Betting** (3 fields, similar to airtime)
4. **E-Pins** (3 fields with quantity)
5. **Electricity** (5 fields, most complex)
6. **Cable TV** (4 fields, plan selection)

---

## 🧪 Testing Each Page

After creating each page:

1. **Visit the page:** `http://localhost:3000/dashboard/service-name`
2. **Check wallet balance displays**
3. **Fill form with valid data**
4. **Submit and verify:**
   - Loading state shows
   - Success message appears
   - Balance updates
   - Transaction appears in history
5. **Test error scenarios:**
   - Insufficient balance
   - Invalid phone number
   - Network error

---

## 📱 Mobile Responsiveness

All pages should work on mobile. Use:
```css
max-w-2xl mx-auto  // Centers content
p-4 sm:p-6         // Smaller padding on mobile
text-sm sm:text-base // Smaller text on mobile
```

---

## 🎨 Branding

Use these colors (matching wallet page):
- Background: `bg-gray-50`
- Cards: `bg-white` with `shadow-md`
- Header: `bg-gradient-to-br from-gray-900 to-gray-800`
- Buttons: `bg-gray-900 hover:bg-gray-800`
- Success: `bg-green-50 border-green-200 text-green-600`
- Error: `bg-red-50 border-red-200 text-red-600`

---

## ✅ Definition of Done

Each page is complete when:
- [ ] Form fields render correctly
- [ ] Wallet balance displays
- [ ] Pricing breakdown shows
- [ ] API call works
- [ ] Success message appears
- [ ] Error handling works
- [ ] Balance updates after purchase
- [ ] Transaction appears in history
- [ ] Mobile responsive
- [ ] Black/gray branding applied

---

## 🚀 Getting Started

```bash
# 1. Start dev server
cd c:/projects/the-pos/the-backend
npm run dev

# 2. Create first page (airtime is easiest)
mkdir -p app/dashboard/airtime
touch app/dashboard/airtime/page.tsx

# 3. Copy the template above and customize

# 4. Visit http://localhost:3000/dashboard/airtime

# 5. Test with a real purchase!
```

---

## 📚 Reference Documentation

- **Endpoint details:** `ALL_ENDPOINTS_COMPLETE.md`
- **Progress tracking:** `PROGRESS_DASHBOARD.md`
- **Session summary:** `SESSION_ENDPOINTS_COMPLETE.md`
- **Wallet page example:** `app/dashboard/wallet/page.tsx`

---

## 💡 Pro Tips

1. **Copy wallet page structure** - It already has the right styling and pattern
2. **Start with airtime** - It's the simplest (3 fields)
3. **Test as you go** - Don't build all 6 then test
4. **Use TypeScript** - It'll catch errors early
5. **Show pricing breakdown** - Users love transparency
6. **Add quick amount buttons** - Better UX
7. **Disable button when insufficient balance** - Prevent errors
8. **Update balance after purchase** - No page reload needed

---

## 🎯 Success Criteria

After completing all 6 pages:
- Users can purchase data from the website ✅
- Users can purchase airtime from the website ✅
- Users can purchase electricity from the website ✅
- Users can purchase cable TV from the website ✅
- Users can fund betting wallets from the website ✅
- Users can purchase e-pins from the website ✅

**Result:** Fully functional POS system ready for customers! 🎉

---

**Time:** 4-5 hours  
**Difficulty:** Medium  
**Dependencies:** None (all APIs ready)  
**Blockers:** None

**GO BUILD! 🚀**
