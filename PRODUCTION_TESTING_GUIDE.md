# 🚀 PRODUCTION TESTING GUIDE

**Date:** October 18, 2025  
**System Status:** 99% COMPLETE - Ready for Testing!  
**Last Updated:** Before Production Launch

---

## 🎯 TESTING OVERVIEW

This guide provides step-by-step instructions for testing all features before production launch.

### Testing Phases:
1. **Environment Setup** (5 min)
2. **User Registration & Authentication** (10 min)
3. **Wallet Funding** (15 min)
4. **All Purchase Services** (45 min)
5. **Transaction History** (10 min)
6. **Referral System** (15 min)
7. **Admin Dashboard** (20 min)

**Total Estimated Time: 2 hours**

---

## ✅ PRE-TESTING CHECKLIST

### Environment Variables Setup

Before testing, ensure these environment variables are set in `.env`:

```env
# Database
DATABASE_URL="your-neon-postgres-url"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"  # or your production URL

# Paystack (IMPORTANT: Switch to LIVE keys for production)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxx"  # Change to pk_live_xxx
PAYSTACK_SECRET_KEY="sk_test_xxx"              # Change to sk_live_xxx

# VTU.ng (IMPORTANT: Use LIVE credentials)
VTU_API_KEY="your-live-vtu-api-key"            # Get from VTU.ng dashboard
VTU_BASE_URL="https://vtu.ng/api"
VTU_USERNAME="your-vtu-username"
VTU_PASSWORD="your-vtu-password"

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### Test vs Production Keys

| Service | Test Mode | Production Mode |
|---------|-----------|----------------|
| Paystack | `pk_test_...` / `sk_test_...` | `pk_live_...` / `sk_live_...` |
| VTU.ng | Test credentials | Live credentials |
| Database | Development DB | Production DB |

---

## 📋 TESTING CHECKLIST

### Phase 1: Environment Setup ✅

- [ ] Install dependencies: `npm install`
- [ ] Set up environment variables (`.env` file)
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Start development server: `npm run dev`
- [ ] Verify server runs on `http://localhost:3000`

**Expected Result:** Application loads without errors.

---

### Phase 2: User Registration & Authentication ✅

#### Test 2.1: New User Registration

1. Navigate to `/register`
2. Fill in registration form:
   ```
   Email: test@example.com
   Password: TestPass123!
   First Name: Test
   Last Name: User
   Phone: 08012345678
   PIN: 123456 (6 digits)
   ```
3. Click "Create Account"
4. Verify email sent (if email configured)
5. Check database for new user

**Expected Result:**
- ✅ User created successfully
- ✅ Redirected to dashboard
- ✅ Session established
- ✅ Wallet balance = ₦0

#### Test 2.2: Login

1. Logout from current session
2. Navigate to `/login`
3. Enter credentials:
   ```
   Email: test@example.com
   PIN: 123456
   ```
4. Click "Login"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ User details displayed

#### Test 2.3: Session Persistence

1. Refresh the page
2. Navigate to different pages
3. Close and reopen browser tab

**Expected Result:**
- ✅ User remains logged in
- ✅ No redirect to login page
- ✅ Session persists across page reloads

---

### Phase 3: Wallet Funding ✅

#### Test 3.1: Fund Wallet with Paystack

1. Navigate to `/dashboard/wallet`
2. Click "Fund Wallet" button
3. Enter amount: `₦1000` (minimum)
4. Click "Proceed to Payment"
5. Complete Paystack payment:
   - **Test Card:** `4084 0840 8408 4081`
   - **Expiry:** Any future date
   - **CVV:** `408`
   - **PIN:** `0000`
   - **OTP:** `123456`
6. Wait for payment confirmation

**Expected Result:**
- ✅ Paystack popup opens
- ✅ Payment processes successfully
- ✅ Wallet balance updates immediately
- ✅ Transaction appears in history
- ✅ Transaction status = SUCCESS
- ✅ Type = WALLET_FUNDING

#### Test 3.2: Failed Payment Handling

1. Try funding with invalid card
2. Cancel payment midway

**Expected Result:**
- ✅ Error message displayed
- ✅ Balance NOT updated
- ✅ Failed transaction logged
- ✅ User can retry

---

### Phase 4: Purchase Services Testing ✅

#### Test 4.1: Airtime Purchase

1. Navigate to `/dashboard/airtime`
2. Verify wallet balance displayed
3. Select network: **MTN**
4. Enter phone: `08012345678`
5. Click quick amount: **₦100**
6. Or enter custom amount: `₦200`
7. Verify pricing shows face value
8. Click "Purchase ₦200 Airtime"
9. Wait for confirmation

