
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for Referral Data...')

  try {
    const fixedRules = await prisma.fixedReferralRule.findMany()
    console.log(`\nFound ${fixedRules.length} Fixed Referral Rules:`)
    console.table(fixedRules)

    const passiveGroups = await prisma.passiveReferralGroup.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    })
    console.log(`\nFound ${passiveGroups.length} Passive Referral Groups:`)
    console.log(JSON.stringify(passiveGroups, null, 2))

  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
