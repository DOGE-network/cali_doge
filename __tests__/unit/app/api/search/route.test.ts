import { NextResponse } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/api/dataAccess', () => ({
  search: {
    search: jest.fn()
  }
}));

jest.mock('@/lib/fuzzyMatching', () => ({
  fuzzyMatch: jest.fn(),
  formatMatchResult: jest.fn()
}));

jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            then: jest.fn((resolve) => Promise.resolve({
              data: [
                {
                  term: 'Test Department',
                  source_id: '123',
                  type: 'department',
                  additional_data: { context: 'Test context' }
                }
              ],
              error: null
            }).then(resolve))
          }))
        }))
      }))
    }))
  }))
}));

describe('Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock for search function
    const { search } = require('@/lib/api/dataAccess');
    search.search.mockResolvedValue([
      {
        term: 'Test Department',
        source_id: '123',
        type: 'department',
        additional_data: { context: 'Test context' }
      }
    ]);
    
    // Set up default mock for fuzzy matching
    const { fuzzyMatch, formatMatchResult } = require('@/lib/fuzzyMatching');
    fuzzyMatch.mockReturnValue({
      score: 0.8,
      confidence: 'high',
      algorithm: 'exact',
      matchType: 'exact'
    });
    formatMatchResult.mockReturnValue('🟢 80% via exact match');
  });

  it('returns search results for valid query', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&types=department&limit=5' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json).toHaveProperty('departments');
    expect(json).toHaveProperty('vendors');
    expect(json).toHaveProperty('programs');
    expect(json).toHaveProperty('funds');
    expect(json).toHaveProperty('keywords');
    expect(json).toHaveProperty('totalResults');
    expect(json).toHaveProperty('query');
    expect(json).toHaveProperty('appliedFilters');
  });

  it('handles empty query by returning all entries', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?types=department&limit=5' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.departments).toBeDefined();
    expect(Array.isArray(json.departments)).toBe(true);
  });

  it('handles multiple search types', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&types=department,vendor&limit=5' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.departments).toBeDefined();
    expect(json.vendors).toBeDefined();
  });

  it('respects limit parameter', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&limit=3' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.appliedFilters.limit).toBe(3);
  });

  it('handles exclude_common parameter', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&exclude_common=true' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.appliedFilters.excludeCommon).toBe(true);
  });

  it('handles database errors gracefully', async () => {
    const { search } = require('@/lib/api/dataAccess');
    search.search.mockRejectedValue(new Error('Database error'));

    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&types=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to perform search.');
    expect(res.status).toBe(500);
  });

  it('handles general exceptions', async () => {
    const { search } = require('@/lib/api/dataAccess');
    search.search.mockImplementation(() => {
      throw new Error('General error');
    });

    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&types=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to perform search.');
  });

  it('normalizes search terms correctly', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=  TEST  &types=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.query).toBe('  test  '); // The API preserves the original query format
  });

  it('handles invalid limit parameter', async () => {
    const { GET } = require('@/app/api/search/route');
    const req = { url: 'http://localhost/api/search?q=test&limit=invalid&types=department' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.appliedFilters.limit).toBe(null); // NaN is serialized as null in JSON
  });
}); 