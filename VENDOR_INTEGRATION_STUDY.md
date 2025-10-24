# Vendor Integration Study & Implementation Notes

**Date:** October 21, 2025  
**Status:** Study Phase - Documentation Analysis  
**Goal:** Understand all vendor APIs before implementing production purchase flows

---

## 1. VTU.NG Analysis

### Summary
VTU.NG is a comprehensive REST API provider supporting airtime, data bundles, cable TV, electricity bills, betting, and ePINs. Authentication uses JWT bearer tokens that expire after 7 days. Base URL: `https://vtu.ng/wp-json`. Pricing is competitive: 1GB at ₦499, 3% airtime discount, 1.5% cable/electricity discount, 4% ePIN discount, 0.2% betting discount, ₦0 service fees.

### Supported Services
- **Airtime**: MTN, Glo, Airtel, 9mobile (₦10-₦50,000)
- **Data**: MTN, Glo, Airtel, 9mobile, Smile (via variation IDs)
- **Electricity**: All major DISCOs (Ikeja, Eko, Kano, Abuja, etc.)
- **Cable TV**: DSTV, GOTV, Startimes
- **Betting**: 1xBet, Bet9ja, BetKing, NairaBet, BetWay, etc.
- **ePINs**: Recharge card printing

### Authentication Method
- **Type**: JWT Bearer Token
- **Login Endpoint**: `POST /jwt-auth/v1/token`
- **Credentials**: `{ "username": "email_or_username", "password": "password" }`
- **Response**: `{ "token": "jwt_token", "user_email": "...", ... }`
- **Header Format**: `Authorization: Bearer your_jwt_token`
- **Token Expiry**: 7 days (auto-refresh recommended before each request or 2x/week)
- **Security**: Only latest token remains active; old tokens invalidate immediately
- **IP Whitelisting**: Optional (can restrict to specific server IPs)

### Key Endpoints

#### Balance Check
- **URL**: `GET /api/v2/balance`
- **Auth**: Required
- **Response**: `{ "code": "success", "data": { "balance": 5000.00, "currency": "NGN" } }`

#### Airtime Purchase
- **URL**: `POST /api/v2/airtime`
- **Auth**: Required
- **Params**: `request_id` (max 50 chars), `phone` (11-16 digits), `service_id` (mtn/airtel/glo/9mobile), `amount` (₦10-₦50,000)
- **Response States**: `processing-api`, `completed-api`, `refunded`

#### Data Variations (Public)
- **URL**: `GET /api/v2/variations/data?service_id=mtn` (optional filter)
- **Auth**: NOT required
- **Response**: Array of `{ variation_id, service_name, data_plan, price, availability }`

#### Data Purchase
- **URL**: `POST /api/v2/data`
- **Auth**: Required
- **Params**: `request_id`, `phone`, `service_id`, `variation_id`
- **Notes**: Must fetch variations first to get valid `variation_id`

#### Customer Verification (Electricity/Cable/Betting)
- **URL**: `POST /api/v2/verify-customer`
- **Auth**: Required
- **Params**: `customer_id` (meter/smartcard/betting ID), `service_id`, `variation_id` (for electricity meter type)
- **Purpose**: Verify customer before purchase

#### Transaction Requery
- **URL**: `POST /api/v2/requery`
- **Auth**: Required
- **Params**: `request_id` (original) OR `order_id`
- **Purpose**: Check status of pending/unknown transactions

### Rate/Price Format
- **Currency**: NGN (Nigerian Naira)
- **Format**: Integer (e.g., `1000` = ₦1,000)
- **Pricing**: Reseller prices in `price` field of variations
- **Response Fields**: `amount` (face value), `discount`, `amount_charged` (actual cost), `initial_balance`, `final_balance`

### Error Codes & Retry Policy
- **400 Errors**: `missing_fields`, `invalid_service`, `below_minimum_amount`, `above_maximum_amount`, `invalid_variation_id`
- **402**: `insufficient_funds` (vendor wallet low)
- **403**: `rest_forbidden` (invalid token or IP not whitelisted)
- **409**: `duplicate_request_id`, `duplicate_order` (within 3 minutes)
- **500**: `wallet_error`, internal errors
- **Retry Strategy**: Retry on 5xx, exponential backoff. Do NOT retry 400/409 errors.

### Webhook Capabilities
- **Support**: YES
- **Setup**: Configure in developer tab (account settings)
- **Format**: `POST callback_url` with order status
- **Payload**: `{ "order_id", "status", "product_name", "amount", "phone", "request_id", ... }`
- **Use Case**: Async status updates for pending transactions

