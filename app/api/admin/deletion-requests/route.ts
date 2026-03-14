import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || undefined
  const skip = (page - 1) * limit

  const where = status ? { status: status as any } : {}

  const [total, requests] = await Promise.all([
    prisma.deletionRequest.count({ where }),
    prisma.deletionRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  })
}
