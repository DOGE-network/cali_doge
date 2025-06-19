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
  const mockQuery = {
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };
  const mockPromise = Promise.resolve({
    data: [
      {
        fiscal_year: 2024,
        department_name: 'Test Dept',
        program_name: 'Test Program',
        fund_name: 'Test Fund',
        amount: 12345,
      },
    ],
    error: null,
    count: 1,
  });
  Object.defineProperty(mockQuery, 'then', { value: mockPromise.then.bind(mockPromise) });
  Object.defineProperty(mockQuery, 'catch', { value: mockPromise.catch.bind(mockPromise) });
  Object.defineProperty(mockQuery, 'finally', { value: mockPromise.finally.bind(mockPromise) });
  return {
    getServiceSupabase: () => ({
      from: jest.fn(() => mockQuery),
    }),
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
}); 