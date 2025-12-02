import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { ApiError, errorResponse, UnauthorizedError } from './api-utils';

type HandlerFunction = (req: NextRequest & { user?: any }) => Promise<NextResponse>;

export function apiHandler(handler: HandlerFunction) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);
      
      // Attach user to request if session exists
      // Note: NextRequest is immutable, so we cast it to any to attach user
      // In a real app, we might want to use a custom request type
      if (session?.user) {
        (req as any).user = session.user;
      }

      return await handler(req as any);
    } catch (error: any) {
      console.error('API Error:', error);
      
      if (error instanceof ApiError) {
        return errorResponse(error);
      }

      return errorResponse(error.message || 'Internal Server Error', 500);
    }
  };
}
