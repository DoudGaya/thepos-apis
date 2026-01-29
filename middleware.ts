import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

// Force Node.js runtime for JWT crypto support
export const runtime = 'nodejs'

// Note: dotenv is NOT used here - Vercel provides env vars directly
// and require() breaks in Edge/middleware contexts

export async function middleware(request: NextRequest) {
  // Allow access to verify-otp page for all users
  if (request.nextUrl.pathname === '/auth/verify-otp') {
    return NextResponse.next()
  }

  // Check for auth token on login/register pages
  if (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/register') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
    
    // If authenticated, redirect to dashboard
    if (token) {
       return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Handle profile-completion - allow access without other checks
  if (request.nextUrl.pathname === '/profile-completion') {
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

    // If user already has firstName, lastName, and phone, redirect to dashboard
    if ((token as any).firstName && (token as any).lastName && (token as any).phone) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

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

    // Check if user has completed profile (firstName, lastName, and phone)
    if (!(token as any).firstName || !(token as any).lastName || !(token as any).phone) {
      return NextResponse.redirect(new URL('/profile-completion', request.url))
    }

    // Check if user is verified
    if (!(token as any).isVerified) {
      return NextResponse.redirect(new URL(`/auth/verify-otp?phone=${encodeURIComponent((token as any).phone)}`, request.url))
    }

    // Role-based access control for admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect admin users from dashboard to admin panel
    if (request.nextUrl.pathname.startsWith('/dashboard') && token.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
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

    // Allow specific public auth endpoints without token verification
    const publicAuthRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/verify-otp',
      '/api/auth/request-password-reset',
      '/api/auth/reset-password',
      '/api/auth/send-otp',
      '/api/store/quick-checkout'
    ];

    // Specific NextAuth internal routes to allow
    const nextAuthRoutes = [
      '/api/auth/session',
      '/api/auth/providers',
      '/api/auth/csrf',
      '/api/auth/_log',
      '/api/auth/error',
      '/api/auth/signin',
      '/api/auth/signout',
    ];

    if (
      publicAuthRoutes.includes(request.nextUrl.pathname) ||
      nextAuthRoutes.some(route => request.nextUrl.pathname.startsWith(route)) ||
      request.nextUrl.pathname.startsWith('/api/auth/callback/') ||
      request.nextUrl.pathname.startsWith('/api/meta/') ||
      request.nextUrl.pathname.startsWith('/api/debug/') ||
      request.nextUrl.pathname.startsWith('/api/test/') ||
      request.nextUrl.pathname === '/api/data/networks' ||
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname === '/api/pricing'
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
      const token = authHeader.substring(7).trim()
      
      // AGGRESSIVE DEBUG - log everything
      const jwtSecret = process.env.JWT_SECRET;
      const nextAuthSecret = process.env.NEXTAUTH_SECRET;
      console.log(`🔍 [MW] Secrets: JWT=${!!jwtSecret}(${jwtSecret?.length || 0}), NEXTAUTH=${!!nextAuthSecret}(${nextAuthSecret?.length || 0})`);
      console.log(`🔍 [MW] Token received: ${token.substring(0, 50)}... (len=${token.length})`);
      
      try {
        const decoded = verifyToken(token)
        console.log('✅ [Middleware] Bearer token valid for:', decoded.userId)
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', decoded.userId)
        requestHeaders.set('x-user-role', decoded.role)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (error: any) {
        // Log the FULL error details for debugging
        console.error(`❌ [MW] Token verify FAILED. Error: ${error?.message}`);
        console.error(`❌ [MW] Token (first 80): ${token.substring(0, 80)}`);
        console.error(`❌ [MW] Secret used: ${jwtSecret ? jwtSecret.substring(0, 5) + '...' + jwtSecret.substring(jwtSecret.length - 5) : 'NONE'}`);
        
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
