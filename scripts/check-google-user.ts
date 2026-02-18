
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'adaag.ad@gmail.com'
  
  const user = await prisma.user.findUnique({
    where: { email: email }
  })

  console.log('Google User:', user)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
