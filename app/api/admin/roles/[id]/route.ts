import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = params;
    const { name, description, permissions } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existingRole = await prisma.adminRole.findUnique({
      where: { name }
    });

    if (existingRole && existingRole.id !== id) {
      return NextResponse.json({ error: 'Another role with this name already exists' }, { status: 400 });
    }

    const role = await prisma.adminRole.update({
      where: { id },
      data: {
        name,
        description,
        permissions: permissions || []
      }
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Failed to update role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = params;

    // Check if role is assigned to any user
    const usersCount = await prisma.user.count({
      where: { adminRoleId: id }
    });

    if (usersCount > 0) {
      return NextResponse.json({ error: 'Cannot delete role assigned to users' }, { status: 400 });
    }

    await prisma.adminRole.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete role:', error);
    // Might fail if role not found
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
