
import { PrismaClient } from '@prisma/client';
import { walletService } from '../lib/services/WalletService';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching users...');
    const users = await prisma.user.findMany({ take: 2 });

    if (users.length < 2) {
        console.log('Not enough users to test request');
        return;
    }

    const requester = users[0];
    const payer = users[1];

    console.log(`Requester: ${requester.email} (${requester.id})`);
    console.log(`Payer: ${payer.email} (${payer.id})`);

    console.log('Creating request...');
    try {
        const request = await walletService.requestMoney(
            requester.id,
            payer.id,
            100,
            'Debug Request'
        );
        console.log('Request created successfully:', request);

        const check = await prisma.moneyRequest.findUnique({
            where: { id: request.id }
        });
        console.log('Verification check:', check);
    } catch (e) {
        console.error('Error creating request:', e);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
