import { isRateLimitError, getRateLimitInfo, parseApiError } from '@/lib/apiClient';

describe('API Client Rate Limit Utilities', () => {
  describe('parseApiError', () => {
    it('parses JSON error messages correctly', () => {
      const jsonError = new Error(JSON.stringify({
        message: 'Too many requests. Please try again later.',
        status: 429,
        rateLimit: {
          retryAfter: 60,
          remaining: 0,
          resetTime: 1234567890
        }
      }));

      const result = parseApiError(jsonError);
      
      expect(result.message).toBe('Too many requests. Please try again later.');
      expect(result.status).toBe(429);
      expect(result.rateLimit).toEqual({
        retryAfter: 60,
        remaining: 0,
        resetTime: 1234567890
      });
    });

    it('handles non-JSON error messages gracefully', () => {
      const simpleError = new Error('HTTP error! status: 500');
      
      const result = parseApiError(simpleError);
      
      expect(result.message).toBe('HTTP error! status: 500');
      expect(result.status).toBe(0);
      expect(result.rateLimit).toBeUndefined();
    });

    it('handles malformed JSON gracefully', () => {
      const malformedError = new Error('{invalid json');
      
      const result = parseApiError(malformedError);
      
      expect(result.message).toBe('{invalid json');
      expect(result.status).toBe(0);
      expect(result.rateLimit).toBeUndefined();
    });
  });

  describe('isRateLimitError', () => {
    it('identifies 429 errors as rate limit errors', () => {
      const rateLimitError = new Error(JSON.stringify({
        message: 'Too many requests',
        status: 429,
        rateLimit: { retryAfter: 60 }
      }));

      expect(isRateLimitError(rateLimitError)).toBe(true);
    });

    it('identifies 403 errors as rate limit errors', () => {
      const ipBlockError = new Error(JSON.stringify({
        message: 'IP blocked',
        status: 403,
        rateLimit: { retryAfter: 3600 }
      }));

      expect(isRateLimitError(ipBlockError)).toBe(true);
    });

    it('does not identify other errors as rate limit errors', () => {
      const otherError = new Error(JSON.stringify({
        message: 'Server error',
        status: 500
      }));

      expect(isRateLimitError(otherError)).toBe(false);
    });

    it('handles non-JSON errors correctly', () => {
      const simpleError = new Error('HTTP error! status: 429');
      
      expect(isRateLimitError(simpleError)).toBe(false);
    });
  });

  describe('getRateLimitInfo', () => {
    it('extracts rate limit info from 429 errors', () => {
      const rateLimitError = new Error(JSON.stringify({
        message: 'Too many requests',
        status: 429,
        rateLimit: {
          retryAfter: 60,
          remaining: 0,
          resetTime: 1234567890
        }
      }));

      const result = getRateLimitInfo(rateLimitError);
      
      expect(result).toEqual({
        retryAfter: 60,
        remaining: 0,
        resetTime: 1234567890
      });
    });

    it('extracts rate limit info from 403 errors', () => {
      const ipBlockError = new Error(JSON.stringify({
        message: 'IP blocked',
        status: 403,
        rateLimit: { retryAfter: 3600 }
      }));

      const result = getRateLimitInfo(ipBlockError);
      
      expect(result).toEqual({ retryAfter: 3600 });
    });

    it('returns undefined for non-rate-limit errors', () => {
      const otherError = new Error(JSON.stringify({
        message: 'Server error',
        status: 500
      }));

      const result = getRateLimitInfo(otherError);
      
      expect(result).toBeUndefined();
    });

    it('returns undefined for non-JSON errors', () => {
      const simpleError = new Error('HTTP error! status: 429');
      
      const result = getRateLimitInfo(simpleError);
      
      expect(result).toBeUndefined();
    });
  });
}); 