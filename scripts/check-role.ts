
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const roles = await prisma.adminRole.findMany()
  console.log('Roles:', roles)
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    include: { adminRole: true }
  })
  console.log('Admin:', admin?.email, 'Role:', admin?.adminRole?.name)
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
