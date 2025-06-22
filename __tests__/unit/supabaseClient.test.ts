import { getServiceSupabase } from '@/lib/supabase';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn()
}));

describe('Supabase Client', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis()
  } as any; // Type as any to avoid TypeScript issues with the mock

  beforeEach(() => {
    jest.clearAllMocks();
    (getServiceSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should return a Supabase client instance', () => {
    const supabase = getServiceSupabase() as any;
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.select).toBeDefined();
  });

  it('should be able to chain query methods', () => {
    const supabase = getServiceSupabase() as any;
    
    // Test that we can chain the query methods
    const query = supabase
      .from('vendors')
      .select('id, name')
      .limit(1);
    
    expect(query).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('vendors');
    expect(mockSupabase.select).toHaveBeenCalledWith('id, name');
    expect(mockSupabase.limit).toHaveBeenCalledWith(1);
  });

  it('should handle query execution with mock data', async () => {
    const mockData = [
      { id: 'test-id-1', name: 'Test Vendor 1' },
      { id: 'test-id-2', name: 'Test Vendor 2' }
    ];

    // Mock the query to return data
    mockSupabase.limit.mockResolvedValue({
      data: mockData,
      error: null
    });

    const supabase = getServiceSupabase() as any;
    const result = await supabase
      .from('vendors')
      .select('id, name')
      .limit(2);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('should handle query errors', async () => {
    const mockError = { message: 'Database connection failed' };

    // Mock the query to return an error
    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: mockError
    });

    const supabase = getServiceSupabase() as any;
    const result = await supabase
      .from('vendors')
      .select('id, name')
      .limit(1);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(mockError);
  });
});
