// Mock the dependencies
jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          then: jest.fn((resolve) => Promise.resolve({
            data: [
              {
                id: '123',
                name: 'Test Department',
                canonical_name: 'Test Department',
                aliases: ['TD'],
                description: 'A test department',
                entity_code: 'TD001',
                org_level: 1,
                budget_status: 'active',
                key_functions: 'Testing',
                abbreviation: 'TD',
                parent_agency: 'Test Agency',
                note: 'Test note',
                organizational_code: '123',
                workforce_yearly: {
                  '2023': { headCount: 100, wages: 5000000 },
                  '2022': { headCount: 95, wages: 4800000 }
                },
                distributions_yearly: {
                  salary: {
                    yearly: {
                      '2023': [10, 20, 30, 40],
                      '2022': [8, 18, 28, 38]
                    }
                  },
                  age: {
                    yearly: {
                      '2023': [15, 25, 35, 45],
                      '2022': [12, 22, 32, 42]
                    }
                  },
                  tenure: {
                    yearly: {
                      '2023': [5, 15, 25, 35],
                      '2022': [4, 14, 24, 34]
                    }
                  }
                }
              }
            ],
            error: null
          }).then(resolve))
        }))
      }))
    }))
  }))
}));

import { NextResponse } from 'next/server';

describe('Departments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns departments with workforce data', async () => {
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json).toHaveProperty('departments');
    expect(Array.isArray(json.departments)).toBe(true);
    expect(json.departments.length).toBeGreaterThan(0);
  });

  it('transforms department data correctly', async () => {
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    const dept = json.departments.find((d: any) => d.id === '123');
    expect(dept).toBeDefined();
    expect(dept).toHaveProperty('id', '123');
    expect(dept).toHaveProperty('name', 'Test Department');
    expect(dept).toHaveProperty('canonicalName', 'Test Department');
    expect(dept).toHaveProperty('aliases');
    expect(dept).toHaveProperty('description');
    expect(dept).toHaveProperty('entityCode');
    expect(dept).toHaveProperty('orgLevel');
    expect(dept).toHaveProperty('budget_status');
    expect(dept).toHaveProperty('keyFunctions');
    expect(dept).toHaveProperty('abbreviation');
    expect(dept).toHaveProperty('parent_agency');
    expect(dept).toHaveProperty('note');
    expect(dept).toHaveProperty('organizationalCode');
    expect(dept).toHaveProperty('headCount');
    expect(dept).toHaveProperty('wages');
    expect(dept).toHaveProperty('tenureDistribution');
    expect(dept).toHaveProperty('salaryDistribution');
    expect(dept).toHaveProperty('ageDistribution');
    expect(dept).toHaveProperty('hasWorkforceData');
  });

  it('handles departments format parameter', async () => {
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments?format=departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json).toHaveProperty('departments');
    expect(json).not.toHaveProperty('budgetSummary');
    expect(json).not.toHaveProperty('revenueSources');
  });

  it('adds root department when not present', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          then: jest.fn((resolve) => Promise.resolve({
            data: [
              {
                id: '456',
                name: 'Other Department',
                canonical_name: 'Other Department',
                aliases: [],
                description: 'Another department',
                entity_code: 'OD001',
                org_level: 1,
                budget_status: 'active',
                key_functions: 'Other functions',
                abbreviation: 'OD',
                parent_agency: '',
                note: null,
                organizational_code: '456',
                workforce_yearly: {},
                distributions_yearly: {}
              }
            ],
            error: null
          }).then(resolve))
        }))
      }))
    });

    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    const hasRootDepartment = json.departments.some((d: any) => d.name === 'California State Government');
    expect(hasRootDepartment).toBe(true);
  });

  it('handles database errors gracefully', async () => {
    // Mock the getServiceSupabase function to return our error mock
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            then: jest.fn((resolve) => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }).then(resolve))
          }))
        }))
      }))
    };
    
    const { getServiceSupabase } = require('@/lib/supabase');
    getServiceSupabase.mockReturnValue(mockSupabase);
    
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);
    
    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch departments');
    expect(res.status).toBe(500);
  });

  it('handles general exceptions', async () => {
    // Mock the getServiceSupabase function to throw an error
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => { throw new Error('General error'); })
      }))
    };
    
    const { getServiceSupabase } = require('@/lib/supabase');
    getServiceSupabase.mockReturnValue(mockSupabase);
    
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);
    
    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
    expect(res.status).toBe(500);
  });

  it('handles null workforce data', async () => {
    const { getServiceSupabase } = require('@/lib/supabase');
    const mockSupabase = getServiceSupabase();
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          then: jest.fn((resolve) => Promise.resolve({
            data: [
              {
                id: '789',
                name: 'No Workforce Dept',
                canonical_name: 'No Workforce Dept',
                aliases: [],
                description: 'Department without workforce data',
                entity_code: 'NWD001',
                org_level: 1,
                budget_status: 'active',
                key_functions: 'No functions',
                abbreviation: 'NWD',
                parent_agency: '',
                note: null,
                organizational_code: '789',
                workforce_yearly: null,
                distributions_yearly: null
              }
            ],
            error: null
          }).then(resolve))
        }))
      }))
    });

    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    const json = await res.json();
    const dept = json.departments[0];
    expect(dept.hasWorkforceData).toBe(false);
    expect(dept.headCount.yearly).toEqual({});
    expect(dept.wages.yearly).toEqual({});
  });

  it('sets cache headers correctly', async () => {
    const { GET } = require('@/app/api/departments/route');
    const req = { url: 'http://localhost/api/departments' };
    const res = await GET(req as any);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=7200');
  });
}); 