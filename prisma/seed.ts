import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@thepos.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@thepos.com',
      phone: '08000000000',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPassword,
      isVerified: true,
      referralCode: 'ADMIN001',
      role: 'ADMIN',
      credits: 10000,
    },
  })

  // Create test user
  const testPassword = await bcrypt.hash('password123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      phone: '08012345678',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: testPassword,
      isVerified: true,
      referralCode: 'TEST001',
      role: 'USER',
      credits: 1000,
    },
  })

  console.log('Seed data created:')
  console.log('Admin user:', admin)
  console.log('Test user:', testUser)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
