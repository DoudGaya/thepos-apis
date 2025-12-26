import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@NillarPay.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@NillarPay.com',
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

  // Seed default profit margins
  console.log('\n🌱 Seeding profit margins...')
  
  const profitMargins = [
    {
      service: 'DATA',
      marginType: 'FIXED',
      marginValue: 100.00,
      isActive: true,
    },
    {
      service: 'AIRTIME',
      marginType: 'PERCENTAGE',
      marginValue: 5.00,
      isActive: true,
    },
    {
      service: 'ELECTRICITY',
      marginType: 'FIXED',
      marginValue: 50.00,
      isActive: true,
    },
    {
      service: 'CABLE',
      marginType: 'FIXED',
      marginValue: 50.00,
      isActive: true,
    },
    {
      service: 'BETTING',
      marginType: 'PERCENTAGE',
      marginValue: 2.00,
      isActive: true,
    },
    {
      service: 'EPINS',
      marginType: 'PERCENTAGE',
      marginValue: 5.00,
      isActive: true,
    },
  ]

  for (const margin of profitMargins) {
    // Check if margin already exists
    const existing = await prisma.profitMargin.findFirst({
      where: {
        service: margin.service,
        vendorName: null,
        network: null,
      },
    })

    if (existing) {
      // Update existing margin
      await prisma.profitMargin.update({
        where: { id: existing.id },
        data: margin,
      })
      console.log(`✅ Updated profit margin for ${margin.service}`)
    } else {
      // Create new margin
      await prisma.profitMargin.create({
        data: {
          ...margin,
          vendorName: null,
          network: null,
        },
      })
      console.log(`✅ Created profit margin for ${margin.service}`)
    }
  }

  console.log('✨ Seeding complete!')
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
