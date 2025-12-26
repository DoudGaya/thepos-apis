# Production Deployment Guide - NillarPay

## Overview

Complete guide to deploy NillarPay VTU platform to production.

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All tests passing
- [ ] No console.logs in production code
- [ ] Environment variables documented
- [ ] Error handling implemented
- [ ] Security best practices followed
- [ ] API rate limiting configured
- [ ] CORS properly configured

### Database
- [ ] Migrations tested
- [ ] Seed data prepared
- [ ] Backup strategy planned
- [ ] Connection pooling configured

### Third-Party Services
- [ ] VTU.NG account created and funded
- [ ] Paystack live keys obtained
- [ ] Email service configured (optional)
- [ ] SMS service configured (optional)
- [ ] Error monitoring setup (Sentry)

### Security
- [ ] NEXTAUTH_SECRET generated (strong)
- [ ] All secrets in environment variables
- [ ] HTTPS enabled
- [ ] CORS restricted to your domain
- [ ] Rate limiting enabled

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Advantages
✅ Zero-config Next.js deployment
✅ Automatic HTTPS
✅ Global CDN
✅ Integrated Postgres
✅ Preview deployments
✅ Free hobby tier

#### Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Root**
   ```bash
   cd the-backend
   vercel
   ```

4. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set for Production, Preview, and Development

5. **Setup Vercel Postgres** (Optional)
   ```bash
   vercel postgres create
   ```
   - This automatically sets `DATABASE_URL`

6. **Run Migrations**
   ```bash
   # After database is created
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

7. **Deploy to Production**
   ```bash
   vercel --prod
   ```

#### Environment Variables on Vercel

```bash
# In Vercel Dashboard → Settings → Environment Variables

# Database
DATABASE_URL=<vercel-postgres-url>

# NextAuth
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://yourapp.vercel.app

# VTU.NG (LIVE KEYS)
VTU_API_KEY=<live-key>
VTU_PUBLIC_KEY=<live-public-key>
VTU_SECRET_KEY=<live-secret-key>

# Paystack (LIVE KEYS)
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx

# Optional Services
TERMII_API_KEY=<your-key>
SENTRY_DSN=<your-dsn>
```

---

### Option 2: Railway

#### Advantages
✅ Simple deployment
✅ Integrated Postgres
✅ Automatic scaling
✅ $5 free credit monthly
✅ Great for monoliths

#### Steps

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd the-backend
   railway init
   ```

4. **Add PostgreSQL**
   ```bash
   railway add postgresql
   ```
   - `DATABASE_URL` is automatically set

5. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_SECRET="your-secret"
   railway variables set VTU_API_KEY="your-key"
   # ... repeat for all variables
   ```

6. **Deploy**
   ```bash
   railway up
   ```

7. **Run Migrations**
   ```bash
   railway run npx prisma migrate deploy
   ```

8. **Get Domain**
   ```bash
   railway domain
   ```

---

### Option 3: Render

#### Advantages
✅ Free tier available
✅ Simple configuration
✅ Integrated Postgres
✅ Automatic deployments

#### Steps

1. **Create Web Service**
   - Connect GitHub repository
   - Select `the-backend` as root directory

2. **Configure Build**
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

3. **Add PostgreSQL**
   - Create new PostgreSQL database
   - Copy `Internal Database URL`

4. **Set Environment Variables**
   - Add all variables from `.env.example`
   - Use internal database URL for `DATABASE_URL`

5. **Deploy**
   - Render automatically deploys on push to main

---

## Database Deployment

### Option 1: Vercel Postgres

```bash
# Create database
vercel postgres create

# Connect locally
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# View in Prisma Studio
npx prisma studio
```

### Option 2: Railway Postgres

```bash
# Add to project
railway add postgresql

# Run migrations
railway run npx prisma migrate deploy

# Connect locally
railway variables
# Copy DATABASE_URL to .env.local
```

### Option 3: Supabase (Free Tier)

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings → Database
3. Format: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
4. Add to environment variables
5. Run migrations

### Option 4: Neon (Serverless Postgres)

1. Create database at [neon.tech](https://neon.tech)
2. Copy connection string
3. Add to environment variables
4. Run migrations

---

## Production Configuration

### Environment Variables

```bash
# Production .env (on hosting platform)

NODE_ENV=production

# Database
DATABASE_URL=<production-postgres-url>

# NextAuth
NEXTAUTH_SECRET=<strong-random-secret>
NEXTAUTH_URL=https://yourdomain.com

# VTU.NG LIVE KEYS
VTU_API_KEY=<live-api-key>
VTU_PUBLIC_KEY=<live-public-key>
VTU_SECRET_KEY=<live-secret-key>
VTU_API_URL=https://api.vtu.ng/api

# Paystack LIVE KEYS
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Optional: SMS (Termii)
TERMII_API_KEY=<your-api-key>
TERMII_SENDER_ID=<approved-sender-id>

