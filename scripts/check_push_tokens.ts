import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            pushToken: true,
            createdAt: true
        } as any
    })

    console.log(`Total users in DB: ${users.length}\n`)

    if (users.length === 0) {
        console.log('No users found in database.')
        return
    }

    console.log('User List:')
    console.log('----------------------------------------------------')
    users.forEach(user => {
        console.log(`ID: ${user.id}`)
        console.log(`Email: ${user.email}`)
        console.log(`Token: ${user.pushToken || 'MISSING'}`)
        console.log(`Created: ${user.createdAt}`)
        console.log('----------------------------------------------------')
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
