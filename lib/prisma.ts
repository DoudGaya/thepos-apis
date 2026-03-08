import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma Client with optimized connection pool settings for Neon serverless
const createPrismaClient = () => {
  console.log('🔄 Creating new Prisma Client with DATABASE_URL from .env')
  console.log('📍 Database host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown')

  // For Neon serverless: limit the per-process pool size and set a generous pool_timeout.
  // Append only if the URL doesn't already include these params.
  const rawUrl = process.env.DATABASE_URL || ''
  const dbUrl = rawUrl.includes('connection_limit')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=20'

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient()
}

export const prisma = globalForPrisma.prisma

// Handle cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
