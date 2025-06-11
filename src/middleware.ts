import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

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

    // Add Vercel's CDN headers
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );
  }

  // Add caching headers for the root page
  if (request.nextUrl.pathname === '/') {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
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