import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { targetService } from '@/lib/services/TargetService';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const targets = await targetService.getAllTargets();
        return NextResponse.json({ success: true, targets });
    } catch (error) {
        console.error('Error fetching admin targets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();

        // Basic validation
        if (!data.title || !data.type || !data.targetValue || !data.rewardAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const target = await targetService.createTarget({
            ...data,
            createdBy: session.user.id
        });

        return NextResponse.json({ success: true, target });
    } catch (error) {
        console.error('Error creating target:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
