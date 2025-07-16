import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing cache module
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

// Now import the cache module after environment variables are loaded
import { setInCache } from '../lib/cache';

// Common department codes that appear in search results
const COMMON_DEPARTMENT_CODES = [
  '6255', '0984', '1165', '0515', '4300', '0956', '1701', '6860', '7100', '7120',
  '1700', '8860', '2720', '3210', '7760', '7504', '3480', '3600', '3780', '3900',
];

// Common search terms that trigger batch requests
const COMMON_SEARCH_TERMS = [
  'health', 'medical', 'department', 'transportation', 'education', 'justice',
  'corrections', 'social', 'services', 'environmental', 'natural', 'resources'
];

// Read queries from src/logs if present
const spendQueriesPath = path.resolve(process.cwd(), 'src/logs/unique_spend_queries.json');
const searchQueriesPath = path.resolve(process.cwd(), 'src/logs/unique_search_queries.json');

let spendQueries: string[] = [];
let searchQueries: string[] = [];
if (fs.existsSync(spendQueriesPath)) {
  spendQueries = JSON.parse(fs.readFileSync(spendQueriesPath, 'utf-8'));
}
if (fs.existsSync(searchQueriesPath)) {
  searchQueries = JSON.parse(fs.readFileSync(searchQueriesPath, 'utf-8'));
}

const baseUrl = process.env.BASE_URL || process.argv[2] || 'http://localhost:3000';

async function preflightCheck() {
  const endpoints = [
    '/api/search',
    '/api/spend',
    '/api/departments',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep}`);
      if (res.ok) return;
    } catch (e) {
      // try next endpoint
    }
  }
  console.error(`❌ API server not reachable at ${baseUrl} (checked /api/search, /api/spend, /api/departments). Start your API server and try again.`);
  process.exit(1);
}

async function warmSpendCache() {
  await preflightCheck();
  console.log('🔥 Warming up spend cache...');
  
  try {
    
    // 1. Warm up batch API for common department combinations
    console.log('📦 Warming batch API cache...');
    
    // Create batches of 5 departments (reduced from 20 to prevent connection pool exhaustion)
    for (let i = 0; i < COMMON_DEPARTMENT_CODES.length; i += 5) {
      const batch = COMMON_DEPARTMENT_CODES.slice(i, i + 5);
      const batchKey = `batch:${batch.sort().join(',')}`;
      
      try {
        console.log(`  Warming batch: ${batch.join(',')}`);
        const response = await fetch(`${baseUrl}/api/spend?batch=${encodeURIComponent(batch.join(','))}`);
        
        if (response.ok) {
          const data = await response.json();
          // Cache the result manually to ensure it's stored
          await setInCache(batchKey, data, { ex: 3600, tags: ['spend', 'batch'] });
          console.log(`  ✅ Cached batch: ${batch.length} departments`);
        } else {
          console.log(`  ⚠️  Batch failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`  ❌ Batch error: ${error}`);
      }
      
      // Increased delay to respect connection pool limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 2. Warm up individual department API calls
    console.log('🏢 Warming individual department cache...');
    
    for (const deptCode of COMMON_DEPARTMENT_CODES.slice(0, 10)) { // Limit to first 10 to avoid too many requests
      try {
        console.log(`  Warming department: ${deptCode}`);
        
        // Vendor view
        const vendorResponse = await fetch(`${baseUrl}/api/spend?department_code=${deptCode}&limit=1`);
        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json();
          const vendorKey = `spend:department_code:${deptCode}|limit:1`;
          await setInCache(vendorKey, vendorData, { ex: 3600, tags: ['spend', 'vendor'] });
          console.log(`    ✅ Cached vendor data for ${deptCode}`);
        }
        
        // Budget view
        const budgetResponse = await fetch(`${baseUrl}/api/spend?view=budget&department_code=${deptCode}&limit=1`);
        if (budgetResponse.ok) {
          const budgetData = await budgetResponse.json();
          const budgetKey = `spend:view:budget|department_code:${deptCode}|limit:1`;
          await setInCache(budgetKey, budgetData, { ex: 3600, tags: ['spend', 'budget'] });
          console.log(`    ✅ Cached budget data for ${deptCode}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Department ${deptCode} error: ${error}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 3. Warm up search API for common terms
    console.log('🔍 Warming search API cache...');
    
    for (const term of COMMON_SEARCH_TERMS.slice(0, 5)) { // Limit to first 5 terms
      try {
        console.log(`  Warming search: ${term}`);
        const searchResponse = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(term)}&types=department,vendor,program,fund&limit=20`);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const searchKey = `search:${term}:department,vendor,program,fund:20:false`;
          await setInCache(searchKey, searchData, { ex: 3600, tags: ['search'] });
          console.log(`    ✅ Cached search data for "${term}"`);
        }
      } catch (error) {
        console.log(`  ❌ Search "${term}" error: ${error}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Warm up real-world queries from log analysis
    if (spendQueries.length > 0) {
      console.log('📝 Warming real-world /api/spend queries from log...');
      for (const query of spendQueries) {
        try {
          const url = `${baseUrl}/api/spend?${query}`;
          console.log(`  Warming: ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            await response.json(); // triggers backend cache
            console.log('    ✅ Cached');
          } else {
            console.log(`    ⚠️  Failed: ${response.status} ${response.statusText}`);
          }
        } catch (e) {
          console.log(`    ❌ Error: ${e}`);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    if (searchQueries.length > 0) {
      console.log('📝 Warming real-world /api/search queries from log...');
      for (const query of searchQueries) {
        try {
          const url = `${baseUrl}/api/search?${query}`;
          console.log(`  Warming: ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            await response.json();
            console.log('    ✅ Cached');
          } else {
            console.log(`    ⚠️  Failed: ${response.status} ${response.statusText}`);
          }
        } catch (e) {
          console.log(`    ❌ Error: ${e}`);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('🎉 Cache warming completed successfully!');
    console.log('💡 The spend API should now respond faster on first page load.');
    
  } catch (error) {
    console.error('❌ Error warming cache:', error);
  }
}

// Run the script
warmSpendCache(); 