process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE = 'test-service-role-key';

import { parseFilterValue, matchesFilter } from '@/lib/utils';
import { NextResponse } from 'next/server';

describe('spend API utility functions', () => {
  describe('parseFilterValue', () => {
    it('parses AND-separated terms', () => {
      expect(parseFilterValue('foo AND bar')).toEqual({ terms: ['foo', 'bar'], operator: 'AND' });
    });
    it('parses OR-separated terms', () => {
      expect(parseFilterValue('foo OR bar')).toEqual({ terms: ['foo', 'bar'], operator: 'OR' });
    });
    it('parses quoted terms', () => {
      expect(parseFilterValue('"foo bar" AND baz')).toEqual({ terms: ['foo bar', 'baz'], operator: 'AND' });
    });
    it('treats commas as AND', () => {
      expect(parseFilterValue('foo,bar')).toEqual({ terms: ['foo', 'bar'], operator: 'AND' });
    });
  });

  describe('matchesFilter', () => {
    it('matches all terms with AND', () => {
      const filter: { terms: string[]; operator: "AND" } = { terms: ['foo', 'bar'], operator: "AND" };
      expect(matchesFilter('foo bar baz', filter)).toBe(true);
      expect(matchesFilter('foo something', filter)).toBe(false);
    });
    it('matches any term with OR', () => {
      const filter: { terms: string[]; operator: "OR" } = { terms: ['foo', 'bar'], operator: "OR" };
      expect(matchesFilter('foo something', filter)).toBe(true);
      expect(matchesFilter('bar something', filter)).toBe(true);
      expect(matchesFilter('baz', filter)).toBe(false);
    });
  });
});

// --- New tests for budget view ---
jest.mock('@/lib/supabase', () => {
  // Helper to create a chainable mock query object
  function createMockQuery(data, error = null, count = null) {
    const mockQuery: any = {};
    const chain = () => mockQuery;
    
    // Add all the chainable methods that Supabase queries have
    mockQuery.select = chain;
    mockQuery.from = chain;
    mockQuery.eq = chain;
    mockQuery.neq = chain;
    mockQuery.gt = chain;
    mockQuery.gte = chain;
    mockQuery.lt = chain;
    mockQuery.lte = chain;
    mockQuery.like = chain;
    mockQuery.ilike = chain;
    mockQuery.or = chain;
    mockQuery.and = chain;
    mockQuery.not = chain;
    mockQuery.in = chain;
    mockQuery.notIn = chain;
    mockQuery.is = chain;
    mockQuery.isNot = chain;
    mockQuery.order = chain;
    mockQuery.orderBy = chain;
    mockQuery.range = chain;
    mockQuery.limit = chain;
    mockQuery.offset = chain;
    mockQuery.group = chain;
    mockQuery.groupBy = chain;
    mockQuery.having = chain;
    mockQuery.union = chain;
    mockQuery.intersect = chain;
    mockQuery.except = chain;
    mockQuery.returns = chain;
    mockQuery.single = chain;
    mockQuery.maybeSingle = chain;
    mockQuery.abortSignal = chain;
    mockQuery.onConflict = chain;
    mockQuery.upsert = chain;
    mockQuery.insert = chain;
    mockQuery.update = chain;
    mockQuery.delete = chain;
    mockQuery.rpc = chain;
    mockQuery.call = chain;
    mockQuery.filter = chain;
    mockQuery.match = chain;
    mockQuery.textSearch = chain;
    mockQuery.fullTextSearch = chain;
    mockQuery.contains = chain;
    mockQuery.containedBy = chain;
    mockQuery.rangeGt = chain;
    mockQuery.rangeGte = chain;
    mockQuery.rangeLt = chain;
    mockQuery.rangeLte = chain;
    mockQuery.rangeAdjacent = chain;
    mockQuery.overlaps = chain;
    
    // Add Promise methods
    mockQuery.then = (resolve) => Promise.resolve({ data, error, count: count || data?.length || 0 }).then(resolve);
    mockQuery.catch = (reject) => Promise.resolve({ data, error, count: count || data?.length || 0 }).catch(reject);
    mockQuery.finally = (cb) => Promise.resolve({ data, error, count: count || data?.length || 0 }).finally(cb);
    
    return mockQuery;
  }
  
  const mockSupabase = {
    from: jest.fn(() => createMockQuery([
      {
        fiscal_year: 2024,
        department_name: 'Test Dept',
        program_name: 'Test Program',
        fund_name: 'Test Fund',
        amount: 12345,
      },
    ])),
  };
  
  return {
    getServiceSupabase: () => mockSupabase,
  };
});

describe('spend API budget view', () => {
  it('returns paginated budget line items with correct fields', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=budget&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending[0]).toMatchObject({
      year: 2024,
      department: 'Test Dept',
      program: 'Test Program',
      fund: 'Test Fund',
      amount: 12345,
      vendor: 'Budget Allocation',
    });
    expect(json.pagination.totalItems).toBe(1);
  });

  // Add tests for error handling in budget view
  it('handles database errors in budget view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // Create a mock query that returns an error
    function createErrorMockQuery() {
      const mockQuery: any = {};
      const chain = () => mockQuery;
      mockQuery.select = chain;
      mockQuery.eq = chain;
      mockQuery.order = chain;
      mockQuery.range = chain;
      mockQuery.then = (resolve) => Promise.resolve({ 
        data: null, 
        error: { message: 'Database error' }, 
        count: 0 
      }).then(resolve);
      return mockQuery;
    }
    
    mockSupabase.from.mockReturnValue(createErrorMockQuery());

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=budget&department_code=123' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch budget data');
    expect(res.status).toBe(500);
  });

  it('handles total calculation errors in budget view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // First call returns data, second call (for totals) returns error
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call - return data
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.order = chain;
        mockQuery.range = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: [{ amount: 100 }], 
          error: null, 
          count: 1 
        }).then(resolve);
        return mockQuery;
      } else {
        // Second call - return error for totals
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: null, 
          error: { message: 'Total calculation error' }, 
          count: 0 
        }).then(resolve);
        return mockQuery;
      }
    });

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=budget&department_code=123' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to calculate budget totals');
    expect(res.status).toBe(500);
  });
});