**Expected Result:**
- ✅ Balance check passes
- ✅ API call to `/api/airtime/purchase` succeeds
- ✅ VTU.ng processes airtime
- ✅ Wallet balance deducted
- ✅ Success message displayed
- ✅ Transaction in history
- ✅ Type = AIRTIME
- ✅ Airtime delivered to phone

**Test Multiple Networks:**
- [ ] MTN
- [ ] GLO
- [ ] AIRTEL
- [ ] 9MOBILE

#### Test 4.2: Data Purchase

1. Navigate to `/dashboard/data`
2. Select network: **MTN**
3. Enter phone: `08012345678`
4. Select data plan: **1GB - 30 Days (₦350)**
5. Verify pricing breakdown:
   ```
   Vendor Cost: ₦250
   Profit Margin: +₦100
   You Pay: ₦350
   ```
6. Click "Purchase 1GB Data - ₦350"

**Expected Result:**
- ✅ Data plan selected correctly
- ✅ Pricing calculation accurate
- ✅ Balance deducted (₦350)
- ✅ Data delivered to phone
- ✅ Transaction recorded
- ✅ Type = DATA

**Test Multiple Plans:**
- [ ] 1GB plan
- [ ] 2GB plan
- [ ] 5GB plan
- [ ] 10GB plan

#### Test 4.3: Electricity Purchase

1. Navigate to `/dashboard/electricity`
2. Select provider: **IKEDC** (or your DISCO)
3. Select meter type: **Prepaid**
4. Enter meter number: `12345678901` (your actual meter)
5. Enter amount: `₦1000`
6. Enter customer name (optional)
7. Verify pricing:
   ```
   Token Amount: ₦1,000
   Service Charge: +₦100
   Total: ₦1,100
   ```
8. Click "Purchase Electricity Token"

**Expected Result:**
- ✅ Meter validation passes
- ✅ Token generated
- ✅ Total deducted (₦1,100)
- ✅ Token details in response
- ✅ SMS sent with token (if configured)
- ✅ Transaction type = ELECTRICITY

**Test Multiple DISCOs:**
- [ ] EKEDC
- [ ] IKEDC
- [ ] PHEDC
- [ ] Your local DISCO

#### Test 4.4: Cable TV Subscription

1. Navigate to `/dashboard/cable-tv`
2. Select provider: **DSTV**
3. Enter smartcard: `1234567890` (your actual smartcard)
4. Select plan: **DSTV Compact (₦9,000)**
5. Verify pricing:
   ```
   Subscription: ₦9,000
   Service Charge: +₦100
   Total: ₦9,100
   ```
6. Click "Subscribe to DSTV Compact"

**Expected Result:**
- ✅ Smartcard validated
- ✅ Subscription processed
- ✅ Total deducted (₦9,100)
- ✅ Subscription activated
- ✅ Transaction type = CABLE_TV

**Test All Providers:**
- [ ] DSTV (multiple plans)
- [ ] GOTV (multiple plans)
- [ ] STARTIMES (multiple plans)

#### Test 4.5: Betting Wallet Funding

1. Navigate to `/dashboard/betting`
2. Select platform: **BET9JA**
3. Enter customer ID: `your-bet9ja-id`
4. Enter amount: `₦500`
5. Verify pricing:
   ```
   Betting Credit: ₦500
   Service Charge: +₦100
   Total: ₦600
   ```
6. Click "Fund Betting Wallet"

**Expected Result:**
- ✅ Customer ID validated
- ✅ Wallet funded
- ✅ Total deducted (₦600)
- ✅ Confirmation with reference
- ✅ Transaction type = BETTING

**Test Multiple Platforms:**
- [ ] BET9JA
- [ ] BETKING
- [ ] 1XBET
- [ ] NAIRABET

#### Test 4.6: Educational E-Pins

1. Navigate to `/dashboard/epins`
2. Select provider: **WAEC**
3. Set quantity: **2 pins**
4. Verify pricing:
   ```
   2 × ₦3,500 = ₦7,000
   Service Charge: +₦100
   Total: ₦7,100
   ```
5. Click "Purchase 2 WAEC E-Pins"

**Expected Result:**
- ✅ Quantity calculated correctly
- ✅ Total deducted (₦7,100)
- ✅ Pins generated
- ✅ Pins sent via email/SMS
- ✅ Transaction type = EPIN

**Test All Providers:**
- [ ] WAEC (₦3,500 per pin)
- [ ] NECO (₦1,000 per pin)
- [ ] NABTEB (₦800 per pin)

---

### Phase 5: Transaction History ✅

#### Test 5.1: View All Transactions

1. Navigate to `/dashboard/transactions`
2. Verify all previous transactions appear
3. Check transaction details:
   - Reference number
   - Amount
   - Status
   - Date/time
   - Description

**Expected Result:**
- ✅ All transactions displayed
- ✅ Correct amounts
- ✅ Accurate timestamps
- ✅ Proper status (SUCCESS/PENDING/FAILED)

