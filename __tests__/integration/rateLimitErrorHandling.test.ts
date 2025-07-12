import { isRateLimitError, getRateLimitInfo, parseApiError } from '@/lib/apiClient';

describe('Rate Limit Error Handling Integration', () => {
  it('should properly handle 429 errors from the search API', () => {
    // Simulate a 429 error response from the search API
    const mock429Response = new Response('Too many requests from your IP. Please try again later.', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + 60000).toString()
      }
    });

    // Simulate the error that would be thrown by the search page fetcher
    const rateLimitError = new Error(JSON.stringify({
      message: 'Too many requests. Please try again later.',
      status: 429,
      rateLimit: {
        retryAfter: 60,
        remaining: 0,
        resetTime: Date.now() + 60000
      }
    }));

    // Test that the error is correctly identified as a rate limit error
    expect(isRateLimitError(rateLimitError)).toBe(true);

    // Test that rate limit info is correctly extracted
    const rateLimitInfo = getRateLimitInfo(rateLimitError);
    expect(rateLimitInfo).toEqual({
      retryAfter: 60,
      remaining: 0,
      resetTime: expect.any(Number)
    });

    // Test that the error is correctly parsed
    const parsedError = parseApiError(rateLimitError);
    expect(parsedError.message).toBe('Too many requests. Please try again later.');
    expect(parsedError.status).toBe(429);
    expect(parsedError.rateLimit).toEqual({
      retryAfter: 60,
      remaining: 0,
      resetTime: expect.any(Number)
    });
  });

  it('should properly handle 403 IP blocking errors', () => {
    // Simulate a 403 error response from the API
    const mock403Response = new Response('Your IP has been temporarily blocked due to abuse. If you believe this is an error, contact support.', {
      status: 403,
      headers: {
        'Retry-After': '3600'
      }
    });

    // Simulate the error that would be thrown by the search page fetcher
    const ipBlockError = new Error(JSON.stringify({
      message: 'Your IP has been temporarily blocked due to abuse. Please try again later.',
      status: 403,
      rateLimit: { retryAfter: 3600 }
    }));

    // Test that the error is correctly identified as a rate limit error
    expect(isRateLimitError(ipBlockError)).toBe(true);

    // Test that rate limit info is correctly extracted
    const rateLimitInfo = getRateLimitInfo(ipBlockError);
    expect(rateLimitInfo).toEqual({ retryAfter: 3600 });

    // Test that the error is correctly parsed
    const parsedError = parseApiError(ipBlockError);
    expect(parsedError.message).toBe('Your IP has been temporarily blocked due to abuse. Please try again later.');
    expect(parsedError.status).toBe(403);
    expect(parsedError.rateLimit).toEqual({ retryAfter: 3600 });
  });

  it('should not identify other HTTP errors as rate limit errors', () => {
    // Simulate a 500 error response
    const serverError = new Error(JSON.stringify({
      message: 'Internal server error',
      status: 500
    }));

    // Test that the error is NOT identified as a rate limit error
    expect(isRateLimitError(serverError)).toBe(false);

    // Test that no rate limit info is extracted
    const rateLimitInfo = getRateLimitInfo(serverError);
    expect(rateLimitInfo).toBeUndefined();

    // Test that the error is correctly parsed
    const parsedError = parseApiError(serverError);
    expect(parsedError.message).toBe('Internal server error');
    expect(parsedError.status).toBe(500);
    expect(parsedError.rateLimit).toBeUndefined();
  });

  it('should handle the old error format gracefully (backward compatibility)', () => {
    // Simulate the old error format that was used before the fix
    const oldFormatError = new Error('HTTP error! status: 429');

    // Test that the error is NOT identified as a rate limit error (old format)
    expect(isRateLimitError(oldFormatError)).toBe(false);

    // Test that no rate limit info is extracted
    const rateLimitInfo = getRateLimitInfo(oldFormatError);
    expect(rateLimitInfo).toBeUndefined();

    // Test that the error is handled gracefully
    const parsedError = parseApiError(oldFormatError);
    expect(parsedError.message).toBe('HTTP error! status: 429');
    expect(parsedError.status).toBe(0);
    expect(parsedError.rateLimit).toBeUndefined();
  });
}); 