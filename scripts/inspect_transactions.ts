import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const transactions = await prisma.transaction.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            type: true,
            network: true,
            amount: true,
            status: true,
            details: true,
            vendorName: true,
            createdAt: true
        }
    })

    console.log(`Inspecting ${transactions.length} transactions:\n`)

    transactions.forEach((tx, i) => {
        console.log(`[${i + 1}] ID: ${tx.id}`)
        console.log(`    Type: ${tx.type}`)
        console.log(`    Network: ${tx.network || 'NULL'}`)
        console.log(`    Vendor: ${tx.vendorName || 'N/A'}`)
        console.log(`    Details: ${JSON.stringify(tx.details)}`)
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
