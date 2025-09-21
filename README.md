# The POS - Backend API & Admin Dashboard

A Next.js 15 backend with TypeScript, Prisma, and PostgreSQL for a data and utility bills payment platform.

## Features

- 🔐 **JWT Authentication**: Secure user login with OTP verification
- 💾 **Database**: Prisma ORM with PostgreSQL
- 🎛️ **Admin Dashboard**: Web interface for managing users, transactions, subscriptions
- 📱 **Mobile API**: RESTful endpoints for React Native app
- 💳 **Payment Integration**: Paystack for payments, Pairgate for bill fulfillment
- 📊 **Analytics**: Transaction reporting and user metrics
- 🔄 **Auto-Renewals**: Cron jobs for subscription management
- 👥 **Referral System**: Track and reward user referrals

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcryptjs
- **Styling**: TailwindCSS
- **Payment**: Paystack integration
- **Bills**: Pairgate API integration
- **SMS**: Termii API for OTP
- **Cron**: node-cron for scheduled tasks

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or SQLite for development)
- Yarn or npm

### Installation

1. **Navigate to backend directory**:
   ```bash
   cd the-backend
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Environment setup**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual values:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@
192.168.0.2:5432/thepos?schema=public"
   
   # JWT Secret (generate a random string)
   JWT_SECRET="your-super-secret-jwt-key-here"
   
   # Pairgate API
   PAIRGATE_API_KEY="your-pairgate-api-key"
   PAIRGATE_BASE_URL="https://api.pairgate.com/v1"
   
   # Paystack
   PAYSTACK_SECRET_KEY="sk_test_your-paystack-secret-key"
   PAYSTACK_PUBLIC_KEY="pk_test_your-paystack-public-key"
   
   # Termii SMS
   TERMII_API_KEY="your-termii-api-key"
   
   # Admin credentials
   ADMIN_EMAIL="admin@yourapp.com"
   ADMIN_PASSWORD="secure-admin-password"
   ```

4. **Database setup**:
   ```bash
   # Generate Prisma client
   yarn db:generate
   
   # Push schema to database
   yarn db:push
   
   # Seed with initial data
   yarn db:seed
   ```

5. **Start development server**:
   ```bash
   yarn dev
   ```

The server will start at `http://
192.168.0.2:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/send-otp` - Send OTP code

### Data Services
- `GET /api/data/networks` - Available networks
- `GET /api/data/plans/:network` - Data plans for network
- `POST /api/data/purchase` - Purchase data bundle

### Bill Payment
- `GET /api/bills/types` - Available bill types
- `POST /api/bills/validate-meter` - Validate meter number
- `POST /api/bills/pay` - Pay utility bill

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/transactions` - Transaction history
- `GET /api/user/referrals` - Referral history

### Subscriptions
- `GET /api/subscriptions` - User subscriptions
- `POST /api/subscriptions` - Create subscription
- `DELETE /api/subscriptions/:id` - Cancel subscription

## Admin Dashboard

Access the admin dashboard at `http://
192.168.0.2:3000/admin`

**Default admin credentials** (from seed):
- Email: `admin@thepos.com`
- Password: `admin123`

### Admin Features

- **Dashboard**: Overview with key metrics
- **User Management**: View and manage all users
- **Transaction Monitoring**: Real-time transaction tracking
- **Subscription Management**: Monitor auto-renewals
- **Referral Analytics**: Track referral performance
- **System Settings**: Configure platform settings

## Database Schema

### Core Models

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  phone        String   @unique
  firstName    String
  lastName     String
  passwordHash String
  isVerified   Boolean  @default(false)
  referralCode String   @unique
  referredBy   String?
  credits      Float    @default(0)
  role         Role     @default(USER)
  // ... relations
}

model Transaction {
  id        String            @id @default(cuid())
  userId    String
  type      TransactionType
  amount    Float
  status    TransactionStatus @default(PENDING)
  reference String            @unique
  details   Json
  // ... relations
}

model Subscription {
  id          String             @id @default(cuid())
  userId      String
  type        SubscriptionType
  amount      Float
  frequency   SubscriptionFreq   @default(MONTHLY)
  status      SubscriptionStatus @default(ACTIVE)
  nextRenewal DateTime
  // ... relations
}
```

## Integrations

### Pairgate API

Handles data purchases and bill payments:

```typescript
// Data purchase
const response = await pairgateApi.post('/data/purchase', {
  network: 'MTN',
  planId: 'mtn_1gb',
  phone: '2348012345678',
  amount: 350,
});

// Bill payment  
const response = await pairgateApi.post('/bills/pay', {
  billType: 'electricity',
  provider: 'EKEDC',
  customerInfo: { meterNumber: '123456789' },
  amount: 5000,
});
```

### Paystack Integration

Processes user payments:

