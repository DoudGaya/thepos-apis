import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const allPricing = await prisma.pricing.findMany({
      select: {
        service: true,
        network: true,
        isActive: true,
      },
    });

    const statusMap: Record<string, Record<string, boolean>> = {};

    allPricing.forEach((p) => {
      if (!statusMap[p.service]) {
        statusMap[p.service] = {};
      }
      statusMap[p.service][p.network] = p.isActive;
    });

    return NextResponse.json(statusMap);
  } catch (error) {
    console.error('Error fetching service status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
