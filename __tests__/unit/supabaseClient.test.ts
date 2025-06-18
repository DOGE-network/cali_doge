import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getServiceSupabase } from '@/lib/supabase';

describe('Supabase Client', () => {
  it('should connect and fetch vendors data', async () => {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('vendors').select('id, name').limit(1);
    if (error) {
      throw new Error('Supabase client error: ' + error.message);
    }
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
  });
});
