# 🚀 QUICK START - TEST YOUR POS SYSTEM NOW!

**Ready to test in 5 minutes!** ⚡

---

## ⚡ FASTEST WAY TO TEST

### Step 1: Environment Setup (2 minutes)

1. **Copy this to your `.env` file:**

```env
# Database (Neon PostgreSQL)
DATABASE_URL="your-neon-database-url"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Paystack TEST Keys (for testing)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxx"
PAYSTACK_SECRET_KEY="sk_test_xxxxxxxxxxxx"

# VTU.ng TEST Credentials (for testing)
VTU_API_KEY="your-vtu-test-api-key"
VTU_BASE_URL="https://vtu.ng/api"
VTU_USERNAME="your-vtu-username"
VTU_PASSWORD="your-vtu-password"
```

2. **Get your keys:**
   - Paystack: https://dashboard.paystack.com/#/settings/developer
   - VTU.ng: https://vtu.ng/documentation

### Step 2: Start the Server (1 minute)

```bash
# Install dependencies (first time only)
npm install

# Run database migrations
npx prisma migrate deploy
npx prisma generate

# Start development server
npm run dev
```

Server will start at: **http://localhost:3000** 🎉

---

## 🧪 QUICK TEST FLOW (5 minutes)

### Test 1: Register User (30 seconds)
1. Go to: http://localhost:3000/register
2. Fill form:
   - Email: test@example.com
   - Password: Test123!
   - First Name: Test
   - Last Name: User
   - Phone: 08012345678
   - PIN: 123456
3. Click "Create Account"

✅ **Expected:** Redirected to dashboard

### Test 2: Fund Wallet (1 minute)
1. Go to: http://localhost:3000/dashboard/wallet
2. Click "Fund Wallet"
3. Enter amount: 5000
4. Use Paystack TEST card:
   - **Card:** `4084 0840 8408 4081`
   - **Expiry:** `12/25`
   - **CVV:** `408`
   - **PIN:** `0000`
   - **OTP:** `123456`

✅ **Expected:** Balance = ₦5,000

### Test 3: Buy Airtime (30 seconds)
1. Go to: http://localhost:3000/dashboard/airtime
2. Select: MTN
3. Enter phone: 08012345678
4. Click: ₦100
5. Click "Purchase ₦100 Airtime"

✅ **Expected:** Success message, balance = ₦4,900

### Test 4: Buy Data (30 seconds)
1. Go to: http://localhost:3000/dashboard/data
2. Select: MTN
3. Enter phone: 08012345678
4. Select: 1GB plan
5. Click "Purchase"

✅ **Expected:** Success, balance deducted

### Test 5: View Transactions (30 seconds)
1. Go to: http://localhost:3000/dashboard/transactions
2. See all your transactions
3. Filter by "Airtime"

✅ **Expected:** See airtime transaction

---

## 🎯 WHAT TO TEST NEXT

### All Purchase Services:
- [ ] Airtime (4 networks)
- [ ] Data (multiple plans)
- [ ] Electricity (your DISCO)
- [ ] Cable TV (DSTV/GOTV)
- [ ] Betting (any platform)
- [ ] E-Pins (WAEC/NECO)

### Admin Features:
1. Update your role to ADMIN:
   ```sql
   -- Run in your database
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'test@example.com';
   ```
2. Visit: http://localhost:3000/admin
3. Explore admin dashboard

---

## 🐛 COMMON ISSUES

### Issue: "Database connection failed"
**Fix:** Check your `DATABASE_URL` in `.env`

### Issue: "Paystack payment not working"
**Fix:** Verify `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is correct

### Issue: "VTU purchase fails"
**Fix:** 
- Check VTU credentials
- Ensure VTU account has balance
- Verify network is available

### Issue: "Page not loading"
**Fix:** 
- Clear browser cache
- Hard refresh (Ctrl + Shift + R)
- Restart dev server

---

## 📊 TEST CHECKLIST

Quick test checklist (check these off):

- [ ] Server starts successfully
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Wallet displays balance
- [ ] Paystack payment completes
- [ ] Balance updates after funding
- [ ] Airtime purchase works
- [ ] Data purchase works
- [ ] Transaction history shows records
- [ ] No errors in browser console

---

## 🎉 SUCCESS!

If all tests pass, your POS system is working! 🚀

### Next Steps:
1. Test all 6 services
2. Try admin dashboard
3. Test referral system
4. Review `PRODUCTION_TESTING_GUIDE.md` for comprehensive testing

---

## 💡 QUICK TIPS

### Paystack Test Cards:
- **Success:** `4084 0840 8408 4081`
- **Insufficient Funds:** `5060 6666 6666 6666 6666`
- **Declined:** `5060 0000 0000 0000 0006`

### VTU Test Mode:
- Use test credentials for sandbox environment
- Test with small amounts first
- Verify in VTU dashboard

### Database Management:
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (careful!)
npx prisma migrate reset
```

---

## 🚀 READY FOR PRODUCTION?

When all tests pass:
1. Update `.env` with LIVE keys
2. Test again with live credentials
3. Deploy to production
4. Configure webhooks
5. Launch! 🎉

See `PRODUCTION_TESTING_GUIDE.md` for full production checklist.

---

**Questions?** Check the documentation files:
- `PROJECT_COMPLETION_FINAL.md` - Complete feature list
- `PRODUCTION_TESTING_GUIDE.md` - Detailed testing guide
- `FRONTEND_PAGES_COMPLETE.md` - Frontend overview

**Happy Testing!** 🧪✨

*Last Updated: October 18, 2025*
