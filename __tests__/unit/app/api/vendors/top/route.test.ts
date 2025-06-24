process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-role-key';

import { NextResponse } from 'next/server';

// Mock the Supabase client
const mockQuery = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
};

const mockSupabaseResponse = {
  data: [
    {
      vendor_name: 'Test Vendor 1',
      total_amount: 1000000,
      transaction_count: 150,
      years: [2023, 2024],
      departments: ['DEPT001', 'DEPT002'],
      programs: ['PROG001', 'PROG002'],
      funds: ['FUND001', 'FUND002'],
      categories: ['Category 1', 'Category 2'],
      descriptions: ['Description 1', 'Description 2']
    },
    {
      vendor_name: 'Test Vendor 2',
      total_amount: 500000,
      transaction_count: 75,
      years: [2024],
      departments: ['DEPT003'],
      programs: ['PROG003'],
      funds: ['FUND003'],
      categories: ['Category 3'],
      descriptions: ['Description 3']
    }
  ],
  error: null,
  count: 2
};

const mockPromise = Promise.resolve(mockSupabaseResponse);
Object.defineProperty(mockQuery, 'then', { value: mockPromise.then.bind(mockPromise) });
Object.defineProperty(mockQuery, 'catch', { value: mockPromise.catch.bind(mockPromise) });
Object.defineProperty(mockQuery, 'finally', { value: mockPromise.finally.bind(mockPromise) });

jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: jest.fn(() => mockQuery),
  }),
}));

