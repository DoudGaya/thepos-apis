import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force create new instance with current DATABASE_URL from .env
// This ensures we're always using the latest connection string
const createPrismaClient = () => {
  console.log('🔄 Creating new Prisma Client with DATABASE_URL from .env')
  console.log('📍 Database host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown')
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
