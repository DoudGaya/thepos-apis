# 🚀 Quick Start - Test Your Production Features

## ✅ Features Ready to Test Right Now

### 1. Wallet Page with Paystack
**URL**: `http://localhost:3000/dashboard/wallet`

**What to Test**:
1. ✅ View real wallet balance
2. ✅ See recent transactions
3. ✅ Click "Fund Wallet"
4. ✅ Select "Pay with Card"
5. ✅ Enter amount (min ₦100)
6. ✅ Paystack popup opens
7. ✅ Complete payment
8. ✅ Wallet automatically credited
9. ✅ Success message appears
10. ✅ Balance updates

**Test Card** (Paystack Test Mode):
- Card Number: `4084084084084081`
- Expiry: Any future date
- CVV: Any 3 digits

### 2. Transaction History with Filters
**URL**: `http://localhost:3000/dashboard/transactions`

**What to Test**:
1. ✅ View all transactions
2. ✅ Filter by type (Data, Airtime, Electricity, etc.)
3. ✅ Filter by status (Completed, Pending, Failed)
4. ✅ Search by reference number
5. ✅ Search by description
6. ✅ Pagination works
7. ✅ Transaction details display correctly
8. ✅ Icons and colors correct

### 3. Data Purchase (API)
**Endpoint**: `POST /api/data/purchase`

**Test with cURL**:
```bash
curl -X POST http://localhost:3000/api/data/purchase \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "planId": "mtn-1gb",
    "vendorCost": 500,
    "planName": "MTN 1GB Data"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "vendorCost": 500,
    "sellingPrice": 600,
    "profit": 100,
    "transaction": {...}
  }
}
```

### 4. Electricity Purchase (API)
**Endpoint**: `POST /api/bills/electricity`

**Test with cURL**:
```bash
curl -X POST http://localhost:3000/api/bills/electricity \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "provider": "EKEDC",
    "meterNumber": "04512345678",
    "meterType": "prepaid",
    "vendorCost": 2000,
    "customerName": "John Doe"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "token": "1234-5678-9012",
    "units": "45.6 kWh",
    "vendorCost": 2000,
    "sellingPrice": 2100,
    "profit": 100
  }
}
```

---

## 🧪 TESTING CHECKLIST

### Wallet Funding Flow:
- [ ] User sees correct current balance
- [ ] "Fund Wallet" button works
- [ ] Payment modal opens
- [ ] Can select card payment
- [ ] Amount validation (min ₦100)
- [ ] Paystack popup appears
- [ ] Test card payment succeeds
- [ ] Verification happens automatically
- [ ] Success message appears
- [ ] Balance updates correctly
- [ ] New transaction appears in list
- [ ] Page refreshes with updated data

### Transaction History:
- [ ] Transactions load from API
- [ ] Loading spinner shows while fetching
- [ ] All transactions display correctly
- [ ] Type filter dropdown works
- [ ] Status filter dropdown works
- [ ] Search bar filters results
- [ ] Pagination buttons work
- [ ] Transaction icons correct
- [ ] Colors correct (green for credit, gray for debit)
- [ ] Status badges correct colors
- [ ] Date format is readable
- [ ] Reference numbers display
- [ ] Empty state shows when no transactions

### Data Purchase:
- [ ] API accepts valid request
- [ ] Validates phone number
- [ ] Checks wallet balance
- [ ] Calculates ₦100 profit correctly
- [ ] Deducts from wallet
- [ ] Calls VTU service
- [ ] Creates transaction record
- [ ] Stores vendorCost, sellingPrice, profit
- [ ] Creates notification
- [ ] Returns success response
- [ ] On failure: Refunds wallet
- [ ] On failure: Updates transaction status

### Electricity Purchase:
- [ ] API accepts valid request
- [ ] Validates meter number
- [ ] Checks wallet balance
- [ ] Calculates ₦100 profit correctly
- [ ] Deducts from wallet
- [ ] Calls VTU service
- [ ] Creates transaction record
- [ ] Stores token and units
- [ ] Creates notification
- [ ] Returns success response
- [ ] On failure: Refunds wallet
- [ ] On failure: Updates transaction status

