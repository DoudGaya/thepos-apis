import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { targetService } from '@/lib/services/TargetService';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;
        const { target, stats } = await targetService.getAdminTargetStats(id);
        const progress = await targetService.getTargetProgress(id);

        return NextResponse.json({
            success: true,
            data: {
                target,
                stats,
                participants: progress
            }
        });
    } catch (error) {
        console.error('Error fetching target stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
