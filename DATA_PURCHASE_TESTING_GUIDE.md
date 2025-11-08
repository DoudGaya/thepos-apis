# DATA PURCHASE - QUICK START & TESTING GUIDE

## 🚀 Quick Start

### 1. Navigate to Data Purchase Page
```
URL: http://localhost:3000/dashboard/data
```

### 2. Test Purchase Flow

**Step-by-Step**:
1. **Select Network**: Click on MTN, GLO, AIRTEL, or 9MOBILE card
2. **Wait for Plans**: Plans load automatically (look for loading spinner)
3. **Enter Phone**: Type 11-digit Nigerian number (e.g., 08012345678)
4. **Select Plan**: Click on any available data plan card
5. **Review Summary**: Check purchase summary at bottom
6. **Click "Buy Data"**: Green button at bottom
7. **Enter PIN**: Type your 4-6 digit transaction PIN in modal
8. **Confirm**: Click "Confirm Purchase" button
9. **Success**: See green success alert and updated wallet balance

---

## 🧪 Testing Scenarios

### Scenario 1: Successful Purchase ✅
**Prerequisites**:
- Wallet balance > Plan price
- Valid transaction PIN set up

**Steps**:
1. Select network: MTN
2. Enter phone: 08012345678
3. Select plan: 1GB Data
4. Click "Buy Data"
5. Enter correct PIN: 1234
6. Click "Confirm Purchase"

**Expected Result**:
- ✅ Green success alert appears
- ✅ Wallet balance decreases by plan price
- ✅ Form resets (phone cleared, plan deselected)
- ✅ Can make another purchase immediately

---

### Scenario 2: Insufficient Balance ❌
**Prerequisites**:
- Wallet balance < Plan price

**Steps**:
1. Select expensive plan (e.g., 10GB)
2. Enter phone number
3. Click "Buy Data"

**Expected Result**:
- ❌ Red error alert: "Insufficient balance. Required: ₦X, Available: ₦Y"
- ❌ PIN modal does NOT appear
- ✅ Link to fund wallet in error message

---

### Scenario 3: Incorrect PIN ❌
**Prerequisites**:
- Sufficient wallet balance

**Steps**:
1. Complete form (network, phone, plan)
2. Click "Buy Data"
3. Enter wrong PIN: 9999
4. Click "Confirm Purchase"

**Expected Result**:
- ❌ Red error alert: "Incorrect PIN. Please try again."
- ✅ PIN modal remains open
- ✅ Can retry with correct PIN
- ✅ No wallet deduction

---

### Scenario 4: Missing Phone Number ❌
**Steps**:
1. Select network: MTN
2. Select plan (without entering phone)
3. Click "Buy Data"

**Expected Result**:
- ❌ Red error alert: "Please enter a valid 11-digit phone number"
- ❌ PIN modal does NOT appear

---

### Scenario 5: No Plan Selected ❌
**Steps**:
1. Select network: MTN
2. Enter phone: 08012345678
3. Click "Buy Data" (without selecting plan)

**Expected Result**:
- ❌ Red error alert: "Please select a data plan"
- ❌ PIN modal does NOT appear

---

### Scenario 6: Network Switching
**Steps**:
1. Select MTN → plans load
2. Select a plan
3. Switch to GLO
4. Observe behavior

**Expected Result**:
- ✅ Loading spinner appears
- ✅ GLO plans load
- ✅ Previously selected MTN plan is deselected
- ✅ Purchase summary disappears
- ✅ Can select GLO plan

---

### Scenario 7: PIN Show/Hide Toggle
**Steps**:
1. Complete form and open PIN modal
2. Enter PIN: 1234
3. Click eye icon (show/hide toggle)
4. Observe PIN visibility

**Expected Result**:
- ✅ Icon changes: Eye ↔ EyeOff
- ✅ PIN shows as plain text when "Show" is active
- ✅ PIN shows as dots when "Hide" is active
- ✅ Toggle works instantly

---

### Scenario 8: Modal Cancellation
**Steps**:
1. Complete form and open PIN modal
2. Enter partial PIN: 12
3. Click "Cancel" button

**Expected Result**:
- ✅ Modal closes
- ✅ PIN input is cleared
- ✅ Form data retained (network, phone, plan)
- ✅ Can reopen modal by clicking "Buy Data" again

---

### Scenario 9: Real-Time Balance Update
**Prerequisites**:
- Note current balance before purchase

**Steps**:
1. Complete successful purchase
2. Observe wallet balance in header

**Expected Result**:
- ✅ Balance decreases immediately
- ✅ Shows new balance: (Old Balance - Plan Price)
- ✅ Currency formatted: ₦X,XXX
- ✅ No page reload needed

---

### Scenario 10: Pricing Display
**Steps**:
1. Select any network
2. Wait for plans to load
3. Observe plan cards

**Expected Result**:
- ✅ Each plan shows TWO prices:
  - **Bold green price** (Selling Price) = Cost + ₦100
  - **Strikethrough gray price** (Cost Price) = Amigo's price
- ✅ Purchase summary shows selling price only
- ✅ Profit margin is ₦100 on every plan

---

### Scenario 11: Loading States
**Observe these loading indicators**:

1. **Page Load**:
   - Wallet balance shows "..."
   - Plans section shows spinner

2. **Network Switch**:
   - Plans section shows spinner
   - Previous plans cleared

3. **Purchase Processing**:
   - "Buy Data" button shows spinner
   - Button text: "Processing..."
   - Button is disabled
   - Modal buttons are disabled

---

### Scenario 12: Responsive Design
**Test on different devices**:

