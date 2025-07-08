import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Basic security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add critical security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy to prevent XSS attacks
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.vercel.com https://*.supabase.co https://www.google-analytics.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Set stricter headers for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Headers are now set appropriately for all environments above

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