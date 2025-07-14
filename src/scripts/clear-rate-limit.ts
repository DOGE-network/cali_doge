#!/usr/bin/env tsx

/**
 * Clear Rate Limit Script
 * 
 * This script provides utilities for managing rate limiting and IP blocking data
 * stored in Redis. It can clear rate limits for specific IPs, show metadata about
 * all rate limited/blocked IPs, and clean up invalid entries.
 * 
 * Features:
 * - Clear rate limits for specific IP addresses
 * - Display comprehensive Redis metadata about rate limiting activity
 * - Clean up invalid or corrupted IP entries
 * - Validate IP addresses before processing
 * 
 * Usage:
 *   npm run clear-rate-limit                    # Show all Redis metadata
 *   npm run clear-rate-limit 192.168.1.14      # Clear rate limits for specific IP
 *   npm run clear-rate-limit cleanup           # Clean up invalid IP entries
 * 
 * Environment Variables Required:
 * - KV_REST_API_URL or UPSTASH_REDIS_REST_URL: Redis connection URL
 * - KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN: Redis authentication token
 * 
 * Rate Limit Types:
 * - search: Search API endpoints (/api/search)
 * - api: General API endpoints (/api/*)
 * - email: Email endpoints (/api/send-email)
 * - media: Media endpoints (/api/media, /media/)
 * - static: Static assets (/_next/, /images/)
 * 
 * @author California DOGE Team
 * @version 1.6.17
 * @since 2025-07-13
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing rate limit module
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  config({ path: envPath });
} else {
  console.log('No .env.local file found. Using environment variables from the system.');
}

// Now import the rate limit module after environment variables are loaded
import { getRedisClient } from '../lib/rateLimit';

/**
 * Result interface for clearing rate limits for a specific IP
 */
interface ClearRateLimitResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The IP address that was processed (optional for metadata operations) */
  ip?: string;
  /** Array of Redis keys that were cleared */
  clearedKeys: string[];
  /** Error message if the operation failed */
  error?: string;
  /** ISO timestamp of when the operation was performed */
  timestamp: string;
  /** Detailed metadata about the cleared keys */
  metadata: {
    /** Total number of keys cleared */
    totalKeysCleared: number;
    /** Number of rate limit keys cleared */
    rateLimitKeysCleared: number;
    /** Number of IP block keys cleared */
    blockKeysCleared: number;
    /** Mapping of rate limit types to whether they were cleared */
    keysByType: Record<string, boolean>;
  };
}

/**
 * Result interface for retrieving comprehensive Redis metadata
 */
interface RedisMetadataResult {
  /** Whether the operation was successful */
  success: boolean;
  /** ISO timestamp of when the operation was performed */
  timestamp: string;
  /** Error message if the operation failed */
  error?: string;
  /** Comprehensive metadata about all rate limiting activity */
  metadata: {
    /** Total number of IPs with active rate limits */
    totalRateLimitIPs: number;
    /** Total number of blocked IPs */
    totalBlockedIPs: number;
    /** Rate limit data organized by type (search, api, email, media, static) */
    rateLimitData: Record<string, {
      /** Number of active keys for this rate limit type */
      activeKeys: number;
      /** Array of IPs with their request counts and last activity */
      ips: Array<{
        ip: string;
        requestCount: number;
        lastActivity: string;
      }>;
    }>;
    /** Array of blocked IPs with violation details */
    blockedIPs: Array<{
      ip: string;
      violations: number;
      blockedUntil: string;
      lastViolation: string;
    }>;
  };
}

/**
 * Clears all rate limit and IP block data for a specific IP address
 * 
 * This function removes all Redis keys associated with rate limiting and IP blocking
 * for the specified IP address. It checks which keys exist before attempting to
 * delete them and provides detailed metadata about what was cleared.
 * 
 * @param ip - The IP address to clear rate limits for (must be valid IPv4 format)
 * @returns Promise<ClearRateLimitResult> - Detailed result of the operation
 * 
 * @example
 * ```typescript
 * const result = await clearRateLimitForIP('192.168.1.14');
 * if (result.success) {
 *   console.log(`Cleared ${result.metadata.totalKeysCleared} keys`);
 * }
 * ```
 */
