
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phone = '08062249834'
  const formattedPhone = '2348062249834'
  
  // Find users with this phone number
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: phone },
        { phone: formattedPhone }
      ]
    }
  })

  // If there are duplicate users with this phone
  console.log('Found', users.length, 'users with this phone.')
  
  for (const user of users) {
     // If the email looks like a phone placeholder AND it's not the google user
     if (user.email.includes(`${formattedPhone}@nillarpay.app`) || user.email.includes(`${phone}@nillarpay.app`)) {
         console.log('Deleting duplicate user:', user.email, user.id)
         
         // Delete dependencies first if cascade delete is not set up?
         // Assuming cascade delete is setup or just user has no deps yet
         try {
             await prisma.user.delete({ where: { id: user.id } })
             console.log('Deleted successfully.')
         } catch (e) {
             console.error('Failed to delete user:', e)
         }
     } else {
         console.log('Keeping user:', user.email, user.id)
     }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