```typescript
// Initialize payment
const response = await paystackApi.post('/transaction/initialize', {
  email: user.email,
  amount: amount * 100, // Convert to kobo
  reference: generateReference(),
});
```

### Termii SMS

Sends OTP codes:

```typescript
// Send OTP
const response = await termiiApi.post('/api/sms', {
  to: phone,
  from: 'YourApp',
  sms: `Your OTP code is: ${otpCode}`,
  type: 'plain',
  api_key: TERMII_API_KEY,
});
```

## Auto-Renewal System

Cron jobs handle subscription renewals:

```typescript
// runs every day at 6 AM
cron.schedule('0 6 * * *', async () => {
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      nextRenewal: { lte: new Date() },
    },
    include: { user: true },
  });

  for (const subscription of dueSubscriptions) {
    await processSubscriptionRenewal(subscription);
  }
});
```

## Referral System

### How it works:

1. **User Registration**: New users get a unique referral code
2. **Referral Signup**: Friends sign up using the code
3. **Reward Distribution**: Both parties get ₦100 credits
4. **Tracking**: All referrals tracked in database

```typescript
// Create referral reward
await prisma.$transaction(async (tx) => {
  // Create referral record
  await tx.referral.create({
    data: { referrerId, referredId: newUser.id, reward: 100 },
  });
  
  // Add credits to both users
  await tx.user.update({
    where: { id: referrerId },
    data: { credits: { increment: 100 } },
  });
  
  await tx.user.update({
    where: { id: newUser.id },
    data: { credits: { increment: 100 } },
  });
});
```

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Zod schemas for all inputs
- **Rate Limiting**: Built-in Next.js rate limiting
- **CORS Configuration**: Restricted to mobile app
- **Environment Variables**: Sensitive data in env files

## Development

### Database Operations

```bash
# Reset database (development only)
yarn db:reset

# Create new migration
yarn db:migrate

# View database in browser
yarn db:studio

# Seed with sample data
yarn db:seed
```

### Code Structure

```
app/
├── api/                 # API route handlers
│   ├── auth/           # Authentication endpoints
│   ├── data/           # Data service endpoints
│   ├── bills/          # Bill payment endpoints
│   └── user/           # User management endpoints
├── admin/              # Admin dashboard pages
│   ├── users/          # User management
│   ├── transactions/   # Transaction monitoring
│   └── settings/       # System configuration
└── globals.css         # Global styles

lib/
├── prisma.ts           # Database client
├── auth.ts             # Authentication utilities
├── pairgate.ts         # Pairgate API integration
└── paystack.ts         # Paystack integration

prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Sample data
```

## Testing

### Test Data

The seed script creates:
- Admin user: `admin@thepos.com` / `admin123`
- Test user: `test@example.com` / `password123`

### API Testing

Use tools like Postman or curl:

```bash
# Login test user
curl -X POST http://
192.168.0.2:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"08012345678","password":"password123"}'

# Get data networks
curl -X GET http://
192.168.0.2:3000/api/data/networks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Deployment

### Vercel Deployment

1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Configure build settings**:
   ```bash
   # Build Command
   npm run build
   
   # Install Command  
   npm install && npx prisma generate
   ```

### Database Setup

For production, use a managed PostgreSQL service:
- **Vercel Postgres** (recommended)
- **Railway**
- **PlanetScale**
- **Supabase**

Update `DATABASE_URL` with production connection string.

### Environment Variables

Set these in your deployment platform:

```env
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_jwt_secret
PAIRGATE_API_KEY=your_production_pairgate_key
PAYSTACK_SECRET_KEY=your_production_paystack_key
TERMII_API_KEY=your_production_termii_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Monitoring

### Logging

The application logs important events:
- User authentication attempts
- Transaction processing
- API errors
- Cron job execution

### Error Handling

Comprehensive error handling with:
- Try-catch blocks for all async operations
- Proper HTTP status codes
- Detailed error messages for debugging
- User-friendly error responses

## Performance

### Database Optimization

- Proper indexing on frequently queried fields
- Connection pooling via Prisma
- Query optimization with `include` and `select`

### API Optimization

- Response caching where appropriate
- Efficient pagination for large datasets
- Background processing for heavy operations

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check `DATABASE_URL`
2. **API integration failures**: Verify third-party API keys
3. **Authentication issues**: Ensure `JWT_SECRET` is set
4. **Migration errors**: Run `yarn db:reset` in development

### Debugging

Enable detailed logging:
```env
# Add to .env.local
PRISMA_QUERY_LOG=true
NODE_ENV=development
```

## Contributing

1. Follow TypeScript strict mode
2. Use Prisma for all database operations
3. Implement proper error handling
4. Write comprehensive API documentation
5. Test all endpoints before committing

---

**Note**: This backend is designed for high performance and low operational costs. All integrations are optimized for Nigerian market requirements and payment preferences.
# thepos-apis