1. **Mobile (< 768px)**:
   - Network cards: 2 columns
   - Plan cards: 1 column
   - Modal: Full width with padding
   - Header: Stacked layout

2. **Desktop (>= 768px)**:
   - Network cards: 4 columns
   - Plan cards: 2 columns
   - Modal: Max-width centered
   - Header: Side-by-side layout

---

## 🔍 API Testing

### Test Plans API
```bash
# Fetch MTN plans
curl http://localhost:3000/api/data/plans?network=MTN

# Fetch GLO plans
curl http://localhost:3000/api/data/plans?network=GLO

# Expected Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "MTN-1GB-30DAYS",
        "name": "1GB Data - 30 Days",
        "network": "MTN",
        "costPrice": 250,
        "sellingPrice": 350,
        "profit": 100,
        "validity": "30 days",
        "isAvailable": true
      }
    ]
  }
}
```

### Test Purchase API
```bash
# Make a purchase
curl -X POST http://localhost:3000/api/data/purchase \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "planId": "MTN-1GB-30DAYS",
    "pin": "1234"
  }'

# Expected Success Response:
{
  "success": true,
  "message": "Data purchase successful",
  "data": {
    "transaction": { ... },
    "plan": { ... },
    "wallet": {
      "previousBalance": 5000,
      "amountCharged": 350,
      "newBalance": 4650
    }
  }
}

# Expected Error Response (Incorrect PIN):
{
  "success": false,
  "error": "Incorrect PIN. Please try again."
}

# Expected Error Response (Insufficient Balance):
{
  "success": false,
  "error": "Insufficient balance. Required: ₦350, Available: ₦200. Please fund your wallet to continue."
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No plans available"
**Cause**: Amigo API not responding or credentials invalid

**Solution**:
1. Check `.env` file has `AMIGO_API_KEY`
2. Verify API key is valid
3. Check network connection
4. Review server logs for API errors

---

### Issue 2: PIN modal doesn't appear
**Cause**: Form validation failed

**Check**:
- Phone number is 11 digits
- A plan is selected
- Wallet balance is sufficient

---

### Issue 3: Purchase fails immediately
**Cause**: Session expired or PIN not set

**Solution**:
1. Refresh page and log in again
2. Go to Profile → Set up transaction PIN
3. Retry purchase

---

### Issue 4: Wallet balance doesn't update
**Cause**: Frontend state not refreshing

**Solution**:
- Refresh the page manually
- Check browser console for errors
- Verify API returned new balance in response

---

### Issue 5: Plans load slowly
**Cause**: Amigo API slow response

**Expected**:
- Loading spinner shows while waiting
- Plans appear when ready
- Timeout after 30 seconds

---

## ✅ Testing Checklist

### Functional Testing
- [ ] Network selection (all 4 networks)
- [ ] Plan fetching for each network
- [ ] Phone number validation
- [ ] Plan selection
- [ ] Purchase summary display
- [ ] Wallet balance display
- [ ] PIN modal appearance
- [ ] PIN show/hide toggle
- [ ] Successful purchase flow
- [ ] Wallet deduction
- [ ] Balance update after purchase
- [ ] Error: Insufficient balance
- [ ] Error: Incorrect PIN
- [ ] Error: Missing phone number
- [ ] Error: No plan selected
- [ ] Success alert dismissal
- [ ] Error alert dismissal
- [ ] Modal cancellation
- [ ] "Forgot PIN?" link

### UI/UX Testing
- [ ] Loading states (balance, plans, purchase)
- [ ] Button disabled states
- [ ] Responsive design (mobile)
- [ ] Responsive design (desktop)
- [ ] Color coding (networks)
- [ ] Currency formatting
- [ ] Plan card styling
- [ ] Modal centering
- [ ] Alert styling
- [ ] Icon display

### Security Testing
- [ ] PIN is hidden by default
- [ ] PIN not sent in plain text
- [ ] Session validation
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention

### Performance Testing
- [ ] Plans load in < 3 seconds
- [ ] Purchase completes in < 5 seconds
- [ ] Page loads in < 2 seconds
- [ ] No memory leaks
- [ ] No console errors

---

## 📊 Expected Behavior Summary

| Action | Expected Behavior | Time |
|--------|------------------|------|
| Page Load | Wallet balance + MTN plans load | 1-2s |
| Network Switch | Plans reload | 1-2s |
| Click "Buy Data" | PIN modal appears | Instant |
| Enter PIN | Input accepts 4-6 digits only | Instant |
| Confirm Purchase | Loading → Success alert | 2-5s |
| Wallet Update | Balance decreases | Instant |

---

## 🎯 Success Criteria

A successful implementation should:
1. ✅ Allow users to purchase data from any of the 4 networks
2. ✅ Show clear pricing with ₦100 profit margin visible
3. ✅ Require PIN verification for security
4. ✅ Validate wallet balance before purchase
5. ✅ Update wallet balance immediately after purchase
6. ✅ Display clear error messages for all failure cases
7. ✅ Work smoothly on mobile and desktop
8. ✅ Complete purchase in under 5 seconds
9. ✅ Handle vendor errors gracefully with automatic refunds
10. ✅ Maintain transaction history for auditing

---

## 📞 Support

### For Users
- **Forgot PIN**: Go to Profile → Security → Reset PIN
- **Insufficient Balance**: Dashboard → Wallet → Fund Wallet
- **Purchase Failed**: Check transaction history, refund automatic if vendor failed

### For Developers
- **Logs**: Check server logs for API errors
- **Database**: Review `Transaction` table for purchase records
- **Vendor**: Check Amigo API status and credentials

---

**Testing Complete When All Scenarios Pass** ✅
