import { Redis } from '@upstash/redis';
import type { SetCommandOptions } from '@upstash/redis';

// Redis.fromEnv() will automatically read UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

export type CacheOptions = {
  ex?: number; // Expiration in seconds
  nx?: boolean; // Only set if the key doesn't exist
  tags?: string[]; // Tags for cache invalidation
};

/**
 * Get a value from the cache
 * @param key The cache key
 * @returns The cached value or null if not found
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set a value in the cache
 * @param key The cache key
 * @param value The value to cache
 * @param options Cache options including expiration and tags
 */
export async function setInCache<T>(
  key: string, 
  value: T, 
  options: CacheOptions = {}
): Promise<void> {
  try {
    const { tags, ...redisOptions } = options;
    // Use type assertion since the Upstash Redis types are more restrictive than the actual API
    const setOptions = {
      ex: redisOptions.ex,
      nx: redisOptions.nx ? true : undefined
    } as unknown as SetCommandOptions;
    
    await redis.set(key, value, setOptions);
    
    // If tags are provided, store key references for later invalidation
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await redis.sadd(`tag:${tag}`, key);
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Invalidate all cache entries with a specific tag
 * @param tag The tag to invalidate
 */
export async function invalidateByTag(tag: string): Promise<void> {
  try {
    // Get all keys with this tag
    const keys = await redis.smembers<string[]>(`tag:${tag}`);
    
    // Delete all keys
    if (keys && keys.length > 0) {
      await redis.del(...keys, `tag:${tag}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Delete a specific key from the cache
 * @param key The key to delete
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Check if a key exists in the cache
 * @param key The key to check
 * @returns True if the key exists
 */
export async function existsInCache(key: string): Promise<boolean> {
  try {
    return await redis.exists(key) === 1;
  } catch (error) {
    console.error('Cache exists check error:', error);
    return false;
  }
}

/**
 * Get multiple values from the cache
 * @param keys Array of keys to get
 * @returns Array of values, null for missing keys
 */
export async function mgetFromCache<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    const values = await redis.mget<T[]>(keys);
    return values.map(value => value ?? null);
  } catch (error) {
    console.error('Cache mget error:', error);
    return keys.map(() => null);
  }
}

/**
 * Set multiple values in the cache
 * @param entries Array of key-value pairs to set
 * @param options Cache options including expiration and tags
 */
export async function msetInCache<T>(
  entries: Array<{ key: string; value: T }>,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const { tags, ...redisOptions } = options;
    // Use type assertion since the Upstash Redis types are more restrictive than the actual API
    const setOptions = {
      ex: redisOptions.ex,
      nx: redisOptions.nx ? true : undefined
    } as unknown as SetCommandOptions;
    
    const pipeline = redis.pipeline();
    
    for (const { key, value } of entries) {
      pipeline.set(key, value, setOptions);
      
      // If tags are provided, store key references
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          pipeline.sadd(`tag:${tag}`, key);
        }
      }
    }
    
    await pipeline.exec();
  } catch (error) {
    console.error('Cache mset error:', error);
  }
} 