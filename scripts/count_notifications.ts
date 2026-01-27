
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.notification.count();
    const latest = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { title: true, type: true, createdAt: true }
    });
    console.log(`Total Notifications: ${count}`);
    console.log('Latest 5:', JSON.stringify(latest, null, 2));
    await prisma.$disconnect();
}
main();
