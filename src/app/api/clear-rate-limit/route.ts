import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, getClientIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let ip = searchParams.get('ip');
    
    // If no IP provided, use the client's IP
    if (!ip) {
      ip = getClientIP(request);
    }
    
    const redis = getRedisClient();
    
    // Clear rate limit data for this IP
    const rateLimitKeys = [
      `rate_limit:search:${ip}`,
      `rate_limit:api:${ip}`,
      `rate_limit:email:${ip}`,
      `rate_limit:media:${ip}`,
      `rate_limit:static:${ip}`
    ];
    
    // Clear IP block data
    const blockKey = `ip_block:${ip}`;
    
    // Delete all keys
    await redis.del(...rateLimitKeys, blockKey);
    
    console.log(`[CLEAR RATE LIMIT API] Cleared rate limit data for IP: ${ip}`);
    
    return NextResponse.json({
      success: true,
      message: `Rate limit data cleared for IP: ${ip}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CLEAR RATE LIMIT API] Error clearing rate limit data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear rate limit data',
      details: error
    }, { status: 500 });
  }
} 