import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { targetService } from '@/lib/services/TargetService';
import { Role } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const data = await req.json();

        const updated = await targetService.updateTarget(id, data);
        return NextResponse.json({ success: true, target: updated });
    } catch (error) {
        console.error('Error updating target:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        // Soft delete by setting isActive to false, or actual delete?
        // For now, let's just toggle active status via PUT, but if DELETE is called, maybe hard delete?
        // Let's implement soft delete / archive.
        const updated = await targetService.updateTarget(id, { isActive: false });
        return NextResponse.json({ success: true, target: updated });
    } catch (error) {
        console.error('Error deleting target:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
