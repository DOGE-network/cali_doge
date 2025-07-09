import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing cache module
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  config({ path: envPath });
} else {
  console.log('No .env.local file found. Using environment variables from the system.');
}

// Now import the cache module after environment variables are loaded
import { invalidateByTag } from '../lib/cache';

async function clearSpendCache() {
  console.log('Clearing spend-related cache entries...');
  
  try {
    // Clear all spend-related cache entries
    await invalidateByTag('spend');
    console.log('✅ Cleared all spend cache entries');
    
    // Also clear specific view caches to be thorough
    await invalidateByTag('vendor');
    await invalidateByTag('budget');
    await invalidateByTag('compare');
    await invalidateByTag('batch');
    console.log('✅ Cleared specific view cache entries');
    
    console.log('🎉 Spend cache cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing spend cache:', error);
  }
}

// Run the script
clearSpendCache(); 