interface RateLimitInfo {
  retryAfter?: number;
  remaining?: number;
  resetTime?: number;
}

interface ApiError {
  message: string;
  status: number;
  rateLimit?: RateLimitInfo;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse(response: Response): Promise<any> {
    if (response.ok) {
      return response.json();
    }

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const resetTime = response.headers.get('X-RateLimit-Reset');

      const rateLimitInfo: RateLimitInfo = {
        retryAfter: retryAfter ? parseInt(retryAfter) : 60,
        remaining: remaining ? parseInt(remaining) : 0,
        resetTime: resetTime ? parseInt(resetTime) : undefined
      };

      throw new Error(JSON.stringify({
        message: 'Too many requests. Please try again later.',
        status: 429,
        rateLimit: rateLimitInfo
      }));
    }

    // Handle IP blocking
    if (response.status === 403) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(JSON.stringify({
        message: 'Your IP has been temporarily blocked due to abuse. Please try again later.',
        status: 403,
        rateLimit: { retryAfter: retryAfter ? parseInt(retryAfter) : 3600 }
      }));
    }

    // Handle other errors
    let errorMessage = 'An error occurred while fetching data.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(JSON.stringify({
      message: errorMessage,
      status: response.status
    }));
  }

  async fetch(url: string, options: RequestInit = {}): Promise<any> {
    const fullUrl = this.baseUrl + url;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      return await this.handleResponse(response);
    } catch (error) {
      // Re-throw if it's already a parsed error
      if (error instanceof Error && error.message.startsWith('{')) {
        throw error;
      }

      // Handle network errors
      throw new Error(JSON.stringify({
        message: 'Network error. Please check your connection and try again.',
        status: 0
      }));
    }
  }

  async get(url: string, params?: Record<string, string>): Promise<any> {
    const searchParams = params ? new URLSearchParams(params) : '';
    const fullUrl = searchParams ? `${url}?${searchParams}` : url;
    return this.fetch(fullUrl, { method: 'GET' });
  }

  async post(url: string, data?: any): Promise<any> {
    return this.fetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any): Promise<any> {
    return this.fetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string): Promise<any> {
    return this.fetch(url, { method: 'DELETE' });
  }
}

// Parse error messages from the API client
export function parseApiError(error: any): ApiError {
  try {
    if (error instanceof Error && error.message.startsWith('{')) {
      return JSON.parse(error.message);
    }
  } catch {
    // If parsing fails, return a generic error
  }

  return {
    message: error.message || 'An unknown error occurred',
    status: 0
  };
}

// Check if an error is a rate limit error
export function isRateLimitError(error: any): boolean {
  const parsedError = parseApiError(error);
  return parsedError.status === 429 || parsedError.status === 403;
}

// Get rate limit info from an error
export function getRateLimitInfo(error: any): RateLimitInfo | undefined {
  const parsedError = parseApiError(error);
  return parsedError.rateLimit;
}

export default ApiClient; 