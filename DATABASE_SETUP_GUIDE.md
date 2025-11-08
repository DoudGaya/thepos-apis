# DATABASE CONNECTION TROUBLESHOOTING

## Current Issue
Cannot connect to Neon PostgreSQL database

**Error**: `P1001: Can't reach database server`

---

## ✅ FIXES APPLIED

### 1. Fixed DATABASE_URL
**Problem**: URL was pointing to a temporary shadow database  
**Solution**: Updated to point to main database `neondb`

```env
DATABASE_URL="postgresql://neondb_owner:npg_rUaNMkY4hD0I@ep-lucky-sound-ad0ofupo-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2. Fixed NEXTAUTH_SECRET
**Problem**: Secret was broken across multiple lines  
**Solution**: Fixed to single line

### 3. Added AMIGO Configuration
Added missing Amigo API configuration for data purchase feature:
```env
AMIGO_API_KEY=your-amigo-api-key-here
AMIGO_API_URL=https://api.amigo.ng/v1
```

---

## 🔧 NEXT STEPS TO FIX CONNECTION

### Step 1: Check Neon Database Status

Your Neon database might be **paused** (common with free tier). To fix:

1. **Go to Neon Console**: https://console.neon.tech/
2. **Login** with your account
3. **Find your project**: `ep-lucky-sound-ad0ofupo`
4. **Check Status**:
   - If status shows "Paused" or "Inactive"
   - Click **"Restart"** or **"Resume"** button
5. **Wait 10-30 seconds** for database to start

### Step 2: Verify Connection String

If the database is active but still can't connect:

1. In Neon Console, go to your project
2. Click **"Connection Details"**
3. Copy the **new connection string**
4. Update `.env` file:

```env
DATABASE_URL="postgresql://[NEW_CONNECTION_STRING_HERE]"
```

**Important**: Make sure to:
- ✅ Use the **pooled connection** string (ends with `-pooler`)
- ✅ Include `?sslmode=require` at the end
- ✅ Replace password if it changed

### Step 3: Test Connection

Once database is active, run:

```bash
# Test connection
npx prisma db push

# If successful, generate Prisma Client
npx prisma generate

# Then start dev server
npm run dev
```

---

## 🆕 ALTERNATIVE: Create New Neon Database

If the old database is gone or inaccessible:

### Option 1: Neon Free Tier (Recommended for Development)

1. **Go to**: https://console.neon.tech/
2. **Sign up/Login**
3. **Create New Project**:
   - Name: `thepos-dev`
   - Region: `US East (Ohio)` or closest to you
   - Postgres Version: `16` (latest)
4. **Copy Connection String**:
   - Click "Connection Details"
   - Copy **Pooled Connection** string
   - Should look like: `postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/dbname`
5. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://[PASTE_HERE]?sslmode=require"
   ```
6. **Push Schema**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

### Option 2: Local PostgreSQL (For Testing)

If you want to test locally:

1. **Install PostgreSQL**: https://www.postgresql.org/download/
2. **Create Database**:
   ```bash
   psql -U postgres
   CREATE DATABASE thepos_dev;
   \q
   ```
3. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/thepos_dev"
   ```
4. **Push Schema**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

---

## 🔍 VERIFY DATABASE ACCESS

### Quick Connection Test

Run this to verify database is accessible:

```bash
# Test 1: Prisma introspection
npx prisma db pull

# Test 2: Studio (opens database GUI)
npx prisma studio

# Test 3: Direct connection test
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Connection failed:', err.message))
  .finally(() => prisma.\$disconnect());
"
```

---

## 📋 REQUIRED ENVIRONMENT VARIABLES

After fixing database connection, ensure these are set:

### Critical (Must Have):
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="your-jwt-secret"
```

### Payment Gateway:
```env
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
```

### SMS/OTP:
```env
TERMII_API_KEY="your-termii-key"
TERMII_SENDER_ID="NILLAR"
```

### VTU Services:
```env
VTU_USERNAME="your-username"
VTU_PASSWORD="your-password"
VTU_USER_PIN="your-pin"
```

### Data Purchase (Amigo):
```env
AMIGO_API_KEY="your-amigo-key"
AMIGO_API_URL="https://api.amigo.ng/v1"
```

---

## 🚀 COMPLETE SETUP SEQUENCE

Once database connection is working:

```bash
# 1. Push database schema
npx prisma db push

# 2. Generate Prisma Client
npx prisma generate

# 3. (Optional) Seed database with test data
# Create a seed script if needed

# 4. Start development server
npm run dev

# 5. Access the application
# Frontend: http://localhost:3000
# Admin: http://localhost:3000/admin
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: "Environment variables loaded from .env" but still fails
**Solution**: Close all terminals and VS Code, reopen, and try again

### Issue: Prisma Client errors after schema changes
**Solution**: 
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: Windows permission errors with Prisma
**Solution**:
```bash
# Stop all Node processes
taskkill /F /IM node.exe

# Clear Prisma cache
rm -rf node_modules/.prisma

# Regenerate
npx prisma generate
```

### Issue: Database exists but tables are missing
**Solution**:
```bash
# Push schema to create tables
npx prisma db push

# Or use migrations
npx prisma migrate dev --name init
```

---

## 📞 NEED MORE HELP?

1. **Check Neon Status**: https://neon.tech/status
2. **Neon Docs**: https://neon.tech/docs/introduction
3. **Prisma Connection Issues**: https://www.prisma.io/docs/orm/reference/error-reference#p1001

---

## ✅ SUCCESS CHECKLIST

- [ ] Neon database is active (not paused)
- [ ] Connection string is correct in `.env`
- [ ] `npx prisma db push` succeeds
- [ ] `npx prisma generate` succeeds
- [ ] `npm run dev` starts without errors
- [ ] Can access http://localhost:3000

---

**Last Updated**: November 1, 2025  
**Status**: Waiting for database connection resolution
