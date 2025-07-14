import { checkRateLimit, getRateLimitConfig } from '@/lib/rateLimit';

describe('Rate Limit Behavior Test', () => {
  it('should verify search rate limit is set to 200 requests per minute', () => {
    const apiConfig = getRateLimitConfig('/api/search');
    expect(apiConfig.maxRequests).toBe(200);
    expect(apiConfig.windowMs).toBe(60 * 1000); // 1 minute
  });

  it('should verify each request counts as 1 request', async () => {
    const testIP = '192.168.1.14';
    const apiConfig = getRateLimitConfig('/api/search');
    
    // Simulate making requests one by one
    for (let i = 0; i < 200; i++) {
      const result = await checkRateLimit(testIP, apiConfig);
      if (i < 199) {
        // Should succeed for first 199 requests
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(199 - i);
      } else {
        // 200th request should be rate limited
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
      }
    }
  });

  it('should verify batched requests count as multiple requests', async () => {
    const testIP = '192.168.1.14';
    const apiConfig = getRateLimitConfig('/api/search');
    
    // Simulate making 250 requests (exceeding the 200 limit)
    const requests = Array(250).fill(null).map(() => 
      checkRateLimit(testIP, apiConfig)
    );
    
    const results = await Promise.all(requests);
    
    // First 200 should succeed
    for (let i = 0; i < 200; i++) {
      expect(results[i].success).toBe(true);
    }
    
    // Remaining 50 should fail
    for (let i = 200; i < 250; i++) {
      expect(results[i].success).toBe(false);
      expect(results[i].remaining).toBe(0);
    }
  });
}); 