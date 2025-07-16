import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing any modules that use them
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  console.log('⚠️  No .env.local file found');
  process.exit(1);
}

// Create Supabase client manually to avoid module-level validation
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }
  if (!supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_SERVICE_ROLE in .env.local');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Check required environment variables
function checkEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('💡 Make sure your .env.local file contains these variables');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded successfully');
}

async function monitorConnections() {
  console.log('🔍 Monitoring database connections...');
  
  try {
    const supabase = createSupabaseClient();
    
    // Query to check active connections (if function exists)
    const { data: connections, error } = await supabase
      .rpc('get_active_connections' as any);
    
    if (error) {
      console.log('❌ Could not get connection info:', error.message);
      console.log('💡 This is normal if the function does not exist');
      return;
    }
    
    console.log('📊 Active connections:', connections);
    
  } catch (error) {
    console.error('❌ Error monitoring connections:', error);
  }
}

// Simple connection test
async function testConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    const supabase = createSupabaseClient();
    
    // Simple query to test connection
    const { error } = await supabase
      .from('vendor_transactions_with_vendor_fy2024')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection test successful');
    return true;
    
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

// Monitor connection pool health
async function monitorPoolHealth() {
  console.log('🏥 Monitoring connection pool health...');
  
  const tests = [
    { name: '2024 View', query: 'vendor_transactions_with_vendor_fy2024' },
    { name: '2023 View', query: 'vendor_transactions_with_vendor_fy2023' },
    { name: '2022 View', query: 'vendor_transactions_with_vendor_fy2022' },
  ];
  
  for (const test of tests) {
    try {
      const supabase = createSupabaseClient();
      const startTime = Date.now();
      
      const { error } = await (supabase as any)
        .from(test.query)
        .select('id', { count: 'exact', head: true });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.log(`❌ ${test.name}: ${error.message} (${duration}ms)`);
      } else {
        console.log(`✅ ${test.name}: ${duration}ms`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error}`);
    }
  }
}

// Main monitoring function
async function main() {
  console.log('🚀 Starting connection monitoring...\n');
  
  // Check environment variables first
  checkEnvVars();
  
  // Test basic connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('❌ Basic connection failed - check your database');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Monitor pool health
  await monitorPoolHealth();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Try to get connection info
  await monitorConnections();
  
  console.log('\n💡 Tips:');
  console.log('- If you see 504 errors, check Supabase dashboard for connection limits');
  console.log('- Monitor Pooler Logs in Supabase dashboard for connection issues');
  console.log('- Consider reducing concurrent requests if connections are high');
}

// Run monitoring
main().catch(console.error); 