### Idempotency Support
- **request_id**: Custom unique identifier (max 50 chars)
- **Behavior**: Duplicate `request_id` within window returns error `duplicate_request_id`
- **Window**: 3 minutes for duplicate order detection
- **Recommendation**: Use UUID v4 for `request_id`

### Special Rules & Caveats
1. **Phone Number Format**: Supports both `08012345678` and `+2348012345678`
2. **Phone-Network Validation**: Service ID must match phone number prefix
3. **Variation Availability**: Check `availability: "Available"` before purchase
4. **Token Refresh**: Generate new token regularly (before expiry)
5. **Order States**: `processing-api` → `completed-api` OR `refunded`
6. **Auto-Refund**: All failed orders refunded automatically
7. **KYC Limits**: 
   - Tier 1 (email verified): ₦50,000/day
   - Tier 2 (BVN verified): ₦500,000/day
   - Tier 3 (full KYC): Unlimited
8. **Minimum Amounts**: MTN ₦10, others ₦50 for airtime
9. **Electricity**: Must call verify-customer before purchase
10. **Cable TV**: Must call verify-customer and get variations before purchase

---

## 2. eBills.Africa Analysis

### Summary
eBills.Africa is a comprehensive REST API provider with services identical to VTU.NG. Uses JWT authentication with 7-day expiry. Base URL: `https://ebills.africa/wp-json`. Offers 10% data discount, 3% airtime, 1.5% cable/electricity, 4% ePINs, 0.2% betting, ₦0 fees. Direct SIM hosting infrastructure for instant delivery.

### Supported Services
- **Airtime**: MTN, Glo, Airtel, 9mobile
- **Data**: MTN, Glo, Airtel, 9mobile, Smile
- **Electricity**: All major DISCOs
- **Cable TV**: DSTV, GOTV, Startimes
- **Betting**: Multiple platforms
- **ePINs**: Recharge cards

### Authentication Method
- **Identical to VTU.NG**: JWT Bearer Token
- **Login Endpoint**: `POST /jwt-auth/v1/token`
- **Token Expiry**: 7 days
- **IP Whitelisting**: Optional

### Key Endpoints
- **IDENTICAL API STRUCTURE TO VTU.NG**
- `/api/v2/balance` - Check wallet
- `/api/v2/airtime` - Buy airtime
- `/api/v2/variations/data` - Get data plans (public)
- `/api/v2/data` - Buy data
- `/api/v2/verify-customer` - Verify customer
- `/api/v2/requery` - Check transaction status

