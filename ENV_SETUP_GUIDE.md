# Environment Variables Guide - NillarPay

## Quick Start

1. **Copy the example file:**
   ```bash
   cd the-backend
   cp .env.example .env.local
   ```

2. **Fill in required variables** (see sections below)

3. **Generate secrets:**
   ```bash
   # Generate NEXTAUTH_SECRET
   openssl rand -base64 32
   ```

---

## Required Variables

### 🗄️ Database

```bash
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

**How to get:**
- **Local Development:** Install PostgreSQL locally
- **Hosted:** Use services like:
  - Vercel Postgres (free tier)
  - Railway (free $5/month credit)
  - Supabase (free tier)
  - Neon (free tier)

**Example values:**
```bash
# Local
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/NillarPay?schema=public"

# Railway
DATABASE_URL="postgresql://postgres:password123@containers-us-west-xyz.railway.app:5432/railway"

# Vercel Postgres
DATABASE_URL="postgres://default:abc123@ep-cool-name.us-east-1.postgres.vercel-storage.com/verceldb"
```

---

### 🔐 NextAuth

```bash
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**How to generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**NEXTAUTH_URL values:**
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

---

### 📱 VTU.NG API

```bash
VTU_API_KEY="your-api-key"
VTU_PUBLIC_KEY="your-public-key"
VTU_SECRET_KEY="your-secret-key"
VTU_API_URL="https://api.vtu.ng/api"
```

**How to get:**
1. Visit [https://vtu.ng](https://vtu.ng)
2. Create an account
3. Navigate to **Settings → API Keys**
4. Copy all three keys
5. Fund your VTU.NG wallet to start making purchases

**Testing:**
- VTU.NG provides test mode
- Fund with small amount for development

---

### 💳 Paystack

```bash
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
```

**How to get:**
1. Visit [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Create an account (Nigerian bank required)
3. Navigate to **Settings → API Keys & Webhooks**
4. Copy **Test Keys** for development
5. Use **Live Keys** for production (after going live)

**Modes:**
- **Test Mode:** `pk_test_*` and `sk_test_*` (for development)
- **Live Mode:** `pk_live_*` and `sk_live_*` (for production)

---

### 📧 SMS Service - Termii

```bash
TERMII_API_KEY="your-api-key"
TERMII_SENDER_ID="YourApp"
```

**How to get:**
1. Visit [https://termii.com](https://termii.com)
2. Create an account
3. Navigate to **API Settings**
4. Copy API Key
5. Register a Sender ID (can take 24-48 hours for approval)

**Sender ID:**
- Max 11 characters
- Alphanumeric only
- Must be approved by Termii

**Alternative SMS Services:**
- **Twilio:** Global coverage
- **Africa's Talking:** Africa-focused

---

## Optional Variables

### 📧 Email Services

Choose **ONE** option based on your preference:

#### Option 1: SendGrid (Recommended)
```bash
SENDGRID_API_KEY="SG.xxxxx"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
SENDGRID_FROM_NAME="NillarPay"
```

#### Option 2: SMTP (Generic)
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_FROM_NAME="NillarPay"
```

---

### 📊 Monitoring & Error Tracking

#### Sentry (Error Tracking)
```bash
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

How to get:
1. Sign up at [sentry.io](https://sentry.io)
2. Create a project
3. Copy the DSN

---

## Environment Setup by Stage

### Development
```bash
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
# Use test API keys
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"
VTU_API_KEY="test_xxxxx"
```

### Staging
```bash
NODE_ENV="staging"
NEXTAUTH_URL="https://staging.yourdomain.com"
# Use test API keys
```

### Production
```bash
NODE_ENV="production"
NEXTAUTH_URL="https://yourdomain.com"
# Use live API keys
PAYSTACK_PUBLIC_KEY="pk_live_xxxxx"
VTU_API_KEY="live_xxxxx"
```

---

## Deployment Platforms

### Vercel

1. **Add environment variables in dashboard:**
   - Go to Project Settings → Environment Variables
   - Add each variable
   - Set environment (Production, Preview, Development)

2. **Automatic DATABASE_URL:**
   - Link a Vercel Postgres database
   - `DATABASE_URL` is automatically added

### Railway

1. **Add variables in dashboard:**
   - Go to your project → Variables
   - Add each variable
   
2. **Automatic DATABASE_URL:**
   - Add PostgreSQL plugin
   - `DATABASE_URL` is automatically provided

### Render

1. **Add environment variables:**
   - Go to Environment → Environment Variables
   - Add each key-value pair

---

## Security Best Practices

### ✅ Do:
- Use strong, random secrets (32+ characters)
- Use different secrets for each environment
- Use test API keys in development
- Rotate secrets regularly
- Store secrets in environment variables on hosting platform
- Use `.env.local` for local development (gitignored)

### ❌ Don't:
- Commit `.env` or `.env.local` to git
- Share secrets in chat/email
- Use production keys in development
- Hardcode secrets in code
- Use weak or short secrets
- Reuse secrets across projects

---

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run prisma:studio

# Check if DATABASE_URL is set
echo $DATABASE_URL

# Regenerate Prisma client
npx prisma generate
```

### NextAuth Issues
```bash
# Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET

# Verify NEXTAUTH_URL matches your domain
echo $NEXTAUTH_URL
```

### VTU.NG Issues
```bash
# Test in admin dashboard: /api/admin/vendors
# Check your balance
# Verify API keys are correct
```

### Paystack Issues
```bash
# Verify you're using the right mode (test/live)
# Check key starts with pk_test_ or pk_live_
# Test in admin dashboard: /api/admin/vendors
```

---

## Getting Help

1. **VTU.NG Support:** support@vtu.ng
2. **Paystack Support:** [https://support.paystack.com](https://support.paystack.com)
3. **Termii Support:** support@termii.com
4. **Application Issues:** Check the admin vendors page: `/admin/vendors`

---

## Checklist

Before going live, ensure:

- [ ] All required variables are set
- [ ] Using LIVE API keys (not test)
- [ ] NEXTAUTH_SECRET is strong and random
- [ ] DATABASE_URL points to production database
- [ ] NEXTAUTH_URL matches production domain
- [ ] VTU.NG wallet is funded
- [ ] Paystack is in live mode
- [ ] Termii sender ID is approved
- [ ] Tested all payment flows
- [ ] Tested all VTU purchases
- [ ] Monitored vendor health at `/api/admin/vendors`

---

Generated: 2025-10-16