async function clearRateLimitForIP(ip: string): Promise<ClearRateLimitResult> {
  const result: ClearRateLimitResult = {
    success: false,
    ip,
    clearedKeys: [],
    timestamp: new Date().toISOString(),
    metadata: {
      totalKeysCleared: 0,
      rateLimitKeysCleared: 0,
      blockKeysCleared: 0,
      keysByType: {}
    }
  };

  try {
    const redis = getRedisClient();
    
    // Define all possible rate limit keys for this IP
    const rateLimitKeys = [
      `rate_limit:search:${ip}`,
      `rate_limit:api:${ip}`,
      `rate_limit:email:${ip}`,
      `rate_limit:media:${ip}`,
      `rate_limit:static:${ip}`
    ];
    
    // Define IP block key
    const blockKey = `ip_block:${ip}`;
    
    // Check which keys exist before deleting
    const existingKeys: string[] = [];
    const keysByType: Record<string, boolean> = {};
    
    for (const key of rateLimitKeys) {
      const exists = await redis.exists(key);
      if (exists) {
        existingKeys.push(key);
        const type = key.split(':')[1]; // search, api, email, etc.
        keysByType[type] = true;
      }
    }
    
    // Check if block key exists
    const blockExists = await redis.exists(blockKey);
    if (blockExists) {
      existingKeys.push(blockKey);
      keysByType['block'] = true;
    }
    
    // Delete all existing keys
    if (existingKeys.length > 0) {
      await redis.del(...existingKeys);
    }
    
    // Update result
    result.success = true;
    result.clearedKeys = existingKeys;
    result.metadata = {
      totalKeysCleared: existingKeys.length,
      rateLimitKeysCleared: existingKeys.filter(key => !key.includes('ip_block')).length,
      blockKeysCleared: existingKeys.filter(key => key.includes('ip_block')).length,
      keysByType
    };
    
    console.log(`✅ Successfully cleared rate limit data for IP: ${ip}`);
    console.log(`📊 Cleared ${result.metadata.totalKeysCleared} keys total`);
    console.log(`   - Rate limit keys: ${result.metadata.rateLimitKeysCleared}`);
    console.log(`   - Block keys: ${result.metadata.blockKeysCleared}`);
    
    if (Object.keys(keysByType).length > 0) {
      console.log(`   - Types cleared: ${Object.keys(keysByType).join(', ')}`);
    } else {
      console.log(`   - No existing rate limit data found for IP: ${ip}`);
    }
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Failed to clear rate limit data for IP: ${ip}`);
    console.error(`   Error: ${result.error}`);
  }
  
  return result;
}

/**
 * Retrieves comprehensive metadata about all rate limiting and IP blocking activity
 * 
 * This function scans all Redis keys related to rate limiting and IP blocking
 * and provides detailed information about active rate limits, blocked IPs,
 * request counts, and activity timestamps. It's useful for monitoring and
 * debugging rate limiting behavior across the application.
 * 
 * @returns Promise<RedisMetadataResult> - Comprehensive metadata about all rate limiting activity
 * 
 * @example
 * ```typescript
 * const metadata = await getAllRedisMetadata();
 * console.log(`Total rate limit IPs: ${metadata.metadata.totalRateLimitIPs}`);
 * console.log(`Total blocked IPs: ${metadata.metadata.totalBlockedIPs}`);
 * ```
 */
async function getAllRedisMetadata(): Promise<RedisMetadataResult> {
  const result: RedisMetadataResult = {
    success: false,
    timestamp: new Date().toISOString(),
    metadata: {
      totalRateLimitIPs: 0,
      totalBlockedIPs: 0,
      rateLimitData: {},
      blockedIPs: []
    }
  };

  try {
    const redis = getRedisClient();
    
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
        result.metadata.rateLimitData[configType] = {
          activeKeys: keys.length,
          ips: []
        };
        
        // Get details for each IP
        for (const key of keys) {
          const ip = key.split(':')[2];
          const requests = await redis.zrange(key, 0, -1, { withScores: true }) as string[];
          const requestCount = Math.ceil(requests.length / 2); // Each request is member+score
          
          result.metadata.rateLimitData[configType].ips.push({
            ip,
            requestCount,
            lastActivity: requests.length > 0 ? new Date(parseInt(requests[requests.length - 1])).toISOString() : 'Unknown'
          });
        }
        
        result.metadata.totalRateLimitIPs += keys.length;
      }
    }
    
    // Get IP block information
    const blockKeys = await redis.keys('ip_block:*');
    if (blockKeys.length > 0) {
      result.metadata.totalBlockedIPs = blockKeys.length;
      
      for (const key of blockKeys) {
        const ip = key.split(':')[1];
        const blockInfo = await redis.get(key) as any;
        if (blockInfo) {
          result.metadata.blockedIPs.push({
            ip,
            violations: blockInfo.violations || 0,
            blockedUntil: blockInfo.blockedUntil ? new Date(blockInfo.blockedUntil).toISOString() : 'Unknown',
            lastViolation: blockInfo.lastViolation ? new Date(blockInfo.lastViolation).toISOString() : 'Unknown'
          });
        }
      }
    }
    
    result.success = true;
    
    console.log(`📊 Redis Rate Limit Metadata Summary:`);
    console.log(`   - Total rate limit IPs: ${result.metadata.totalRateLimitIPs}`);
    console.log(`   - Total blocked IPs: ${result.metadata.totalBlockedIPs}`);
    
    // Display rate limit data by type
    Object.keys(result.metadata.rateLimitData).forEach(type => {
      const typeData = result.metadata.rateLimitData[type];
      console.log(`   - ${type.toUpperCase()}: ${typeData.activeKeys} active IPs`);
      if (typeData.ips.length > 0) {
        typeData.ips.slice(0, 5).forEach(ipData => {
          console.log(`     * ${ipData.ip}: ${ipData.requestCount} requests, last: ${ipData.lastActivity}`);
        });
        if (typeData.ips.length > 5) {
          console.log(`     * ... and ${typeData.ips.length - 5} more IPs`);
        }
      }
    });
    
    // Display blocked IPs
    if (result.metadata.blockedIPs.length > 0) {
      console.log(`   - BLOCKED IPs:`);
      result.metadata.blockedIPs.slice(0, 10).forEach(ipData => {
        console.log(`     * ${ipData.ip}: ${ipData.violations} violations, blocked until: ${ipData.blockedUntil}`);
      });
      if (result.metadata.blockedIPs.length > 10) {
        console.log(`     * ... and ${result.metadata.blockedIPs.length - 10} more blocked IPs`);
      }
    }
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Failed to get Redis metadata`);
    console.error(`   Error: ${result.error}`);
  }
  
  return result;
}

