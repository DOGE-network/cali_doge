import { checkRateLimit, getRateLimitConfig } from '@/lib/rateLimit';

describe('Rate Limit Behavior Test', () => {
  it('should verify search rate limit is set to 10000 requests per minute', () => {
    const apiConfig = getRateLimitConfig('/api/search');
    expect(apiConfig.maxRequests).toBe(10000); // Updated from 40 to 10000
    expect(apiConfig.windowMs).toBe(60 * 1000); // 1 minute
  });

  it('should verify each request counts as 1 request', async () => {
    const testIP = '192.168.1.14';
    const apiConfig = getRateLimitConfig('/api/search');
    
    // Simulate making requests one by one
    for (let i = 0; i < 10000; i++) { // Updated from 40 to 10000
      const result = await checkRateLimit(testIP, apiConfig);
      if (i < 9999) { // Updated from 39 to 9999
        // Should succeed for first 9999 requests
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(9999 - i); // Updated from 39 to 9999
      } else {
        // 10000th request should be rate limited
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
      }
    }
  });

  it('should verify batched requests count as multiple requests', async () => {
    const testIP = '192.168.1.14';
    const apiConfig = getRateLimitConfig('/api/search');
    
    // Simulate making 11000 requests (exceeding the 10000 limit)
    const requests = Array(11000).fill(null).map(() => // Updated from 50 to 11000
      checkRateLimit(testIP, apiConfig)
    );
    
    const results = await Promise.all(requests);
    
    // First 10000 should succeed
    for (let i = 0; i < 10000; i++) { // Updated from 40 to 10000
      expect(results[i].success).toBe(true);
    }
    
    // Remaining 1000 should fail
    for (let i = 10000; i < 11000; i++) { // Updated from 40,50 to 10000,11000
      expect(results[i].success).toBe(false);
      expect(results[i].remaining).toBe(0);
    }
  });
}); 