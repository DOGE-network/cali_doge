// Mock the Redis client before importing the cache module
const mockPipeline = {
  set: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  exec: jest.fn()
};
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  mget: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
  pipeline: jest.fn(() => mockPipeline)
};

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn(() => mockRedis)
  }
}));

// Now import the cache functions
import { 
  getFromCache, 
  setInCache, 
  deleteFromCache, 
  existsInCache, 
  mgetFromCache, 
  msetInCache, 
  invalidateByTag 
} from '@/lib/cache';

describe('Cache functionality', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.mget.mockResolvedValue([null, null]);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockPipeline.set.mockReturnThis();
    mockPipeline.sadd.mockReturnThis();
    mockPipeline.exec.mockResolvedValue([]);
    mockRedis.pipeline.mockReturnValue(mockPipeline);
  });

  describe('getFromCache', () => {
    it('should retrieve data correctly', async () => {
      const testData = { test: 'data' };
      mockRedis.get.mockResolvedValue(testData);

      const result = await getFromCache('test-key');
      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent keys', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getFromCache('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await getFromCache('error-key');
      expect(result).toBeNull();
    });
  });

  describe('setInCache', () => {
    it('should store data correctly', async () => {
      const testData = { test: 'data' };
      mockRedis.set.mockResolvedValue('OK');

      await setInCache('test-key', testData, { ex: 60 });
      
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', testData, {
        ex: 60,
        nx: undefined
      });
    });

    it('should handle tags correctly', async () => {
      const testData = { test: 'data' };
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      await setInCache('test-key', testData, { ex: 60, tags: ['tag1', 'tag2'] });
      
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', testData, {
        ex: 60,
        nx: undefined
      });
      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:tag1', 'test-key');
      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:tag2', 'test-key');
    });

    it('should handle nx option correctly', async () => {
      const testData = { test: 'data' };
      mockRedis.set.mockResolvedValue('OK');

      await setInCache('test-key', testData, { ex: 60, nx: true });
      
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', testData, {
        ex: 60,
        nx: true
      });
    });

    it('should handle errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(setInCache('error-key', 'data')).resolves.toBeUndefined();
    });
  });

  describe('deleteFromCache', () => {
    it('should delete data correctly', async () => {
      mockRedis.del.mockResolvedValue(1);

      await deleteFromCache('test-key');
      
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(deleteFromCache('error-key')).resolves.toBeUndefined();
    });
  });

  describe('existsInCache', () => {
    it('should return true for existing keys', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await existsInCache('existing-key');
      
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('existing-key');
    });

    it('should return false for non-existent keys', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await existsInCache('non-existent-key');
      
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      const result = await existsInCache('error-key');
      expect(result).toBe(false);
    });
  });

  describe('mgetFromCache', () => {
    it('should retrieve multiple values correctly', async () => {
      const testValues = ['value1', 'value2', 'value3'];
      mockRedis.mget.mockResolvedValue(testValues);

      const result = await mgetFromCache(['key1', 'key2', 'key3']);
      
      expect(result).toEqual(testValues);
      expect(mockRedis.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('should handle missing keys correctly', async () => {
      mockRedis.mget.mockResolvedValue(['value1', null, 'value3']);

      const result = await mgetFromCache(['key1', 'key2', 'key3']);
      
      expect(result).toEqual(['value1', null, 'value3']);
    });

    it('should handle errors gracefully', async () => {
      mockRedis.mget.mockRejectedValue(new Error('Redis error'));

      const result = await mgetFromCache(['key1', 'key2']);
      expect(result).toEqual([null, null]);
    });
  });

  describe('msetInCache', () => {
    it('should store multiple values correctly', async () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      await msetInCache(entries, { ex: 60 });
      
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1', {
        ex: 60,
        nx: undefined
      });
      expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2', {
        ex: 60,
        nx: undefined
      });
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle tags correctly', async () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([]);

      await msetInCache(entries, { ex: 60, tags: ['tag1'] });
      
      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:tag1', 'key1');
      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:tag1', 'key2');
    });

    it('should handle errors gracefully', async () => {
      const entries = [{ key: 'key1', value: 'value1' }];
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(msetInCache(entries)).resolves.toBeUndefined();
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate cache entries by tag', async () => {
      const taggedKeys = ['key1', 'key2'];
      mockRedis.smembers.mockResolvedValue(taggedKeys);
      mockRedis.del.mockResolvedValue(3); // 2 keys + 1 tag set

      await invalidateByTag('test-tag');
      
      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:test-tag');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'tag:test-tag');
    });

    it('should handle empty tag sets', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      await invalidateByTag('empty-tag');
      
      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:empty-tag');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(invalidateByTag('error-tag')).resolves.toBeUndefined();
    });
  });
}); 