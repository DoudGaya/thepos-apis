const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { randomBytes } = require('crypto')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash('admin1234', 12)

    // Generate a unique referral code
    const referralCode = `ADMIN${randomBytes(4).toString('hex').toUpperCase()}`

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'Doud',
        lastName: 'Gaya',
        email: 'md@stablebricks.com',
        phone: '+2341234567890', // Required field, using a placeholder
        passwordHash,
        referralCode,
        role: 'ADMIN',
        isVerified: true, // Admin should be verified by default
        credits: 10000, // Give admin some credits for testing
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('User Details:')
    console.log(`- Name: ${adminUser.firstName} ${adminUser.lastName}`)
    console.log(`- Email: ${adminUser.email}`)
    console.log(`- Role: ${adminUser.role}`)
    console.log(`- Referral Code: ${adminUser.referralCode}`)
    console.log(`- Credits: ₦${adminUser.credits}`)
    console.log(`- Created At: ${adminUser.createdAt}`)
    console.log('\n🔐 Login Credentials:')
    console.log('- Email: md@stablebricks.com')
    console.log('- Password: admin1234')
    console.log('\n⚠️  IMPORTANT: Change the password after first login!')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)

    // Check if it's a unique constraint error
    if (error.code === 'P2002') {
      console.log('\n💡 This email or phone number might already exist.')
      console.log('Try updating an existing user to admin role instead.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createAdminUser()