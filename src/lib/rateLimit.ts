import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Rate limit configurations
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDuration?: number; // Duration to block IP if limit exceeded (in ms)
  keyPrefix?: string; // Redis key prefix
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10000, // Increased from 1000 to 10000 (10x)
    blockDuration: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'rate_limit:api'
  },
  // Email endpoints (very restrictive)
  email: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // Increased from 5 to 50 (10x)
    blockDuration: 30 * 60 * 1000, // 30 minutes
    keyPrefix: 'rate_limit:email'
  },
  // Media endpoints (moderate)
  media: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500, // Increased from 50 to 500 (10x)
    blockDuration: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'rate_limit:media'
  },
  // Static assets (generous)
  static: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2000, // Increased from 200 to 2000 (10x)
    blockDuration: 2 * 60 * 1000, // 2 minutes
    keyPrefix: 'rate_limit:static'
  }
} as const;

// IP blocking configuration
export const IP_BLOCK_CONFIG = {
  maxViolations: 20, // Increased from 10 to 20
  blockDuration: 24 * 60 * 60 * 1000, // 24 hours
  initialBlockDuration: 60 * 60 * 1000, // 1 hour for first-time offenders
  keyPrefix: 'ip_block'
};

// Lazy initialization of Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// Get client IP address
export function getClientIP(request: NextRequest): string {
  // Check for forwarded headers first (for proxy/CDN setups)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain
    const ip = forwarded.split(',')[0].trim();
    if (ip && ip !== '') {
      return ip;
    }
  }
  
  // Fallback to direct connection IP
  const realIP = request.headers.get('x-real-ip');
  if (realIP && realIP !== '') {
    return realIP;
  }
  
  // Last resort - try to get from connection info
  // Note: In Edge Runtime, this might not be available
  try {
    // @ts-ignore - accessing internal connection info
    const connection = (request as any).connection || (request as any).socket;
    if (connection && connection.remoteAddress) {
      return connection.remoteAddress;
    }
  } catch {
    // Ignore errors accessing connection info
  }
  
  return 'unknown';
}