# Optional: Error Monitoring (Sentry)
SENTRY_DSN=<your-sentry-dsn>

# Optional: Analytics
NEXT_PUBLIC_GA_ID=<google-analytics-id>
```

### Generate Strong Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Domain Configuration

### Custom Domain on Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `myapp.com`)
3. Configure DNS:
   ```
   Type: CNAME
   Name: @  or  www
   Value: cname.vercel-dns.com
   ```
4. Wait for propagation (5-30 minutes)
5. Update `NEXTAUTH_URL` to your domain

### Custom Domain on Railway

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: your-app.up.railway.app
   ```
4. Update `NEXTAUTH_URL`

---

## Database Migrations

### Initial Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run all migrations
npx prisma migrate deploy

# Verify
npx prisma studio
```

### Future Migrations

```bash
# Create migration locally
npx prisma migrate dev --name add_new_feature

# Test thoroughly

# Deploy to production
npx prisma migrate deploy
```

---

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Check health
curl https://yourapp.com/api/health

# Test authentication
# Try logging in via the UI

# Test API endpoints
curl https://yourapp.com/api/wallet
```

### 2. Create Admin Account

```bash
# Option 1: Via Prisma Studio
npx prisma studio
# Create user with role: ADMIN

# Option 2: Via seed script
npx prisma db seed
```

### 3. Fund VTU.NG Wallet

1. Login to [vtu.ng](https://vtu.ng)
2. Navigate to Wallet
3. Fund with sufficient amount (₦10,000+ recommended)
4. Verify balance in admin dashboard

### 4. Test Paystack Integration

1. Login to [Paystack Dashboard](https://dashboard.paystack.com)
2. Switch to Live Mode
3. Enable your domain in Settings
4. Test a small transaction

### 5. Monitor Initial Transactions

- Watch admin dashboard: `/admin/stats`
- Check vendor health: `/admin/vendors`
- Monitor error logs (Sentry if configured)
- Test all purchase types

---

## Monitoring & Maintenance

### Error Monitoring with Sentry

1. **Setup Sentry**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure**
   ```javascript
   // sentry.client.config.ts
   import * as Sentry from "@sentry/nextjs"

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     tracesSampleRate: 1.0,
     environment: process.env.NODE_ENV,
   })
   ```

3. **Add to Environment**
   ```bash
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

### Database Backups

#### Vercel Postgres
- Automatic backups (retention based on plan)
- Manual backup via CLI:
  ```bash
  vercel postgres backup create
  ```

#### Railway
- Automatic daily backups
- Manual backup:
  ```bash
  railway run pg_dump $DATABASE_URL > backup.sql
  ```

### Performance Monitoring

- Use Vercel Analytics (built-in)
- Monitor via admin dashboard `/admin/vendors`
- Check transaction success rates
- Monitor API response times

---

## Scaling Considerations

### Database Connection Pooling

```javascript
// lib/prisma.ts (already configured)
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### API Rate Limiting

```typescript
// middleware.ts (create if needed)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, number[]>()

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, [])
  }

  const requests = rateLimit.get(ip)!.filter(time => now - time < windowMs)
  
  if (requests.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  requests.push(now)
  rateLimit.set(ip, requests)

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
npx prisma studio

# Regenerate Prisma Client
npx prisma generate
```

**2. NextAuth Session Issues**
```bash
# Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET

# Verify NEXTAUTH_URL matches your domain
echo $NEXTAUTH_URL

# Clear cookies and try again
```

**3. VTU.NG API Errors**
- Check balance: Login to vtu.ng
- Verify API keys are live keys (not test)
- Check `/api/admin/vendors` for status

**4. Paystack Payment Failures**
- Verify you're using live keys
- Check Paystack dashboard for errors
- Ensure domain is whitelisted in Paystack settings

**5. Build Failures**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## Security Hardening

### CORS Configuration

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Only allow your domain
  response.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}
```

### Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

---

## Launch Checklist

### Pre-Launch
- [ ] All tests passing
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] VTU.NG wallet funded (₦10,000+)
- [ ] Paystack in live mode
- [ ] Domain configured
- [ ] SSL enabled (automatic on Vercel/Railway)
- [ ] Admin account created
- [ ] Error monitoring enabled

### Launch Day
- [ ] Final smoke tests
- [ ] Monitor dashboard every hour
- [ ] Test customer purchase flow
- [ ] Test admin operations
- [ ] Check vendor health
- [ ] Monitor transaction success rate
- [ ] Be ready to respond to issues

### Post-Launch (Week 1)
- [ ] Daily monitoring
- [ ] Customer feedback collection
- [ ] Transaction success rate analysis
- [ ] Performance optimization
- [ ] Bug fixes as needed

---

## Support & Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Prisma Docs:** [prisma.io/docs](https://prisma.io/docs)
- **VTU.NG Support:** support@vtu.ng
- **Paystack Support:** [support.paystack.com](https://support.paystack.com)

---

Generated: 2025-10-16
