import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

// Mock the rate limiting functions
jest.mock('@/lib/rateLimit', () => ({
  getClientIP: jest.fn(() => '192.168.1.1'),
  isIPBlocked: jest.fn(),
  checkRateLimit: jest.fn(),
  getRateLimitConfig: jest.fn(() => ({
    windowMs: 60000,
    maxRequests: 1000,
    keyPrefix: 'test'
  }))
}));

jest.mock('@/lib/logging', () => ({
  logAndNotify: jest.fn()
}));

describe('Middleware Rate Limiting', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      nextUrl: {
        pathname: '/api/search'
      },
      headers: {
        get: jest.fn((name) => {
          if (name === 'user-agent') return 'test-agent';
          return null;
        })
      },
      method: 'GET'
    } as unknown as NextRequest;
  });

  it('returns 403 when IP is blocked', async () => {
    const { isIPBlocked } = require('@/lib/rateLimit');
    isIPBlocked.mockResolvedValue(true);

    const response = await middleware(mockRequest);
    
    expect(response.status).toBe(403);
    expect(await response.text()).toContain('Your IP has been temporarily blocked');
    expect(response.headers.get('Retry-After')).toBe('3600');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { isIPBlocked, checkRateLimit } = require('@/lib/rateLimit');
    isIPBlocked.mockResolvedValue(false);
    checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60
    });

    const response = await middleware(mockRequest);
    
    expect(response.status).toBe(429);
    expect(await response.text()).toContain('Too many requests from your IP');
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('allows request when rate limit not exceeded', async () => {
    const { isIPBlocked, checkRateLimit } = require('@/lib/rateLimit');
    isIPBlocked.mockResolvedValue(false);
    checkRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      resetTime: Date.now() + 60000
    });

    const response = await middleware(mockRequest);
    
    expect(response.status).toBe(200);
  });

  it('sets appropriate cache headers for API routes', async () => {
    const { isIPBlocked, checkRateLimit } = require('@/lib/rateLimit');
    isIPBlocked.mockResolvedValue(false);
    checkRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      resetTime: Date.now() + 60000
    });

    const response = await middleware(mockRequest);
    
    expect(response.headers.get('Cache-Control')).toContain('public, max-age=60');
  });

  it('sets appropriate cache headers for static assets', async () => {
    const { isIPBlocked, checkRateLimit } = require('@/lib/rateLimit');
    isIPBlocked.mockResolvedValue(false);
    checkRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      resetTime: Date.now() + 60000
    });

    mockRequest.nextUrl.pathname = '/_next/static/test.js';
    
    const response = await middleware(mockRequest);
    
    expect(response.headers.get('Cache-Control')).toContain('public, max-age=31536000');
  });
}); 