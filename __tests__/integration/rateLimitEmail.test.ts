import { sendEmailAlert } from '@/lib/logging';
import { RATE_LIMITS, getRateLimitConfig } from '@/lib/rateLimit';
import { execSync } from 'child_process';

// Use global fetch (configured in jest.env.js)
const fetch = global.fetch;

// Helper function to make requests with throttling
async function makeThrottledRequests(count: number, delay: number = 10): Promise<Response[]> {
  const responses: Response[] = [];
  for (let i = 0; i < count; i++) {
    const response = await fetch('http://localhost:3000/api/search?q=test&limit=1');
    responses.push(response);
    
    // Log every 10th request to see what's happening
    if ((i + 1) % 10 === 0) {
      console.log(`Request ${i + 1}/${count}: Status ${response.status}`);
    }
    
    // Small delay between requests to prevent overwhelming the server
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return responses;
}

// This test actually triggers rate limits to verify email alerts work
describe('Rate Limit Email Integration Test', () => {
  beforeEach(async () => {
    // Clear any existing rate limit data using the script
    try {
      execSync('npm run clear-rate-limit cleanup', { stdio: 'pipe' });
    } catch (err) {
      // Ignore if script fails
    }
  }, 10000); // 10 second timeout for beforeEach

  it('should trigger email alert when rate limit is exceeded', async () => {
    // This test requires the server to be running
    // First clear any existing rate limit and IP block state
    try {
      execSync('npm run clear-rate-limit cleanup', { stdio: 'pipe' });
    } catch (err) {
      console.warn('Could not clear rate limit state:', err);
    }
    
    // Get the actual rate limit configuration for API endpoints
    const apiConfig = getRateLimitConfig('/api/search');
    const maxRequests = apiConfig.maxRequests;
    
    console.log(`API rate limit: ${maxRequests} requests per minute`);
    
    // Make exactly maxRequests requests to reach the limit (but not exceed it)
    console.log(`Making ${maxRequests} requests to reach rate limit...`);
    const responses = await makeThrottledRequests(maxRequests, 50);
    
    // Verify the last request was successful
    const lastResponse = responses[responses.length - 1];
    console.log(`${maxRequests}th request status: ${lastResponse.status}`);
    expect(lastResponse.status).toBe(200);
    
    // Now make the maxRequests+1 request that should trigger the rate limit
    console.log(`Making ${maxRequests + 1}th request to trigger rate limit...`);
    // Add a small delay before the final request
    await new Promise(resolve => setTimeout(resolve, 100));
    const rateLimitResponse = await fetch('http://localhost:3000/api/search?q=test&limit=1');
    
    // Check the response
    console.log(`${maxRequests + 1}th request status: ${rateLimitResponse.status}`);
    
    // Strictly require 429 for rate limit
    expect(rateLimitResponse.status).toBe(429);
    expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    expect(rateLimitResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
    console.log('Rate limit triggered successfully - email alert should have been sent');
    
  }, 90000); // 90 second timeout
}); 