// --- New tests for compare view ---
describe('spend API compare view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns department comparison data with correct structure', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=department&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    
    // Verify the response structure
    expect(json).toHaveProperty('spending');
    expect(json).toHaveProperty('pagination');
    expect(json).toHaveProperty('summary');
    
    // Verify pagination structure
    expect(json.pagination).toHaveProperty('currentPage');
    expect(json.pagination).toHaveProperty('totalPages');
    expect(json.pagination).toHaveProperty('totalItems');
    expect(json.pagination).toHaveProperty('itemsPerPage');
    expect(json.pagination).toHaveProperty('hasNextPage');
    expect(json.pagination).toHaveProperty('hasPrevPage');
    
    // Verify summary structure
    expect(json.summary).toHaveProperty('totalAmount');
    expect(json.summary).toHaveProperty('recordCount');
  });

  it('handles fund comparison correctly', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=fund&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
    expect(Array.isArray(json.spending)).toBe(true);
  });

  it('handles program comparison correctly', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=program&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
    expect(Array.isArray(json.spending)).toBe(true);
  });

  it('handles year filtering in compare view', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=department&year=2024&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles sorting in compare view', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=department&sort=vendorAmount&order=desc&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  // Add tests for error handling in compare view
  it('handles database errors in compare view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // Create a mock query that returns an error
    function createErrorMockQuery() {
      const mockQuery: any = {};
      const chain = () => mockQuery;
      mockQuery.select = chain;
      mockQuery.eq = chain;
      mockQuery.order = chain;
      mockQuery.range = chain;
      mockQuery.then = (resolve) => Promise.resolve({ 
        data: null, 
        error: { message: 'Compare query error' }, 
        count: 0 
      }).then(resolve);
      return mockQuery;
    }
    
    mockSupabase.from.mockReturnValue(createErrorMockQuery());

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch compare data');
    expect(res.status).toBe(500);
  });

  it('handles total calculation errors in compare view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // First call returns data, second call (for totals) returns error
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call - return data
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.order = chain;
        mockQuery.range = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: [{ vendor_amount: 100, budget_amount: 200 }], 
          error: null, 
          count: 1 
        }).then(resolve);
        return mockQuery;
      } else {
        // Second call - return error for totals
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: null, 
          error: { message: 'Total calculation error' }, 
          count: 0 
        }).then(resolve);
        return mockQuery;
      }
    });

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?view=compare&compareBy=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to calculate compare totals');
    expect(res.status).toBe(500);
  });
});

// --- New tests for vendor view ---
describe('spend API vendor view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles vendor view with year parameter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?year=2024&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
    expect(Array.isArray(json.spending)).toBe(true);
  });

  it('handles vendor view without year parameter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
    expect(Array.isArray(json.spending)).toBe(true);
  });

  it('handles vendor view with department filter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?department=Test&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles vendor view with department_code filter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?department_code=123&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles vendor view with vendor filter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?vendor=Test&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles vendor view with program filter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?program=Test&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles vendor view with fund filter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?fund=Test&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles different sorting options', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?sort=year&order=asc&page=1&limit=1' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles pagination parameters', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?page=2&limit=10&offset=20' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.pagination.currentPage).toBe(2);
    expect(json.pagination.itemsPerPage).toBe(10);
  });

  // Add tests for error handling in vendor view
  it('handles database errors in vendor view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // Create a mock query that returns an error
    function createErrorMockQuery() {
      const mockQuery: any = {};
      const chain = () => mockQuery;
      mockQuery.select = chain;
      mockQuery.eq = chain;
      mockQuery.order = chain;
      mockQuery.range = chain;
      mockQuery.then = (resolve) => Promise.resolve({ 
        data: null, 
        error: { message: 'Vendor query error' }, 
        count: 0 
      }).then(resolve);
      return mockQuery;
    }
    
    mockSupabase.from.mockReturnValue(createErrorMockQuery());

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?year=2024&department_code=123' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch vendor data');
    expect(res.status).toBe(500);
  });

  it('handles total calculation errors in vendor view', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    
    // First call returns data, second call (for totals) returns error
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call - return data
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.order = chain;
        mockQuery.range = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: [{ amount: 100 }], 
          error: null, 
          count: 1 
        }).then(resolve);
        return mockQuery;
      } else {
        // Second call - return error for totals
        const mockQuery: any = {};
        const chain = () => mockQuery;
        mockQuery.select = chain;
        mockQuery.eq = chain;
        mockQuery.then = (resolve) => Promise.resolve({ 
          data: null, 
          error: { message: 'Total calculation error' }, 
          count: 0 
        }).then(resolve);
        return mockQuery;
      }
    });

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?year=2024&department_code=123' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to calculate vendor totals');
    expect(res.status).toBe(500);
  });
});

// --- New tests for general error handling ---
describe('spend API general error handling', () => {
  it('handles general exceptions', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    mockSupabase.from.mockImplementation(() => {
      throw new Error('General error');
    });

    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch spending data');
    expect(res.status).toBe(500);
  });

  it('handles invalid year parameter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?year=invalid' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles invalid limit parameter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?limit=invalid' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });

  it('handles invalid page parameter', async () => {
    const { GET } = require('@/app/api/spend/route');
    const req = { url: 'http://localhost/api/spend?page=invalid' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.spending).toBeDefined();
  });
}); 