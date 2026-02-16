
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phone = '08062249834'
  const formattedPhone = '2348062249834'
  
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: phone },
        { phone: formattedPhone }
      ]
    }
  })

  console.log('User found:', user)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
