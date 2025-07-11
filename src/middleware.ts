import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getClientIP,
  isIPBlocked,
  checkRateLimit,
  getRateLimitConfig
} from '@/lib/rateLimit';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // --- IP Rate Limiting and Abuse Protection ---
  const ip = getClientIP(request);
  const config = getRateLimitConfig(request.nextUrl.pathname);

  // Block abusive IPs
  if (await isIPBlocked(ip)) {
    return new NextResponse('Your IP has been temporarily blocked due to abuse. If you believe this is an error, contact support.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '3600'
      }
    });
  }

  // Enforce rate limit
  const rateResult = await checkRateLimit(ip, config);
  if (!rateResult.success) {
    return new NextResponse('Too many requests from your IP. Please try again later.', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': rateResult.retryAfter?.toString() || '60',
        'X-RateLimit-Remaining': rateResult.remaining.toString(),
        'X-RateLimit-Reset': rateResult.resetTime.toString()
      }
    });
  }

  // Only keeping basic non-restrictive security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set permissive headers for development
  if (process.env.NODE_ENV === 'development') {
    // No need to set any restrictive headers in development
    // This ensures the app works fully with all external services
  } else {
    // In production, we could add more restrictive headers
    // but we'll keep it minimal
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  // Add CDN caching headers for static assets
  if (
    request.nextUrl.pathname.startsWith('/_next/static/') ||
    request.nextUrl.pathname.startsWith('/images/') ||
    request.nextUrl.pathname.startsWith('/media/') ||
    request.nextUrl.pathname.endsWith('.jpg') ||
    request.nextUrl.pathname.endsWith('.png') ||
    request.nextUrl.pathname.endsWith('.svg') ||
    request.nextUrl.pathname.endsWith('.webp')
  ) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  // Add CDN caching headers for API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip caching for POST/PUT/DELETE requests
    if (request.method !== 'GET') {
      return response;
    }

    // Dynamic but cacheable API routes
    if (
      request.nextUrl.pathname.includes('/search') ||
      request.nextUrl.pathname.includes('/vendors/top') ||
      request.nextUrl.pathname.includes('/departments')
    ) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=600'
      );
    } else {
      // Default API caching strategy
      response.headers.set(
        'Cache-Control',
        'public, max-age=10, stale-while-revalidate=60'
      );
    }
  }

  // Add caching headers for the root page
  if (request.nextUrl.pathname === '/') {
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=600'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/images/:path*',
    '/media/:path*',
    '/api/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 