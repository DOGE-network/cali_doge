process.env.TEST_MODE = process.env.TEST_MODE || 'mock';

// Load email credentials for integration tests
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch {
  // Ignore if dotenv or .env.local not available
}

// Fix fetch for Node.js 18+ compatibility with Jest
// Override global.fetch with node-fetch to avoid conflicts
try {
  const fetch = require('node-fetch');
  const { Headers, Request, Response } = require('node-fetch');
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
} catch {
  // Ignore if node-fetch not available
} 