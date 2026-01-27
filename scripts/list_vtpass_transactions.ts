
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTransactions() {
    console.log('--- Listing VTPass Transactions ---');
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                vendorName: 'VTPASS'
            },
            select: {
                id: true,
                reference: true,
                vendorReference: true,
                type: true,
                status: true,
                createdAt: true,
                amount: true,
                recipient: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (transactions.length === 0) {
            console.log('No VTPass transactions found in the database.');
        } else {
            console.table(transactions);
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listTransactions();
