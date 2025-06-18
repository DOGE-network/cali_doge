// Mock environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

import { departments, vendors, search, funds, programs } from '@/lib/api/dataAccess';
import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache } from '@/lib/cache';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/cache');

/**
 * Helper to create a chainable mock that returns a promise when awaited.
 * All methods return a function for chaining, and when awaited, it resolves to the provided value.
 * If a spies object is provided, tracked methods will call the spy.
 */
function createChainableMock(resolvedValue: any, spies: Record<string, jest.Mock> = {}) {
  const handler = {
    get(target: any, prop: string) {
      if (prop === 'then') {
        return (...args: any[]) => Promise.resolve(resolvedValue).then(...args);
      }
      if (spies[prop]) {
        return (...args: any[]) => {
          spies[prop](...args);
          return proxy;
        };
      }
      return (..._args: any[]) => proxy;
    }
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

describe('Data Access Layer', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      textSearch: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };
    (getServiceSupabase as jest.Mock).mockReturnValue(mockSupabase);
    (getFromCache as jest.Mock).mockResolvedValue(null);
    (setInCache as jest.Mock).mockResolvedValue(undefined);
  });

  describe('DepartmentAccess', () => {
    it('should get all departments', async () => {
      const mockData = [{ id: 1, name: 'Test Dept' }];
      mockSupabase.select.mockReturnValue(createChainableMock({ data: mockData, error: null }));
      const result = await departments.getDepartments();
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('departments');
    });

    it('should get department by code', async () => {
      const mockData = { id: 1, name: 'Test Dept' };
      const eqSpy = jest.fn();
      const singleSpy = jest.fn();
      mockSupabase.select.mockReturnValue(
        createChainableMock({ data: mockData, error: null }, { eq: eqSpy, single: singleSpy })
      );
      const result = await departments.getDepartmentByCode('TEST123');
      expect(result).toEqual(mockData);
      expect(eqSpy).toHaveBeenCalledWith('organizational_code', 'TEST123');
    });

    it('should throw if supabase returns error', async () => {
      mockSupabase.select.mockReturnValue(createChainableMock({ data: null, error: new Error('fail') }));
      await expect(departments.getDepartments()).rejects.toThrow('fail');
    });

    it('should return cached data if present', async () => {
      const cached = [{ id: 2, name: 'Cached Dept' }];
      (getFromCache as jest.Mock).mockResolvedValueOnce(cached);
      const result = await departments.getDepartments();
      expect(result).toBe(cached);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('VendorAccess', () => {
    it('should get vendors with filters', async () => {
      const mockData = [{ id: 1, name: 'Test Vendor' }];
      const orderSpy = jest.fn();
      const limitSpy = jest.fn();
      mockSupabase.select.mockReturnValue(createChainableMock(
        { data: mockData, error: null },
        { order: orderSpy, limit: limitSpy }
      ));
      const result = await vendors.getVendors({
        fiscalYear: 2024,
        sortBy: 'total_amount',
        limit: 5
      });
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('vendors');
      expect(orderSpy).toHaveBeenCalledWith('total_amount', { ascending: false });
      expect(limitSpy).toHaveBeenCalledWith(5);
    });
  });

  describe('SearchAccess', () => {
    it('should perform search with options', async () => {
      const mockData = [{ id: 1, type: 'department', name: 'Test' }];
      const textSearchSpy = jest.fn();
      mockSupabase.select.mockReturnValue(
        createChainableMock({ data: mockData, error: null }, { textSearch: textSearchSpy })
      );
      const result = await search.search('test', {
        types: ['department'],
        limit: 5
      });
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('search_index');
      expect(textSearchSpy).toHaveBeenCalledWith('fts', 'test', {
        type: 'websearch',
        config: 'english'
      });
    });
  });

  describe('FundAccess', () => {
    it('should get funds with filters', async () => {
      const mockData = [{ id: 1, name: 'Test Fund' }];
      const eqSpy = jest.fn();
      mockSupabase.select.mockReturnValue(createChainableMock({ data: mockData, error: null }, { eq: eqSpy }));
      const result = await funds.getFunds({
        fundGroup: 'GENERAL',
        fiscalYear: 2024
      });
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('funds');
      expect(eqSpy).toHaveBeenCalledWith('fund_group', 'GENERAL');
    });
  });

  describe('ProgramAccess', () => {
    it('should get programs with filters', async () => {
      const mockData = [{ id: 1, name: 'Test Program' }];
      const eqSpy = jest.fn();
      mockSupabase.select.mockReturnValue(createChainableMock({ data: mockData, error: null }, { eq: eqSpy }));
      const result = await programs.getPrograms({
        departmentCode: 'DEPT1',
        fiscalYear: 2024
      });
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('programs');
      expect(eqSpy).toHaveBeenCalledWith('department_code', 'DEPT1');
    });
  });
}); 