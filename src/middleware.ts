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

  // Skip rate limiting for internal alert API calls to prevent loops
  if (request.nextUrl.pathname === '/api/alert') {
    return response;
  }

  // --- IP Rate Limiting and Abuse Protection ---
  const ip = getClientIP(request);
  
  // Skip rate limiting for 'unknown' IPs entirely
  if (ip === 'unknown') {
    console.log(`[MIDDLEWARE] Skipping rate limiting for unknown IP: ${ip}`);
    return response;
  }
  
  // Ensure IP is never blank - if it is, skip rate limiting
  if (!ip || ip === '') {
    console.log(`[MIDDLEWARE] Skipping rate limiting for blank IP`);
    return response;
  }
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const config = getRateLimitConfig(request.nextUrl.pathname);

  // Debug logging
  console.log(`[MIDDLEWARE] ${request.method} ${request.nextUrl.pathname} from IP: ${ip}, config: ${config.keyPrefix}`);

  // Block abusive IPs
  if (await isIPBlocked(ip)) {
    console.log(`[MIDDLEWARE] IP ${ip} is blocked`);
    
    // Send email alert via API (runs in Node.js environment)
    try {
      await fetch(`${request.nextUrl.origin}/api/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'IP Block Alert',
          message: `IP ${ip} blocked due to repeated violations`,
          data: { 
            ip, 
            userAgent, 
            path: request.nextUrl.pathname,
            timestamp: new Date().toISOString(),
            blockReason: 'Repeated rate limit violations'
          }
        })
      });
    } catch (error) {
      console.error('Failed to send IP block alert:', error);
    }
    
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
  console.log(`[MIDDLEWARE] Rate limit result for ${ip}: success=${rateResult.success}, remaining=${rateResult.remaining}`);
  
  if (!rateResult.success) {
    console.log(`[MIDDLEWARE] Rate limit exceeded for ${ip}, returning 429`);
    
    // Send email alert via API (runs in Node.js environment)
    try {
      await fetch(`${request.nextUrl.origin}/api/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Rate Limit Alert',
          message: `Rate limit exceeded for IP ${ip} on ${config.keyPrefix}`,
          data: { 
            ip, 
            userAgent, 
            path: request.nextUrl.pathname, 
            config: config.keyPrefix,
            rateLimit: {
              maxRequests: config.maxRequests,
              windowMs: config.windowMs,
              remaining: rateResult.remaining,
              retryAfter: rateResult.retryAfter,
              resetTime: rateResult.resetTime
            },
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.error('Failed to send rate limit alert:', error);
    }
    
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