// Check if IP is blocked
export async function isIPBlocked(ip: string): Promise<boolean> {
  // Reject empty, invalid, or 'unknown' IPs
  if (!ip || ip === '' || ip === 'unknown') {
    return false;
  }
  
  try {
    const redis = getRedisClient();
    const blockKey = `${IP_BLOCK_CONFIG.keyPrefix}:${ip}`;
    const blockInfo = await redis.get(blockKey);
    
    if (blockInfo) {
      const { blockedUntil } = blockInfo as any;
      
      // Check if still blocked
      if (blockedUntil && Date.now() < blockedUntil) {
        return true;
      }
      
      // If block expired, remove it
      if (blockedUntil && Date.now() >= blockedUntil) {
        await redis.del(blockKey);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking IP block status:', error);
    return false; // Fail open - don't block if Redis is down
  }
}

// Record a violation for an IP
export async function recordViolation(ip: string): Promise<void> {
  // Reject empty, invalid, or 'unknown' IPs
  if (!ip || ip === '' || ip === 'unknown') {
    console.warn('Attempted to record violation for invalid IP, skipping');
    return;
  }
  
  try {
    const redis = getRedisClient();
    const blockKey = `${IP_BLOCK_CONFIG.keyPrefix}:${ip}`;
    
    // Get current violation count
    const blockInfo = await redis.get(blockKey) as any || { violations: 0 };
    const newViolations = (blockInfo.violations || 0) + 1;
    
    // Determine block duration based on violation count
    let blockDuration;
    if (newViolations === 1) {
      blockDuration = IP_BLOCK_CONFIG.initialBlockDuration;
    } else if (newViolations >= IP_BLOCK_CONFIG.maxViolations) {
      blockDuration = IP_BLOCK_CONFIG.blockDuration * 7; // 7 days for repeated violations
    } else {
      blockDuration = IP_BLOCK_CONFIG.blockDuration;
    }
    
    const blockedUntil = Date.now() + blockDuration;
    
    // Update block info
    await redis.set(blockKey, {
      violations: newViolations,
      blockedUntil,
      lastViolation: Date.now()
    }, { ex: Math.ceil(blockDuration / 1000) });
    
    console.warn(`IP ${ip} recorded violation ${newViolations}/${IP_BLOCK_CONFIG.maxViolations}`);
    
    if (newViolations >= IP_BLOCK_CONFIG.maxViolations) {
      console.error(`IP ${ip} permanently blocked due to repeated violations`);
    }
  } catch (error) {
    console.error('Error recording IP violation:', error);
  }
}

// Rate limiting result
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked?: boolean;
}

// Check rate limit for an IP
export async function checkRateLimit(
  ip: string, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Reject empty, invalid, or 'unknown' IPs
  if (!ip || ip === '' || ip === 'unknown') {
    console.warn('Attempted to check rate limit for invalid IP, allowing request');
    return {
      success: true,
      remaining: 999,
      resetTime: Date.now() + 60000
    };
  }
  
  try {
    const redis = getRedisClient();
    const key = `${config.keyPrefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get current request count using zrange with scores
    const rawRequests = await redis.zrange(key, 0, -1, { withScores: true }) as string[];
    // Convert flat array [member1, score1, member2, score2, ...] to tuples
    const requests: Array<[string, number]> = [];
    for (let i = 0; i < rawRequests.length; i += 2) {
      const member = rawRequests[i];
      const score = parseFloat(rawRequests[i + 1]);
      requests.push([member, score]);
    }
    const currentCount = requests.filter(([_, score]) => score >= windowStart).length;
    
    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      // Record violation
      await recordViolation(ip);
      
      // Calculate retry after time
      const oldestRequest = requests.find(([_, score]) => score >= windowStart);
      const retryAfter = oldestRequest 
        ? Math.ceil((oldestRequest[1] + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);
      
      return {
        success: false,
        remaining: 0,
        resetTime: now + config.windowMs,
        retryAfter: Math.max(retryAfter, 1)
      };
    }
    
    // Add current request to the set
    await redis.zadd(key, { score: now, member: now.toString() });
    
    // Set expiration on the key
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
    
    return {
      success: true,
      remaining: config.maxRequests - currentCount - 1,
      resetTime: now + config.windowMs
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow request if Redis is down
    return {
      success: true,
      remaining: 999,
      resetTime: Date.now() + 60000
    };
  }
}

// Get rate limit configuration for a path
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // All /api/search endpoints use the general API rate limit
  if (pathname.startsWith('/api/search')) {
    return RATE_LIMITS.api;
  }
  if (pathname.startsWith('/api/send-email')) {
    return RATE_LIMITS.email;
  }
  if (pathname.startsWith('/api/media') || pathname.startsWith('/media/')) {
    return RATE_LIMITS.media;
  }
  if (pathname.startsWith('/_next/') || pathname.startsWith('/images/')) {
    return RATE_LIMITS.static;
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS.api;
  }
  // Default to API limits for unknown paths
  return RATE_LIMITS.api;
}

// Clean up expired rate limit entries (can be called periodically)
export async function cleanupExpiredEntries(): Promise<void> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    
    // Clean up rate limit keys
    for (const config of Object.values(RATE_LIMITS) as RateLimitConfig[]) {
      const pattern = `${config.keyPrefix}:*`;
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const windowStart = now - (config as any).windowMs;
        // Remove all entries with score less than windowStart
        await redis.zremrangebyscore(key, -Infinity, windowStart);
      }
    }
    
    // Clean up expired IP blocks
    const blockPattern = `${IP_BLOCK_CONFIG.keyPrefix}:*`;
    const blockKeys = await redis.keys(blockPattern);
    
    for (const key of blockKeys) {
      const blockInfo = await redis.get(key) as any;
      if (blockInfo && blockInfo.blockedUntil && now >= blockInfo.blockedUntil) {
        await redis.del(key);
      }
    }
    
    // Clean up invalid IP entries (empty strings, 'unknown', etc.)
    await cleanupInvalidIPs();
    
  } catch (error) {
    console.error('Error cleaning up expired entries:', error);
  }
}

// Clean up invalid IP entries
async function cleanupInvalidIPs(): Promise<void> {
  try {
    const redis = getRedisClient();
    
    // Find and clean up invalid IP entries (empty or malformed)
    const blockKeys = await redis.keys('ip_block:*');
    const invalidKeys: string[] = [];
    
    for (const key of blockKeys) {
      const ip = key.split(':')[1];
      if (!ip || ip === '' || ip === 'unknown') {
        invalidKeys.push(key);
      }
    }
    
    if (invalidKeys.length > 0) {
      await redis.del(...invalidKeys);
      console.log(`🧹 Cleaned up ${invalidKeys.length} invalid IP block entries`);
    }
    
    // Also clean up invalid rate limit keys
    const rateLimitPatterns = [
      'rate_limit:api:*',
      'rate_limit:email:*',
      'rate_limit:media:*',
      'rate_limit:static:*'
    ];
    
    const invalidRateLimitKeys: string[] = [];
    
    for (const pattern of rateLimitPatterns) {
      const keys = await redis.keys(pattern);
      for (const key of keys) {
        const ip = key.split(':')[2];
        if (!ip || ip === '' || ip === 'unknown') {
          invalidRateLimitKeys.push(key);
        }
      }
    }
    
    if (invalidRateLimitKeys.length > 0) {
      await redis.del(...invalidRateLimitKeys);
      console.log(`🧹 Cleaned up ${invalidRateLimitKeys.length} invalid rate limit entries`);
    }
    
  } catch (error) {
    console.error('Error cleaning up invalid IPs:', error);
  }
} 