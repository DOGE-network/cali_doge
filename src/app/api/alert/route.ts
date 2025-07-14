import { NextRequest, NextResponse } from 'next/server';
import { sendEmailAlert } from '@/lib/logging';
import { getRedisClient } from '@/lib/rateLimit';

// Function to get Redis metadata about rate limited IPs
async function getRateLimitMetadata() {
  try {
    const redis = getRedisClient();
    const metadata: any = {};
    
    // Get all rate limit keys
    const rateLimitPatterns = [
      'rate_limit:search:*',
      'rate_limit:api:*', 
      'rate_limit:email:*',
      'rate_limit:media:*',
      'rate_limit:static:*'
    ];
    
    for (const pattern of rateLimitPatterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const configType = pattern.split(':')[1]; // search, api, email, etc.
        metadata[configType] = {
          activeKeys: keys.length,
          ips: []
        };
        
        // Get details for each IP
        for (const key of keys.slice(0, 10)) { // Limit to first 10 for email size
          const ip = key.split(':')[2];
          const requests = await redis.zrange(key, 0, -1, { withScores: true }) as string[];
          const requestCount = Math.ceil(requests.length / 2); // Each request is member+score
          
          metadata[configType].ips.push({
            ip,
            requestCount,
            lastActivity: requests.length > 0 ? new Date(parseInt(requests[requests.length - 1])).toISOString() : 'Unknown'
          });
        }
      }
    }
    
    // Get IP block information
    const blockKeys = await redis.keys('ip_block:*');
    if (blockKeys.length > 0) {
      metadata.blockedIPs = {
        totalBlocked: blockKeys.length,
        ips: []
      };
      
      for (const key of blockKeys.slice(0, 10)) { // Limit to first 10
        const ip = key.split(':')[1];
        const blockInfo = await redis.get(key) as any;
        if (blockInfo) {
          metadata.blockedIPs.ips.push({
            ip,
            violations: blockInfo.violations || 0,
            blockedUntil: blockInfo.blockedUntil ? new Date(blockInfo.blockedUntil).toISOString() : 'Unknown',
            lastViolation: blockInfo.lastViolation ? new Date(blockInfo.lastViolation).toISOString() : 'Unknown'
          });
        }
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('Error getting rate limit metadata:', error);
    return { error: 'Failed to fetch Redis metadata' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subject, message, data } = await request.json();
    
    // Log the alert details
    console.log('[ALERT API] Received alert:', { subject, message, data });
    
    // Get Redis metadata about all rate limited IPs
    const redisMetadata = await getRateLimitMetadata();
    
    // Create detailed email message with all the data
    let detailedMessage = `
${message}

Details:
- IP: ${data?.ip || 'Unknown'}
- User Agent: ${data?.userAgent || 'Unknown'}
- Path: ${data?.path || 'Unknown'}
- Timestamp: ${data?.timestamp || new Date().toISOString()}
${data?.config ? `- Config: ${data.config}` : ''}
${data?.rateLimit ? `
Rate Limit Info:
- Max Requests: ${data.rateLimit.maxRequests}
- Window: ${data.rateLimit.windowMs}ms
- Remaining: ${data.rateLimit.remaining}
- Retry After: ${data.rateLimit.retryAfter}s
- Reset Time: ${new Date(data.rateLimit.resetTime).toISOString()}
` : ''}
${data?.blockReason ? `- Block Reason: ${data.blockReason}` : ''}

=== REDIS RATE LIMIT METADATA ===
`;

    // Add Redis metadata to email
    if (redisMetadata.error) {
      detailedMessage += `\nError fetching Redis metadata: ${redisMetadata.error}`;
    } else {
      // Add rate limit data by type
      Object.keys(redisMetadata).forEach(type => {
        if (type === 'blockedIPs') return; // Handle separately
        
        const typeData = redisMetadata[type];
        detailedMessage += `\n${type.toUpperCase()} Rate Limits (${typeData.activeKeys} active IPs):`;
        
        if (typeData.ips.length > 0) {
          typeData.ips.forEach((ipData: any) => {
            detailedMessage += `\n  - ${ipData.ip}: ${ipData.requestCount} requests, last activity: ${ipData.lastActivity}`;
          });
        } else {
          detailedMessage += `\n  No active IPs`;
        }
      });
      
      // Add blocked IPs
      if (redisMetadata.blockedIPs) {
        detailedMessage += `\n\nBLOCKED IPs (${redisMetadata.blockedIPs.totalBlocked} total):`;
        if (redisMetadata.blockedIPs.ips.length > 0) {
          redisMetadata.blockedIPs.ips.forEach((ipData: any) => {
            detailedMessage += `\n  - ${ipData.ip}: ${ipData.violations} violations, blocked until: ${ipData.blockedUntil}`;
          });
        } else {
          detailedMessage += `\n  No blocked IPs`;
        }
      }
    }
    
    detailedMessage = detailedMessage.trim();
    
    // Send the email alert with detailed information
    await sendEmailAlert(subject, detailedMessage);
    
    return NextResponse.json({
      success: true,
      message: 'Alert email sent successfully',
      alertData: { subject, message, data }
    });
    
  } catch (error) {
    console.error('Error sending alert email:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send alert email'
    }, { status: 500 });
  }
} 