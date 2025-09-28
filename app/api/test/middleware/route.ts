import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint will go through middleware authentication
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  
  return NextResponse.json({
    success: true,
    message: 'Middleware authentication passed',
    userId,
    userRole,
    headers: Object.fromEntries(request.headers.entries())
  });
}