#### Test 5.2: Filter by Type

1. Click "All Transactions" dropdown
2. Select "Data"
3. Verify only data transactions show
4. Test other filters:
   - Airtime
   - Electricity
   - Cable TV
   - Betting
   - E-Pins
   - Wallet Funding

**Expected Result:**
- ✅ Filters work correctly
- ✅ Only selected type displayed
- ✅ Transaction count updates

#### Test 5.3: Filter by Status

1. Select status filter: **SUCCESS**
2. Verify only successful transactions
3. Test other statuses:
   - PENDING
   - FAILED

**Expected Result:**
- ✅ Status filters work
- ✅ Correct transactions shown
- ✅ Empty state if no matches

#### Test 5.4: Search Transactions

1. Enter search term: Phone number
2. Search by reference
3. Search by amount

**Expected Result:**
- ✅ Search returns matches
- ✅ Multiple search criteria work
- ✅ Real-time search updates

#### Test 5.5: Pagination

1. If more than 20 transactions
2. Test "Next" button
3. Test "Previous" button
4. Test page number navigation

**Expected Result:**
- ✅ Pagination works smoothly
- ✅ Correct page displayed
- ✅ Transaction count accurate

---

### Phase 6: Referral System ✅

#### Test 6.1: Get Referral Code

1. Navigate to `/dashboard/referrals`
2. View your referral code
3. Copy referral link

**Expected Result:**
- ✅ Unique referral code displayed
- ✅ Referral link generated
- ✅ Copy button works

#### Test 6.2: Register via Referral

1. Logout current user
2. Open referral link in new browser/incognito
3. Register new user
4. Complete first transaction (₦100+ airtime)
5. Check referrer's account for bonus

**Expected Result:**
- ✅ Referral tracked in database
- ✅ New user linked to referrer
- ✅ After first purchase:
  - Referrer gets ₦50 bonus
  - New user gets ₦25 bonus
- ✅ Bonuses added to commission balance
- ✅ Referral status = COMPLETED

#### Test 6.3: View Referral Stats

1. Login as referrer
2. Navigate to `/dashboard/referrals`
3. Check referral statistics:
   - Total referrals
   - Active referrals
   - Total earnings
   - Pending earnings

**Expected Result:**
- ✅ Stats display correctly
- ✅ Referral list shows all referred users
- ✅ Earnings calculated accurately

---

### Phase 7: Admin Dashboard ✅

#### Test 7.1: Admin Access

1. Update user role to ADMIN in database:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
   ```
2. Navigate to `/admin`
3. Verify access granted

**Expected Result:**
- ✅ Admin dashboard loads
- ✅ Admin navigation visible
- ✅ All stats displayed

#### Test 7.2: View Metrics

1. Navigate to `/admin` (overview)
2. Check dashboard metrics:
   - Total Users
   - Total Revenue
   - Total Transactions
   - Total Profit
   - Monthly stats

**Expected Result:**
- ✅ All metrics display
- ✅ Numbers accurate
- ✅ Charts render correctly
- ✅ Data refreshes

#### Test 7.3: Users Management

1. Navigate to `/admin/users`
2. View all users list
3. Search for user by email
4. Filter by role (USER/ADMIN)
5. Check user details:
   - Wallet balance
   - Transaction count
   - Join date

**Expected Result:**
- ✅ User list displays
- ✅ Search works
- ✅ Filters work
- ✅ Pagination works
- ✅ All user details visible

#### Test 7.4: Transactions Monitoring

1. Navigate to `/admin/transactions`
2. View all transactions across all users
3. Filter by:
   - Transaction type
   - Status
   - Date range
4. Search by reference or user

**Expected Result:**
- ✅ All transactions visible
- ✅ Filters work correctly
- ✅ Search functional
- ✅ Export option available (if implemented)

#### Test 7.5: Sales Analytics

1. Navigate to `/admin/sales` or `/admin/analytics`
2. View charts:
   - Daily sales
   - Monthly revenue
   - Service breakdown
   - Profit margins
3. Change date range

**Expected Result:**
- ✅ Charts display correctly
- ✅ Data accurate
- ✅ Date filters work
- ✅ Multiple chart types

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Paystack Payment Not Completing

**Symptoms:** Payment popup closes but wallet not updated

**Fixes:**
- Check Paystack webhook configured
- Verify webhook URL: `https://your-domain.com/api/webhooks/paystack`
- Check Paystack dashboard for payment status
- Verify `PAYSTACK_SECRET_KEY` is correct

### Issue 2: VTU Purchase Fails

**Symptoms:** "Failed to complete purchase" error

**Fixes:**
- Verify VTU credentials in `.env`
- Check VTU account balance
- Ensure VTU API is accessible
- Check VTU transaction limits
- Verify network/service is available

