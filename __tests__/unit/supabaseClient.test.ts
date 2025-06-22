import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getServiceSupabase } from '@/lib/supabase';

describe('Supabase Client', () => {
  it('should connect and fetch vendors data', async () => {
    const supabase = getServiceSupabase();
    
    // Test the connection by attempting to fetch vendors
    const { data, error } = await supabase.from('vendors').select('id, name').limit(1);
    
    if (error) {
      throw new Error('Supabase client error: ' + error.message);
    }
    
    expect(Array.isArray(data)).toBe(true);
    
    // Log the result for debugging
    console.log('Vendors data:', data);
    console.log('Data length:', data?.length);
    
    // If there's no data, that's okay - the test should still pass
    // as long as the connection works and we get an empty array
    if (data.length === 0) {
      console.log('No vendors found in database - this is acceptable for tests');
    } else {
      // If there is data, verify the structure
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
    }
    
    // The main test is that we can connect and query without errors
    expect(error).toBeNull();
  });
});
