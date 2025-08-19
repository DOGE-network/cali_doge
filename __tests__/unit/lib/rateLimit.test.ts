import { 
  getRateLimitConfig, 
  RATE_LIMITS, 
  IP_BLOCK_CONFIG,
  getClientIP 
} from '@/lib/rateLimit';
import { NextRequest } from 'next/server';

// Mock Redis client
jest.mock('@/lib/rateLimit', () => {
  const originalModule = jest.requireActual('@/lib/rateLimit');
  return {
    ...originalModule,
    getRedisClient: jest.fn(() => ({
      zrange: jest.fn(),
      zadd: jest.fn(),
      expire: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    }))
  };
});

describe('Rate Limiting Configuration', () => {
  describe('getRateLimitConfig', () => {
    it('returns search config for search endpoints', () => {
      const config = getRateLimitConfig('/api/search');
      expect(config).toBe(RATE_LIMITS.api);
      expect(config.maxRequests).toBe(10000); // Updated from 1000 to 10000
      expect(config.windowMs).toBe(60 * 1000);
    });

    it('returns email config for email endpoints', () => {
      const config = getRateLimitConfig('/api/send-email');
      expect(config).toBe(RATE_LIMITS.email);
      expect(config.maxRequests).toBe(50); // Updated from 5 to 50
      expect(config.windowMs).toBe(60 * 1000);
    });

    it('returns media config for media endpoints', () => {
      const config = getRateLimitConfig('/api/media/test.jpg');
      expect(config).toBe(RATE_LIMITS.media);
      expect(config.maxRequests).toBe(500); // Updated from 50 to 500
    });

    it('returns static config for static assets', () => {
      const config = getRateLimitConfig('/_next/static/test.js');
      expect(config).toBe(RATE_LIMITS.static);
      expect(config.maxRequests).toBe(2000); // Updated from 200 to 2000
    });

    it('returns api config for other API endpoints', () => {
      const config = getRateLimitConfig('/api/departments');
      expect(config).toBe(RATE_LIMITS.api);
      expect(config.maxRequests).toBe(10000); // Updated from 1000 to 10000
    });
  });

  describe('IP Block Configuration', () => {
    it('has correct IP block settings', () => {
      expect(IP_BLOCK_CONFIG.maxViolations).toBe(20);
      expect(IP_BLOCK_CONFIG.blockDuration).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(IP_BLOCK_CONFIG.initialBlockDuration).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('getClientIP', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = {
        headers: {
          get: jest.fn((name) => {
            if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            return null;
          })
        }
      } as unknown as NextRequest;

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('extracts IP from x-real-ip header', () => {
      const request = {
        headers: {
          get: jest.fn((name) => {
            if (name === 'x-forwarded-for') return null;
            if (name === 'x-real-ip') return '192.168.1.2';
            return null;
          })
        }
      } as unknown as NextRequest;

      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('returns unknown when no IP headers found', () => {
      const request = {
        headers: {
          get: jest.fn(() => null)
        }
      } as unknown as NextRequest;

      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });
  });
}); 