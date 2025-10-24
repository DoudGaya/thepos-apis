import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

// Force Node.js runtime for JWT crypto support
export const runtime = 'nodejs'

// Explicitly load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('Dotenv load error in middleware.ts:', error);
}

export async function middleware(request: NextRequest) {
  // Allow access to verify-otp page for all users
  if (request.nextUrl.pathname === '/auth/verify-otp') {
    return NextResponse.next()
  }

  // Handle NextAuth protected routes (dashboard and admin)
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin')
  ) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user is verified
    if (!(token as any).isVerified) {
      return NextResponse.redirect(new URL(`/auth/verify-otp?phone=${encodeURIComponent((token as any).phone)}`, request.url))
    }

    // Role-based access control for admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  }

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Add CORS headers to API responses
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Allow auth endpoints without token verification
    if (
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/api/meta/') ||
      request.nextUrl.pathname.startsWith('/api/debug/') ||
      request.nextUrl.pathname.startsWith('/api/test/') ||
      request.nextUrl.pathname === '/api/data/networks' ||
      request.nextUrl.pathname === '/api/health'
    ) {
      return response
    }

    // Check for NextAuth session token (JWT in cookie)
    const nextAuthToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // If NextAuth token exists, allow the request (getAuthenticatedUser() will handle it)
    if (nextAuthToken) {
      console.log('✅ [Middleware] NextAuth token found for:', nextAuthToken.email)
      return response
    }

    // If no NextAuth token, check for Bearer token
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verifyToken(token)
        console.log('✅ [Middleware] Bearer token valid for:', decoded.userId)
        // Add user info to headers for API routes
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', decoded.userId)
        requestHeaders.set('x-user-role', decoded.role)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (error) {
        console.error('❌ [Middleware] Bearer token invalid:', error)
        return NextResponse.json(
          { error: 'Invalid token' },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        )
      }
    }

    // No valid authentication found
    console.error('❌ [Middleware] No valid authentication found for:', request.nextUrl.pathname)
    return NextResponse.json(
      { error: 'Authorization header required' },
      { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*'],
}