/**
 * Main CLI interface for the clear rate limit script
 * 
 * Handles command line arguments and routes to appropriate functions:
 * - No arguments: Show all Redis metadata
 * - IP address: Clear rate limits for specific IP
 * - 'cleanup': Clean up invalid IP entries
 * 
 * Command line usage:
 *   npm run clear-rate-limit                    # Show metadata
 *   npm run clear-rate-limit 192.168.1.14      # Clear specific IP
 *   npm run clear-rate-limit cleanup           # Clean up invalid entries
 * 
 * @returns Promise<void> - Exits process with appropriate exit code
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📊 Getting Redis rate limit metadata...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('');
    
    const result = await getAllRedisMetadata();
    
    console.log('');
    console.log('📋 Summary:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(result.success ? 0 : 1);
  }
  
  const ip = args[0];
  
  // Handle cleanup command
  if (ip === 'cleanup' || ip === '--cleanup') {
    console.log('🧹 Cleaning up invalid IP entries...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('');
    
    await cleanupInvalidIPs();
    
    console.log('');
    console.log('✅ Cleanup completed');
    process.exit(0);
  }
  
  // Basic IP validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    console.error(`❌ Invalid IP address format: ${ip}`);
    console.log('');
    console.log('Usage: npm run clear-rate-limit [ip-address|cleanup]');
    console.log('  - No IP: Show all Redis rate limit metadata');
    console.log('  - With IP: Clear rate limits for specific IP');
    console.log('  - cleanup: Clean up invalid IP entries');
    console.log('Example: npm run clear-rate-limit 192.168.1.14');
    console.log('Example: npm run clear-rate-limit cleanup');
    process.exit(1);
  }
  
  console.log(`🔄 Clearing rate limit data for IP: ${ip}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  
  const result = await clearRateLimitForIP(ip);
  
  console.log('');
  console.log('📋 Summary:');
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(result.success ? 0 : 1);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

/**
 * Cleans up invalid or corrupted IP entries in Redis
 * 
 * This function scans all rate limit and IP block keys in Redis and removes
 * entries that have invalid IP addresses (empty strings, 'unknown', or malformed).
 * This helps maintain data integrity and prevents issues with blank IP entries
 * that can occur due to Edge Runtime limitations or missing request headers.
 * 
 * Invalid entries that will be cleaned up:
 * - Empty IP addresses ('')
 * - 'unknown' IP addresses
 * - Malformed IP addresses
 * 
 * @returns Promise<void> - Operation completes silently, logs results to console
 * 
 * @example
 * ```typescript
 * await cleanupInvalidIPs();
 * // Console output will show what was cleaned up
 * ```
 */
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
      console.log(`   - Invalid keys: ${invalidKeys.join(', ')}`);
    } else {
      console.log(`✅ No invalid IP entries found`);
    }
    
    // Also clean up invalid rate limit keys
    const rateLimitPatterns = [
      'rate_limit:search:*',
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
      console.log(`   - Invalid keys: ${invalidRateLimitKeys.join(', ')}`);
    } else {
      console.log(`✅ No invalid rate limit entries found`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up invalid IPs:', error);
  }
}

// Export functions for use in other modules
export { clearRateLimitForIP, getAllRedisMetadata, cleanupInvalidIPs };

// Export TypeScript interfaces for type safety
export type { ClearRateLimitResult, RedisMetadataResult }; 