---

## 🔍 What to Check in Database

After each purchase, verify in database:

### Transaction Table:
```sql
SELECT 
  id,
  type,
  amount,
  status,
  reference,
  details->>'vendorCost' as vendor_cost,
  details->>'sellingPrice' as selling_price,
  details->>'profit' as profit,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**:
- `amount` = selling price (e.g., 600 for data)
- `details.vendorCost` = 500
- `details.sellingPrice` = 600
- `details.profit` = 100

### User Table:
```sql
SELECT 
  id,
  email,
  credits as wallet_balance
FROM users
WHERE email = 'test@example.com';
```

**Expected**:
- `credits` reduces by `sellingPrice` on purchase
- `credits` increases by amount on wallet funding

### Notification Table:
```sql
SELECT 
  title,
  message,
  type,
  "isRead",
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:
- New notification after each transaction
- Type = TRANSACTION or SYSTEM
- Message includes amount and details

---

## 🚨 Common Issues & Solutions

### Issue: Paystack popup doesn't open
**Solution**: 
- Check Paystack script loaded: View source, search for `paystack`
- Check browser console for errors
- Verify `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in `.env`

### Issue: "Insufficient balance" error
**Solution**:
- Fund wallet first using "Fund Wallet" button
- Check database: `SELECT credits FROM users WHERE email = '...'`
- Ensure you're testing with correct user

### Issue: "Unauthorized" error
**Solution**:
- Ensure you're logged in
- Check session cookie in browser DevTools
- Verify `NEXTAUTH_SECRET` in `.env`

### Issue: VTU purchase fails
**Solution**:
- Check `VTU_API_KEY` is valid
- Check `VTU_API_URL` is correct
- Verify VTU account has sufficient balance
- Check VTU service logs

### Issue: Wallet not credited after payment
**Solution**:
- Check webhook is configured in Paystack dashboard
- Webhook URL: `https://yourdomain.com/api/wallet/webhook`
- Verify `PAYSTACK_SECRET_KEY` in `.env`
- Check webhook logs in Paystack dashboard

### Issue: Transactions not showing
**Solution**:
- Check API: `curl http://localhost:3000/api/transactions`
- Verify authentication
- Check database: `SELECT * FROM transactions`
- Look for errors in browser console

---

## 📊 Expected Profit Margins

| Service | Vendor Cost | Profit | Selling Price | Profit % |
|---------|------------|--------|---------------|----------|
| Data 1GB | ₦500 | ₦100 | ₦600 | 20% |
| Data 2GB | ₦900 | ₦100 | ₦1,000 | 11% |
| Electricity ₦2,000 | ₦2,000 | ₦100 | ₦2,100 | 5% |
| Cable DSTV | ₦9,000 | ₦100 | ₦9,100 | 1.1% |
| Airtime ₦1,000 | ₦975 | ₦25 | ₦1,000 | 2.5% |

---

## ✅ Success Criteria

Your implementation is working correctly if:

1. ✅ Wallet balance shows real data from database
2. ✅ Paystack payment completes successfully
3. ✅ Wallet automatically credited after payment
4. ✅ Transaction history shows all transactions
5. ✅ Filters work (type, status, search)
6. ✅ Data purchase deducts ₦600 for ₦500 vendor cost
7. ✅ Electricity purchase deducts ₦2,100 for ₦2,000 vendor cost
8. ✅ Transaction details include vendorCost, sellingPrice, profit
9. ✅ Failed purchases refund wallet automatically
10. ✅ Notifications created for each transaction

---

## 🎯 Next Features to Test (After Implementation)

- [ ] Airtime purchase with updated profit margin
- [ ] Cable TV purchase with ₦100 profit
- [ ] Betting wallet funding with ₦100 profit
- [ ] E-pins purchase with ₦100 profit
- [ ] Admin dashboard (users, transactions, analytics)
- [ ] Referral system (signup bonus, purchase bonus)
- [ ] Mobile app integration

---

**Ready to test!** Start with wallet funding, then try data purchase.
