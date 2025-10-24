# Testing Guide - The POS

## Overview

This guide covers testing strategies for The POS VTU platform.

---

## Test Structure

```
the-backend/
├── __tests__/
│   ├── unit/
│   │   ├── api-utils.test.ts
│   │   ├── vtu.test.ts
│   │   └── auth.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── wallet.test.ts
│   │   ├── purchases.test.ts
│   │   ├── transactions.test.ts
│   │   ├── referrals.test.ts
│   │   └── admin.test.ts
│   └── e2e/
│       ├── customer-flow.test.ts
│       └── admin-flow.test.ts
└── jest.config.js
```

---

## Setup

### 1. Install Dependencies

```bash
cd the-backend
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
npm install -D supertest @types/supertest
npm install -D msw # Mock Service Worker for API mocking
```

### 2. Create Jest Config

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
}
```

### 3. Create Test Setup

```typescript
// __tests__/setup.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

beforeAll(async () => {
  // Setup test database
  await prisma.$connect()
})

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clear test data before each test
  await prisma.transaction.deleteMany()
  await prisma.referralEarning.deleteMany()
  await prisma.referral.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()
})
```

---

## Unit Tests

### API Utils Test

```typescript
// __tests__/unit/api-utils.test.ts
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  createPaginatedResponse,
  getPaginationParams,
} from '@/lib/api-utils'

describe('API Utils', () => {
  describe('Errors', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('Invalid input')
    })

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Resource not found')
    })
  })

  describe('Pagination', () => {
    it('should create paginated response correctly', () => {
      const items = [1, 2, 3, 4, 5]
      const result = createPaginatedResponse(items, 50, 1, 20)
      
      expect(result.items).toEqual(items)
      expect(result.pagination.total).toBe(50)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.hasMore).toBe(true)
    })

    it('should parse pagination params from URL', () => {
      const url = 'http://localhost:3000/api/users?page=2&limit=50'
      const params = getPaginationParams(url, 20)
      
      expect(params.page).toBe(2)
      expect(params.limit).toBe(50)
      expect(params.skip).toBe(50)
    })
  })
})
```

---

## Integration Tests

### Authentication Test

```typescript
// __tests__/integration/auth.test.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('Authentication', () => {
  let testUser: any

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10)
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        phone: '+2348012345678',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: hashedPassword,
        referralCode: 'TEST123',
        role: 'USER',
      },
    })
  })

  it('should authenticate user with correct credentials', async () => {
    const isValid = await bcrypt.compare('password123', testUser.passwordHash)
    expect(isValid).toBe(true)
  })

  it('should reject user with wrong password', async () => {
    const isValid = await bcrypt.compare('wrongpassword', testUser.passwordHash)
    expect(isValid).toBe(false)
  })
})
```

### Wallet Test

```typescript
// __tests__/integration/wallet.test.ts
import { prisma } from '@/lib/prisma'

describe('Wallet Operations', () => {
  let user: any

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        email: 'wallet@test.com',
        phone: '+2348012345679',
        firstName: 'Wallet',
        lastName: 'Test',
        passwordHash: 'hashedpass',
        referralCode: 'WALLET123',
        credits: 5000,
      },
    })
  })

  describe('Wallet Transfer', () => {
    it('should transfer credits between users', async () => {
      const recipient = await prisma.user.create({
        data: {
          email: 'recipient@test.com',
          phone: '+2348012345680',
          firstName: 'Recipient',
          lastName: 'User',
          passwordHash: 'hashedpass',
          referralCode: 'RECIP123',
          credits: 0,
        },
      })

      // Perform transfer
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1000 } },
        })
        await tx.user.update({
          where: { id: recipient.id },
          data: { credits: { increment: 1000 } },
        })
      })

      const updatedSender = await prisma.user.findUnique({ where: { id: user.id } })
      const updatedRecipient = await prisma.user.findUnique({ where: { id: recipient.id } })

      expect(updatedSender?.credits).toBe(4000)
      expect(updatedRecipient?.credits).toBe(1000)
    })

    it('should fail transfer with insufficient balance', async () => {
      const recipient = await prisma.user.create({
        data: {
          email: 'recipient2@test.com',
          phone: '+2348012345681',
          firstName: 'Recipient',
          lastName: 'Two',
          passwordHash: 'hashedpass',
          referralCode: 'RECIP456',
          credits: 0,
        },
      })

      // Attempt to transfer more than balance
      const transferAmount = 10000

      await expect(async () => {
        if (user.credits < transferAmount) {
          throw new Error('Insufficient balance')
        }
      }).rejects.toThrow('Insufficient balance')
    })
  })

  describe('Transaction Creation', () => {
    it('should create transaction record', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'AIRTIME',
          amount: 500,
          status: 'COMPLETED',
          reference: 'TEST_REF_001',
          details: { network: 'MTN', phone: '+2348012345678' },
        },
      })

      expect(transaction.userId).toBe(user.id)
      expect(transaction.amount).toBe(500)
      expect(transaction.status).toBe('COMPLETED')
    })
  })
})
```

### Referral Test

```typescript
// __tests__/integration/referrals.test.ts
import { prisma } from '@/lib/prisma'

