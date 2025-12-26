
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function testSearch(identifier, authUserId) {
  console.log(`Testing search for: "${identifier}" (excluding ${authUserId})`);
  
  let phoneSearchConditions = [
    { phone: { contains: identifier } },
    { phone: { equals: identifier } }
  ];

  const digitsOnly = identifier.replace(/\D/g, '');
  
  if (digitsOnly.length >= 10) {
    const last10 = digitsOnly.slice(-10);
    phoneSearchConditions.push({ phone: { contains: last10 } });
    
    if (identifier.startsWith('0')) {
      const with234 = '234' + identifier.substring(1);
      phoneSearchConditions.push({ phone: { equals: with234 } });
    }
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        ...phoneSearchConditions
      ]
    },
    select: {
      id: true,
      email: true,
      phone: true
    }
  });

  if (user) {
    if (user.id === authUserId) {
      console.log(`⚠️ Found self: ${user.email} (Cannot transfer to self)`);
    } else {
      console.log(`✅ Found: ${user.email} (${user.phone})`);
    }
  } else {
    console.log(`❌ Not found`);
  }
}

async function main() {
  try {
    // Admin user ID from previous list-users.js output
    // 'cmip4z2mi0000myiswesc1bf3' | 'md@stablebricks.com' | '2348146210087'
    // 'cmingcpae0000myisqb1mdh5b' | 'adaag.ad@gmail.com'  | '2348062249834'

    const authUserId = 'cmingcpae0000myisqb1mdh5b'; // Authenticated as Abdulrahman

    // Test cases
    await testSearch('md@stablebricks.com', authUserId); // Should find Admin
    await testSearch('2348146210087', authUserId);       // Should find Admin (exact)
    await testSearch('08146210087', authUserId);         // Should find Admin (normalized)
    await testSearch('8146210087', authUserId);          // Should find Admin (partial)
    
    // Test self-search (should fail)
    await testSearch('adaag.ad@gmail.com', authUserId); 

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
