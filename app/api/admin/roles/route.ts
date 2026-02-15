import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const roles = await prisma.adminRole.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, description, permissions } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existingRole = await prisma.adminRole.findUnique({
      where: { name }
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    const role = await prisma.adminRole.create({
      data: {
        name,
        description,
        permissions: permissions || []
      }
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Failed to create role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
