const { supabase } = require('../src/config/supabase');

describe('Simple Integration Test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test database connection', async () => {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    // Should not have a critical error (PGRST116 is just "no data" which is fine)
    if (error && error.code !== 'PGRST116') {
      console.log('Database connection test failed:', error);
      expect(error).toBeNull();
    } else {
      console.log('✅ Database connection test passed');
      expect(true).toBe(true);
    }
  });

  it('should test environment variables', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
    console.log('✅ Environment variables test passed');
  });
}); 