### Rate/Price Format
- **Identical to VTU.NG**: NGN integers
- **Discount Rates**: Slightly better data discount (10% vs VTU.NG's variable)

### Error Codes & Retry Policy
- **IDENTICAL to VTU.NG**

### Webhook Capabilities
- **Support**: YES
- **Setup**: Configure in developer tab

### Idempotency Support
- **IDENTICAL to VTU.NG**: `request_id` field (max 50 chars)

### Special Rules & Caveats
- **API Structure**: 100% compatible with VTU.NG (same endpoints, params, responses)
- **Infrastructure**: Claims direct SIM hosting and premium direct connections
- **Pricing**: Slightly more competitive on data (10% flat discount)

---

## 3. ClubKonnect Analysis

### Summary
ClubKonnect uses a simpler GET-based API (not REST/JSON-first). Base URL: `https://www.nellobytesystems.com`. Authentication via UserID + APIKey in URL params. Supports airtime and data bundles. Uses callback URLs for async status updates. **Significantly different API design from VTU.NG/eBills.**

### Supported Services
- **Airtime**: MTN (3%), Glo (8%), Airtel (3.2%), 9mobile (7%)
- **Data**: MTN, Glo, Airtel, 9mobile (with specific plan codes)
- **NOTE**: No electricity, cable TV, betting, or ePINs mentioned

### Authentication Method
- **Type**: URL Parameters
- **Credentials**: `UserID` + `APIKey` in query string
- **Format**: `?UserID=CK123&APIKey=456&...`
- **No JWT/Bearer tokens**

### Key Endpoints

#### Buy Airtime
- **URL**: `GET https://www.nellobytesystems.com/APIAirtimeV1.asp?UserID=xxx&APIKey=xxx&MobileNetwork=01&Amount=100&MobileNumber=08012345678&RequestID=xxx&CallBackURL=xxx`
- **Method**: GET (unusual for purchase API)
- **Network Codes**: `01` (MTN), `02` (Glo), `03` (9mobile), `04` (Airtel)
- **Bonus Types**: `BonusType=01` (MTN Awuf 400%), `BonusType=02` (MTN Garabasa 1000%)

#### Buy Data
- **URL**: `GET https://www.nellobytesystems.com/APIDatabundleV1.asp?UserID=xxx&APIKey=xxx&MobileNetwork=01&DataPlan=1000.0&MobileNumber=08012345678&RequestID=xxx&CallBackURL=xxx`
- **Method**: GET
- **DataPlan Codes**: Float values like `1000.0` (1GB MTN SME), `500.0` (500MB), etc.

#### Query Transaction
- **URL**: `GET https://www.nellobytesystems.com/APIQueryV1.asp?UserID=xxx&APIKey=xxx&OrderID=xxx` OR `&RequestID=xxx`
- **Method**: GET
- **Response**: JSON with `orderid`, `statuscode`, `status`, `remark`, `amountcharged`, `walletbalance`

#### Cancel Transaction
- **URL**: `GET https://www.nellobytesystems.com/APICancelV1.asp?UserID=xxx&APIKey=xxx&OrderID=xxx`
- **Limitation**: Can only cancel `ORDER_RECEIVED` or `ORDER_ONHOLD` status

#### Get Service List
- **Airtime Discounts**: `GET https://www.nellobytesystems.com/APIAirtimeDiscountV2.asp?UserID=xxx`
- **Data Plans**: `GET https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=xxx`

### Rate/Price Format
- **Currency**: NGN (Naira)
- **Format**: Float/Decimal (e.g., `424.00`)
- **Response Field**: `amountcharged` (what was deducted)
- **Data Plan Codes**: Floats with decimals (e.g., `1000.0`, `500.01`, `100.01`)

### Error Codes & Retry Policy
- **Status Codes**:
  - `100`: `ORDER_RECEIVED`
  - `200`: `ORDER_COMPLETED`
  - Errors: `INVALID_CREDENTIALS`, `MISSING_CREDENTIALS`, `MISSING_USERID`, `MISSING_APIKEY`, `INVALID_AMOUNT`, `MINIMUM_50`, `MAXIMUM_200000`, `INVALID_RECIPIENT`
- **Retry Strategy**: Retry on transient errors, not on validation errors

### Webhook Capabilities
- **Support**: YES (via `CallBackURL` parameter)
- **Format**: Query string OR JSON string
- **Query String**: `http://callback?orderdate=...&orderid=...&statuscode=200&orderstatus=ORDER_COMPLETED&orderremark=...`
- **JSON String**: `{"orderdate":"...","orderid":"...","statuscode":"200","orderstatus":"ORDER_COMPLETED",...}`

### Idempotency Support
- **RequestID**: Custom identifier in URL param
- **Behavior**: Not explicitly documented, likely detects duplicates

### Special Rules & Caveats
1. **GET-based API**: Unusual (most APIs use POST for purchases)
2. **URL Parameter Auth**: Credentials in URL (less secure than headers)
3. **Network Codes**: Different format (`01`, `02`, etc. vs `mtn`, `glo`)
4. **DataPlan Codes**: Float-based with decimal suffixes (`.0`, `.01`, `.02`) to differentiate plan types
5. **Airtime Bonuses**: Special bonus codes for MTN promotions
6. **Callback Flexibility**: Supports both query string and JSON formats
7. **Order States**: `ORDER_RECEIVED` → `ORDER_COMPLETED` OR `ORDER_CANCELLED`
8. **Cancellation Window**: Can only cancel pending orders
9. **No Variations Endpoint**: Must use static plan codes or fetch from service list endpoint

---

## 4. Vendor Comparison Matrix

| Feature | VTU.NG | eBills.Africa | ClubKonnect |
|---------|--------|---------------|-------------|
| **API Style** | REST (POST/GET) | REST (POST/GET) | GET-based |
| **Auth Method** | JWT Bearer Token | JWT Bearer Token | URL Params (UserID + APIKey) |
| **Token Expiry** | 7 days | 7 days | N/A (static key) |
| **Base URL** | vtu.ng/wp-json | ebills.africa/wp-json | nellobytesystems.com |
| **Airtime** | ✅ MTN/Glo/Airtel/9mobile | ✅ MTN/Glo/Airtel/9mobile | ✅ MTN/Glo/Airtel/9mobile |
| **Data** | ✅ MTN/Glo/Airtel/9mobile/Smile | ✅ MTN/Glo/Airtel/9mobile/Smile | ✅ MTN/Glo/Airtel/9mobile |
| **Electricity** | ✅ All DISCOs | ✅ All DISCOs | ❌ |
| **Cable TV** | ✅ DSTV/GOTV/Startimes | ✅ DSTV/GOTV/Startimes | ❌ |
| **Betting** | ✅ Multiple platforms | ✅ Multiple platforms | ❌ |
| **ePINs** | ✅ | ✅ | ❌ |
| **Webhooks** | ✅ | ✅ | ✅ (CallBackURL) |
| **Idempotency** | ✅ request_id | ✅ request_id | ✅ RequestID |
| **IP Whitelist** | Optional | Optional | Not mentioned |
| **Public Variations** | ✅ (data/TV) | ✅ (data/TV) | ❌ (auth required) |
| **Customer Verify** | ✅ | ✅ | ❌ |
| **Transaction Requery** | ✅ | ✅ | ✅ |
| **Auto-Refund** | ✅ | ✅ | Not mentioned |
| **Data Discount** | Variable (1GB=₦499) | 10% | 3-8% by network |
| **Airtime Discount** | 3% | 3% | 3-8% by network |

---

## 5. Integration Strategy & Vendor Priority

### Service-by-Vendor Priority Matrix

| Service | Primary Vendor | Fallback Vendor | Tertiary |
|---------|---------------|-----------------|----------|
| **Airtime (MTN/Glo/Airtel/9mobile)** | VTU.NG | eBills.Africa | ClubKonnect |
| **Data (MTN/Glo/Airtel/9mobile)** | VTU.NG | eBills.Africa | ClubKonnect |
| **Data (Smile)** | VTU.NG | eBills.Africa | N/A |
| **Electricity** | VTU.NG | eBills.Africa | N/A |
| **Cable TV** | VTU.NG | eBills.Africa | N/A |
| **Betting** | VTU.NG | eBills.Africa | N/A |
| **ePINs** | VTU.NG | eBills.Africa | N/A |

### Rationale
1. **VTU.NG as Primary**: Most comprehensive service coverage, modern REST API, competitive pricing
2. **eBills.Africa as Fallback**: 100% API-compatible with VTU.NG, easy failover, slightly better data pricing
3. **ClubKonnect as Tertiary**: Limited to airtime/data only, older API design (GET-based), but good for redundancy

### Vendor Adapter Architecture

```typescript
interface VendorAdapter {
  // Core Methods
  authenticate(): Promise<string>  // Returns auth token or updates internal state
  getBalance(): Promise<{ balance: number, currency: string }>
  
  // Service Methods
  getPlans(service: ServiceType, network?: NetworkType): Promise<Plan[]>
  buyService(payload: PurchasePayload): Promise<VendorResponse>
  verifyCustomer?(payload: VerifyPayload): Promise<VerificationResult>
  verifyTransaction(reference: string | number): Promise<TransactionStatus>
  
  // Metadata
  getName(): string
  getSupportedServices(): ServiceType[]
}

type ServiceType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'BETTING' | 'EPIN'
type NetworkType = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | 'SMILE'

interface PurchasePayload {
  service: ServiceType
  network: NetworkType
  phone?: string
  amount?: number
  variationId?: string
  customerId?: string  // For electricity/cable/betting
  idempotencyKey: string
  metadata?: Record<string, any>
}

interface VendorResponse {
  success: boolean
  status: 'PROCESSING' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED'
  orderId: string
  vendorReference: string
  costPrice: number  // What vendor charged us
  message?: string
  metadata?: any
}
```

---

## 6. Missing Information & Assumptions

### Missing Information
1. **Actual Vendor Credentials**:
   - VTU.NG: username/password for JWT
   - eBills.Africa: username/password for JWT
   - ClubKonnect: UserID + APIKey
   - **Action**: Request from user or use test credentials

2. **Webhook URLs**:
   - Need public HTTPS endpoint for vendor callbacks
   - **Assumption**: Deploy endpoint at `https://domain.com/api/webhooks/vtu`, `/webhooks/ebills`, `/webhooks/clubkonnect`

3. **IP Whitelisting**:
   - VTU.NG and eBills support IP whitelisting
   - **Action**: Obtain production server IP and whitelist if required

4. **Current Vendor Balances**:
   - Need to check existing balances with vendors
   - **Assumption**: Assume sufficient vendor wallet balance; implement low-balance alerts

5. **Profit Margin Preferences**:
   - User mentioned ₦100 for data bundles
   - **Assumption**: 
     - Data: +₦100 fixed
     - Airtime: +5% (e.g., ₦100 airtime → sell at ₦105)
     - Electricity: +₦50 fixed
     - Cable TV: +₦50 fixed
     - Betting: +2%
     - ePINs: +5%
   - **Action**: Make configurable in admin settings

6. **KYC Status**:
   - VTU.NG/eBills have transaction limits based on KYC tier
   - **Assumption**: Accounts are Tier 2 (BVN verified, ₦500k/day limit)

7. **Error Notification Strategy**:
   - How to alert admin of vendor failures?
   - **Assumption**: Log to Sentry + email admin for critical failures

8. **Reconciliation Schedule**:
   - How often to run reconciliation jobs?
   - **Assumption**: Every 5 minutes for pending transactions, daily for vendor balance sync

### Documented Assumptions
1. **Database Schema**: Using existing Prisma models with additions:
   - `Transaction.vendorReference` (string)
   - `Transaction.idempotencyKey` (string, unique)
   - `Transaction.costPrice` (number) - what vendor charged
   - `Transaction.sellingPrice` (number) - what customer paid
   - `Transaction.profit` (number) - our profit
   - `Transaction.vendorName` (string) - which vendor processed
   - `Transaction.vendorResponse` (JSON) - full vendor response

2. **Token Management**: JWT tokens cached in memory/Redis with auto-refresh 1 hour before expiry

3. **Idempotency Keys**: Generated server-side as UUID v4, stored in Transaction table with unique constraint

4. **Webhook Security**: Verify webhook authenticity using signature/token if vendor supports it

5. **Failover Logic**: If primary vendor fails (non-validation error), auto-retry with fallback vendor

6. **Price Sync**: Cache vendor plan prices for 1 hour, refresh via cron job

7. **Transaction States**: 
   - `PENDING` - Created, wallet deducted, vendor call pending
   - `PROCESSING` - Vendor call made, awaiting response/webhook
   - `COMPLETED` - Vendor confirmed success
   - `FAILED` - Vendor rejected, wallet refunded
   - `REFUNDED` - Manual refund after failure

---

## 7. Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Create VendorAdapter interface
- [ ] Implement VTU.NG adapter (auth, balance, airtime, data)
- [ ] Implement eBills.Africa adapter (reuse VTU.NG logic)
- [ ] Implement ClubKonnect adapter (airtime, data only)
- [ ] Create PurchaseService with wallet validation and profit calculation
- [ ] Add Prisma schema migrations for new transaction fields
- [ ] Implement retry logic with exponential backoff

### Phase 2: Core Services (Days 3-4)
- [ ] Airtime purchase flow (all vendors)
- [ ] Data purchase flow (fetch variations, validate, purchase)
- [ ] Unit tests for price calculations and wallet operations
- [ ] Integration tests with mocked vendor responses

### Phase 3: Advanced Services (Days 5-6)
- [ ] Electricity purchase flow (verify customer, purchase)
- [ ] Cable TV purchase flow (verify customer, get variations, purchase)
- [ ] Betting purchase flow
- [ ] ePINs purchase flow

### Phase 4: Reliability & Monitoring (Days 7-8)
- [ ] Webhook handlers for all vendors
- [ ] Reconciliation cron job (check pending transactions)
- [ ] Vendor balance monitoring and alerts
- [ ] Error logging and Sentry integration
- [ ] Admin UI for pending/failed transactions

### Phase 5: Frontend Integration (Days 9-10)
- [ ] Replace mock data with real API calls
- [ ] Purchase flows with loading states and error handling
- [ ] Transaction receipts with vendor references
- [ ] Admin dashboard for vendor health and profit reporting

### Phase 6: Testing & Production Readiness (Days 11-12)
- [ ] End-to-end testing (sandbox environment)
- [ ] Load testing (concurrent purchases)
- [ ] Security audit (no leaked keys, proper validation)
- [ ] Documentation and deployment checklist
- [ ] Rollback plan and monitoring setup

---

## 8. Risk Assessment & Mitigation

### High-Risk Areas
1. **Duplicate Transactions**
   - **Risk**: User double-clicks, network retry causes double-charge
   - **Mitigation**: Strict idempotency key enforcement, DB unique constraint, frontend disable on submit

2. **Wallet Race Conditions**
   - **Risk**: Concurrent purchases overdraw wallet
   - **Mitigation**: Prisma transactions with row-level locking, atomic balance updates

3. **Vendor API Failures**
   - **Risk**: Vendor down, payment deducted but service not delivered
   - **Mitigation**: Automatic failover to backup vendor, webhook reconciliation, manual admin review

4. **Token Expiry Mid-Request**
   - **Risk**: JWT expires between validation and purchase
   - **Mitigation**: Refresh token proactively (1hr before expiry), retry once on 403 with new token

5. **Price Mismatch**
   - **Risk**: Vendor prices change, we charge old price
   - **Mitigation**: Fetch fresh variations before purchase, cache with TTL, admin price monitoring

6. **Webhook Spoofing**
   - **Risk**: Attacker sends fake success webhook
   - **Mitigation**: Verify webhook signature/token, cross-check with vendor query endpoint

### Medium-Risk Areas
1. **Insufficient Vendor Balance**
   - **Risk**: Our vendor wallet runs dry
   - **Mitigation**: Daily balance checks, email alerts at threshold, auto-disable vendor if balance low

2. **Network Timeouts**
   - **Risk**: Vendor request hangs, transaction stuck
   - **Mitigation**: HTTP timeout (30s), mark as PENDING, reconcile via cron job

3. **Data Plan Unavailability**
   - **Risk**: User selects plan that became unavailable
   - **Mitigation**: Check `availability: "Available"` before purchase, show real-time availability

### Low-Risk Areas
1. **Phone Number Format Variations**
   - **Risk**: User enters different formats
   - **Mitigation**: Normalize to 11-digit format server-side

2. **Partial Refunds**
   - **Risk**: Vendor charges less than expected
   - **Mitigation**: Refund difference to user wallet automatically

---

## 9. Security & Compliance Checklist

- [ ] All vendor credentials in environment variables (never hardcoded)
- [ ] No API keys exposed to frontend
- [ ] All purchase endpoints require authentication (NextAuth session)
- [ ] Validate user owns the wallet being debited
- [ ] Sanitize all user inputs (phone numbers, amounts)
- [ ] Rate limiting on purchase endpoints (prevent abuse)
- [ ] Audit log for all wallet transactions
- [ ] Encrypt sensitive data in database (if required)
- [ ] HTTPS only for webhook endpoints
- [ ] Verify webhook authenticity (signature/token)
- [ ] No sensitive data in frontend Redux/state
- [ ] Mask full phone numbers in admin UI (show last 4 digits)
- [ ] Implement RBAC for admin actions (retry, refund)

---

## 10. Next Steps

### Immediate Actions
1. ✅ **Complete this study document** (DONE)
2. **Obtain Vendor Credentials**:
   - Request VTU.NG test account credentials
   - Request eBills.Africa test account credentials
   - Request ClubKonnect test UserID + APIKey
3. **Set Up Test Environment**:
   - Add vendor credentials to `.env.local`
   - Test authentication with each vendor
   - Verify balance check and plan fetching
4. **Database Migration**:
   - Create Prisma migration for new transaction fields
   - Test migration on development database

### Before Writing Code
- [ ] Share this study document with team for review
- [ ] Confirm profit margin preferences
- [ ] Confirm priority vendor for each service
- [ ] Obtain test credentials for all vendors
- [ ] Set up Sentry project for error monitoring
- [ ] Create webhook endpoints (even if stubbed)

---

## Conclusion

All three vendors are well-documented and production-ready. VTU.NG and eBills.Africa share identical API structures (interchangeable), making implementation and failover seamless. ClubKonnect uses an older GET-based design but is stable for airtime/data redundancy.

**Recommended Approach**:
1. Implement VTU.NG adapter first (most comprehensive)
2. Clone VTU.NG adapter for eBills.Africa (change base URL only)
3. Implement ClubKonnect adapter separately (different API pattern)
4. Build PurchaseService to orchestrate vendor selection and failover
5. Test with sandbox/test accounts before production

**Estimated Timeline**: 12 days (Foundation → Testing → Production)

**Confidence Level**: HIGH - Documentation is comprehensive, APIs are mature, and patterns are clear.

---

**Study Phase Status**: ✅ COMPLETE  
**Ready for Implementation**: ⏳ PENDING (awaiting credentials and team review)