describe('vendors top API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vendors/top', () => {
    it('returns vendors with correct structure', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?limit=10' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Verify response structure
      expect(json).toHaveProperty('vendors');
      expect(json).toHaveProperty('pagination');
      expect(json).toHaveProperty('summary');

      // Verify vendors structure
      expect(Array.isArray(json.vendors)).toBe(true);
      expect(json.vendors[0]).toHaveProperty('vendor');
      expect(json.vendors[0]).toHaveProperty('totalAmount');
      expect(json.vendors[0]).toHaveProperty('transactionCount');
      expect(json.vendors[0]).toHaveProperty('years');
      expect(json.vendors[0]).toHaveProperty('departments');
      expect(json.vendors[0]).toHaveProperty('programs');
      expect(json.vendors[0]).toHaveProperty('funds');
      expect(json.vendors[0]).toHaveProperty('categories');
      expect(json.vendors[0]).toHaveProperty('descriptions');

      // Verify pagination structure
      expect(json.pagination).toHaveProperty('currentPage');
      expect(json.pagination).toHaveProperty('totalPages');
      expect(json.pagination).toHaveProperty('totalItems');
      expect(json.pagination).toHaveProperty('itemsPerPage');
      expect(json.pagination).toHaveProperty('hasNextPage');
      expect(json.pagination).toHaveProperty('hasPrevPage');

      // Verify summary structure
      expect(json.summary).toHaveProperty('totalAmount');
      expect(json.summary).toHaveProperty('vendorCount');
      expect(json.summary).toHaveProperty('year');
      expect(json.summary).toHaveProperty('availableYears');
    });

    it('handles default parameters correctly', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      expect(json.pagination.currentPage).toBe(1);
      expect(json.pagination.itemsPerPage).toBe(100);
      expect(json.summary.year).toBe(0); // All years
    });

    it('handles custom pagination parameters', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?page=2&limit=5' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      expect(json.pagination.currentPage).toBe(2);
      expect(json.pagination.itemsPerPage).toBe(5);
    });

    it('handles sorting by totalAmount', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?sort=totalAmount&order=desc' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();
      expect(json.vendors).toBeDefined();
      expect(Array.isArray(json.vendors)).toBe(true);
    });

    it('handles sorting by transactionCount', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?sort=transactionCount&order=asc' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();
      expect(json.vendors).toBeDefined();
      expect(Array.isArray(json.vendors)).toBe(true);
    });

    it('handles sorting by vendor name', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?sort=vendor&order=asc' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();
      expect(json.vendors).toBeDefined();
      expect(Array.isArray(json.vendors)).toBe(true);
    });

    it('handles text filtering', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?filter=Test Vendor' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();
      expect(json.vendors).toBeDefined();
      expect(Array.isArray(json.vendors)).toBe(true);
    });

    it('filters out null values from arrays', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?limit=1' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Check that arrays don't contain null values
      const vendor = json.vendors[0];
      expect(Array.isArray(vendor.departments)).toBe(true);
      expect(Array.isArray(vendor.programs)).toBe(true);
      expect(Array.isArray(vendor.funds)).toBe(true);
      expect(Array.isArray(vendor.categories)).toBe(true);
      expect(Array.isArray(vendor.descriptions)).toBe(true);

      // Verify no nulls in arrays
      expect(vendor.departments.every(item => item !== null)).toBe(true);
      expect(vendor.programs.every(item => item !== null)).toBe(true);
      expect(vendor.funds.every(item => item !== null)).toBe(true);
      expect(vendor.categories.every(item => item !== null)).toBe(true);
      expect(vendor.descriptions.every(item => item !== null)).toBe(true);
    });

    it('calculates summary statistics correctly', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Total amount should be sum of all vendors
      const expectedTotal = 1000000 + 500000;
      expect(json.summary.totalAmount).toBe(expectedTotal);

      // Vendor count should match number of vendors
      expect(json.summary.vendorCount).toBe(2);
    });

    it('handles pagination metadata correctly', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?limit=1' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      expect(json.pagination.totalItems).toBe(2);
      expect(json.pagination.totalPages).toBe(2);
      expect(json.pagination.hasNextPage).toBe(true);
      expect(json.pagination.hasPrevPage).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error for invalid sort column', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?sort=invalidColumn' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      expect(res.status).toBe(400);
      
      const json = await res.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid sort column');
    });

    it('handles Supabase errors gracefully', async () => {
      // Mock Supabase error
      const mockErrorResponse = {
        data: null,
        error: { message: 'Database connection failed' },
        count: null
      };
      
      const mockErrorPromise = Promise.resolve(mockErrorResponse);
      const mockErrorQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };
      
      Object.defineProperty(mockErrorQuery, 'then', { value: mockErrorPromise.then.bind(mockErrorPromise) });
      Object.defineProperty(mockErrorQuery, 'catch', { value: mockErrorPromise.catch.bind(mockErrorPromise) });
      Object.defineProperty(mockErrorQuery, 'finally', { value: mockErrorPromise.finally.bind(mockErrorPromise) });

      const mockSupabase = require('@/lib/supabase');
      mockSupabase.getServiceSupabase = () => ({
        from: jest.fn(() => mockErrorQuery),
      });

      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      expect(res.status).toBe(500);
      
      const json = await res.json();
      expect(json).toHaveProperty('error');
      expect(json.error).toBe('Internal server error');
      expect(json).toHaveProperty('vendors');
      expect(json).toHaveProperty('pagination');
      expect(json).toHaveProperty('summary');
    });

    it('returns valid error response structure', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?sort=invalidColumn' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // For invalid sort column, API returns only error message
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid sort column');
      
      // The API doesn't return vendors/pagination/summary for validation errors
      // This is the correct behavior - only return error message for client errors
    });

    it('returns full error response structure for server errors', async () => {
      // Mock Supabase error for server error test
      const mockErrorResponse = {
        data: null,
        error: { message: 'Database connection failed' },
        count: null
      };
      
      const mockErrorPromise = Promise.resolve(mockErrorResponse);
      const mockErrorQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };
      
      Object.defineProperty(mockErrorQuery, 'then', { value: mockErrorPromise.then.bind(mockErrorPromise) });
      Object.defineProperty(mockErrorQuery, 'catch', { value: mockErrorPromise.catch.bind(mockErrorPromise) });
      Object.defineProperty(mockErrorQuery, 'finally', { value: mockErrorPromise.finally.bind(mockErrorPromise) });

      const mockSupabase = require('@/lib/supabase');
      mockSupabase.getServiceSupabase = () => ({
        from: jest.fn(() => mockErrorQuery),
      });

      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Server errors return full structure with empty data
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('vendors');
      expect(json).toHaveProperty('pagination');
      expect(json).toHaveProperty('summary');

      // Arrays should be empty in error case
      expect(Array.isArray(json.vendors)).toBe(true);
      expect(json.vendors.length).toBe(0);

      // Pagination should have default values
      expect(json.pagination.currentPage).toBe(1);
      expect(json.pagination.totalPages).toBe(0);
      expect(json.pagination.totalItems).toBe(0);
      expect(json.pagination.hasNextPage).toBe(false);
      expect(json.pagination.hasPrevPage).toBe(false);

      // Summary should have default values
      expect(json.summary.totalAmount).toBe(0);
      expect(json.summary.vendorCount).toBe(0);
      expect(json.summary.year).toBe(0);
      expect(Array.isArray(json.summary.availableYears)).toBe(true);
    });
  });

  describe('parameter validation', () => {
    it('handles missing parameters with defaults', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Should use defaults
      expect(json.pagination.currentPage).toBe(1);
      expect(json.pagination.itemsPerPage).toBe(100);
      expect(json.summary.year).toBe(0);
    });

    it('handles invalid page parameter', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?page=invalid' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // Should default to page 1
      expect(json.pagination.currentPage).toBe(1);
    });

    it('handles invalid limit parameter', async () => {
      const { GET } = require('@/app/api/vendors/top/route');
      const req = { url: 'http://localhost/api/vendors/top?limit=invalid' };
      const res = await GET(req as any);

      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();

      // With improved validation, invalid limit should default to 100
      expect(json.pagination.itemsPerPage).toBe(100);
      expect(json).toHaveProperty('vendors');
      expect(json).toHaveProperty('pagination');
      expect(json).toHaveProperty('summary');
      
      // The API should handle invalid parameters gracefully
      expect(Array.isArray(json.vendors)).toBe(true);
    });
  });
}); 