### Issue 3: Insufficient Balance Error

**Symptoms:** "Insufficient wallet balance" despite having funds

**Fixes:**
- Hard refresh browser (Ctrl + Shift + R)
- Check actual balance in database
- Verify transaction was successful
- Check for pending transactions

### Issue 4: Session Expires Too Soon

**Symptoms:** Logged out after short time

**Fixes:**
- Check `NEXTAUTH_SECRET` is set
- Verify session maxAge in auth config
- Clear browser cookies and re-login

### Issue 5: Referral Bonus Not Credited

**Symptoms:** Referral completed but no bonus

**Fixes:**
- Check referral status in database
- Verify first purchase > ₦100
- Check commission balance (not main balance)
- Ensure referral code was used during registration

---

## 📊 SUCCESS CRITERIA

### ✅ Testing Complete When:

- [ ] All 6 purchase services work
- [ ] Wallet funding successful (test multiple amounts)
- [ ] Transaction history accurate
- [ ] Referral system credits bonuses
- [ ] Admin dashboard shows correct data
- [ ] All filters and search functional
- [ ] No JavaScript errors in console
- [ ] Mobile responsive (test on phone)
- [ ] Loading states appear properly
- [ ] Error messages display correctly
- [ ] Success notifications work
- [ ] Database records match UI

---

## 🚀 PRODUCTION DEPLOYMENT CHECKLIST

### Before Going Live:

#### Environment
- [ ] Switch Paystack to LIVE keys (`pk_live_`, `sk_live_`)
- [ ] Update VTU.ng to LIVE credentials
- [ ] Set production `DATABASE_URL`
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Configure production email SMTP
- [ ] Set secure `NEXTAUTH_SECRET` (32+ characters)

#### Database
- [ ] Run all migrations on production DB
- [ ] Seed initial data if needed
- [ ] Backup database
- [ ] Test database connection

#### Security
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly
- [ ] Set secure cookie settings
- [ ] Enable rate limiting
- [ ] Add input sanitization
- [ ] Configure CSP headers

#### Monitoring
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Enable performance monitoring
- [ ] Configure webhook error notifications

#### Payment & API
- [ ] Verify Paystack webhook URL
- [ ] Test Paystack live payments
- [ ] Confirm VTU API access
- [ ] Test all VTU services live
- [ ] Set transaction limits
- [ ] Configure email notifications

#### Final Checks
- [ ] Test all features in production
- [ ] Verify all pages load correctly
- [ ] Check mobile responsiveness
- [ ] Test with real users (beta)
- [ ] Document known issues
- [ ] Prepare rollback plan

---

## 📝 TEST RESULTS LOG

### Test Session 1: [Date]

| Feature | Status | Notes |
|---------|--------|-------|
| Registration | ⏳ Pending | - |
| Login | ⏳ Pending | - |
| Wallet Funding | ⏳ Pending | - |
| Airtime Purchase | ⏳ Pending | - |
| Data Purchase | ⏳ Pending | - |
| Electricity | ⏳ Pending | - |
| Cable TV | ⏳ Pending | - |
| Betting | ⏳ Pending | - |
| E-Pins | ⏳ Pending | - |
| Transaction History | ⏳ Pending | - |
| Referral System | ⏳ Pending | - |
| Admin Dashboard | ⏳ Pending | - |

### Issues Found:

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Status:** Fixed/Pending/Won't Fix
   - **Fix:** [Solution]

---

## 🎯 PERFORMANCE BENCHMARKS

### Target Metrics:

- Page Load Time: < 2 seconds
- API Response Time: < 1 second
- Payment Processing: < 5 seconds
- VTU Transaction: < 10 seconds
- Wallet Update: Immediate
- Error Rate: < 0.1%

### Actual Results:

- [ ] Page Load: ___ seconds
- [ ] API Response: ___ ms
- [ ] Payment: ___ seconds
- [ ] VTU: ___ seconds
- [ ] Error Rate: ____%

---

## 📞 SUPPORT CONTACTS

### Emergency Contacts:

- **VTU.ng Support:** support@vtu.ng
- **Paystack Support:** support@paystack.com
- **Database (Neon):** support@neon.tech
- **Hosting:** [Your hosting support]

### Documentation:

- VTU.ng Docs: https://vtu.ng/documentation
- Paystack Docs: https://paystack.com/docs
- NextAuth: https://next-auth.js.org

---

## ✅ SIGN-OFF

### Tested By: ___________________
### Date: ___________________
### Status: ⏳ Pending / ✅ Passed / ❌ Failed

### Notes:
```
[Add any additional notes here]
```

---

**Remember:** Test thoroughly before going live. Your users' trust depends on it! 🚀

*Last Updated: October 18, 2025*  
*Document Version: 1.0*