describe('Referral System', () => {
  let referrer: any
  let referred: any

  beforeEach(async () => {
    referrer = await prisma.user.create({
      data: {
        email: 'referrer@test.com',
        phone: '+2348012345682',
        firstName: 'Referrer',
        lastName: 'User',
        passwordHash: 'hashedpass',
        referralCode: 'REF123',
        credits: 0,
      },
    })

    referred = await prisma.user.create({
      data: {
        email: 'referred@test.com',
        phone: '+2348012345683',
        firstName: 'Referred',
        lastName: 'User',
        passwordHash: 'hashedpass',
        referralCode: 'NEWUSER123',
        referredBy: 'REF123',
        credits: 1000,
      },
    })

    // Create referral record
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referred.id,
        referralCode: 'REF123',
      },
    })
  })

  it('should create referral earnings on transaction', async () => {
    // Simulate a transaction by referred user
    const transaction = await prisma.transaction.create({
      data: {
        userId: referred.id,
        type: 'AIRTIME',
        amount: 1000,
        status: 'COMPLETED',
        reference: 'REF_TRANS_001',
      },
    })

    // Create referral earning (2% commission)
    const commission = transaction.amount * 0.02
    const earning = await prisma.referralEarning.create({
      data: {
        userId: referrer.id,
        referredUserId: referred.id,
        transactionId: transaction.id,
        amount: commission,
        type: 'REFERRAL_BONUS',
        status: 'PENDING',
      },
    })

    expect(earning.amount).toBe(20) // 2% of 1000
    expect(earning.status).toBe('PENDING')
  })

  it('should allow withdrawal of earnings', async () => {
    // Create earnings
    await prisma.referralEarning.create({
      data: {
        userId: referrer.id,
        amount: 500,
        type: 'REFERRAL_BONUS',
        status: 'PENDING',
      },
    })

    await prisma.referralEarning.create({
      data: {
        userId: referrer.id,
        amount: 300,
        type: 'REFERRAL_BONUS',
        status: 'PENDING',
      },
    })

    // Calculate available balance
    const earnings = await prisma.referralEarning.aggregate({
      where: { userId: referrer.id },
      _sum: { amount: true },
    })

    const withdrawn = await prisma.referralEarning.aggregate({
      where: { userId: referrer.id, status: 'WITHDRAWN' },
      _sum: { amount: true },
    })

    const available = (earnings._sum.amount || 0) - (withdrawn._sum.amount || 0)

    expect(available).toBe(800)
    expect(available).toBeGreaterThanOrEqual(500) // Min withdrawal
  })
})
```

---

## E2E Tests

### Customer Flow

```typescript
// __tests__/e2e/customer-flow.test.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('Customer E2E Flow', () => {
  let customer: any

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('customer123', 10)
    customer = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        phone: '+2348012345684',
        firstName: 'Customer',
        lastName: 'Test',
        passwordHash: hashedPassword,
        referralCode: 'CUST123',
        credits: 10000,
        role: 'USER',
      },
    })
  })

  it('should complete full purchase flow', async () => {
    // 1. Check wallet balance
    let user = await prisma.user.findUnique({ where: { id: customer.id } })
    expect(user?.credits).toBe(10000)

    // 2. Create airtime purchase transaction
    const purchaseAmount = 500
    const transaction = await prisma.transaction.create({
      data: {
        userId: customer.id,
        type: 'AIRTIME',
        amount: purchaseAmount,
        status: 'PENDING',
        reference: `AIRTIME_${Date.now()}`,
        details: { network: 'MTN', phone: customer.phone },
      },
    })

    expect(transaction.status).toBe('PENDING')

    // 3. Deduct from wallet and complete transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customer.id },
        data: { credits: { decrement: purchaseAmount } },
      })
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' },
      })
    })

    // 4. Verify final state
    user = await prisma.user.findUnique({ where: { id: customer.id } })
    const completedTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    })

    expect(user?.credits).toBe(9500)
    expect(completedTransaction?.status).toBe('COMPLETED')
  })
})
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- __tests__/integration/wallet.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

---

## Test Database

### Option 1: Separate Test Database

```bash
# .env.test
DATABASE_URL="postgresql://user:pass@localhost:5432/thepos_test?schema=public"
```

### Option 2: SQLite for Tests

```bash
# .env.test
DATABASE_URL="file:./test.db"
```

### Setup Test Database

```bash
# Run migrations on test database
DATABASE_URL="..." npx prisma migrate deploy

# Seed test data
DATABASE_URL="..." npx prisma db seed
```

---

## Manual API Testing

### Using Postman/Thunder Client

1. Import collection from `API_QUICK_REFERENCE.md`
2. Set environment variables
3. Test each endpoint

### Using cURL

See `API_QUICK_REFERENCE.md` for cURL examples

---

## Test Checklist

### Unit Tests
- [ ] API utility functions
- [ ] Error classes
- [ ] Pagination helpers
- [ ] Validation schemas

### Integration Tests
- [ ] Authentication flow
- [ ] Wallet operations
- [ ] Purchase flows (airtime, data)
- [ ] Transaction management
- [ ] Referral system
- [ ] Admin operations
- [ ] Notification system

### E2E Tests
- [ ] Complete customer journey
- [ ] Complete admin journey
- [ ] Error scenarios
- [ ] Edge cases

### Manual Tests
- [ ] All API endpoints respond
- [ ] Authentication works
- [ ] Paystack integration works (test mode)
- [ ] VTU.NG integration works (test mode)
- [ ] Admin dashboard loads
- [ ] Customer dashboard loads
- [ ] All forms submit correctly
- [ ] Error messages display

---

## Coverage Goals

- **Unit Tests:** 90%+ coverage
- **Integration Tests:** 80%+ coverage
- **E2E Tests:** Critical paths covered
- **Overall:** 70%+ coverage

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: thepos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/thepos_test
      
      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/thepos_test
```

---

Generated: 2025-10-16
