describe('Supabase client environment variable integration', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clears the require cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterEach(() => {
    process.env = OLD_ENV; // Restore old env
  });

  it('throws if NEXT_PUBLIC_SUPABASE_SERVICE_ROLE is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    expect(() => {
      require('../../src/lib/supabase');
    }).toThrow(/Missing NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/);
  });

  it('creates client if NEXT_PUBLIC_SUPABASE_SERVICE_ROLE is set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    expect(() => {
      require('../../src/lib/supabase');
    }).not.toThrow();
  });
}); 