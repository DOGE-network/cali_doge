#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const PROD_DATA_DIR = path.join(__dirname, '../data/production');

// Production flag
const isProduction = true; // Always true for this optimization script

// Ensure production data directory exists
if (!fs.existsSync(PROD_DATA_DIR)) {
  fs.mkdirSync(PROD_DATA_DIR, { recursive: true });
}

interface OptimizationConfig {
  maxItems: number;
  priorityFields?: string[];
  sortBy?: string;
}

const OPTIMIZATION_CONFIG: Record<string, OptimizationConfig> = {
  'vendors.json': {
    maxItems: 1000,
    sortBy: 'totalAmount',
    priorityFields: ['name', 'totalAmount', 'transactionCount']
  },
  'search.json': {
    maxItems: 500, // per category
    priorityFields: ['term', 'type', 'id']
  },
  'departments.json': {
    maxItems: 500,
    priorityFields: ['name', 'organizationalCode', 'keyFunctions', '_slug']
  },
  'programs.json': {
    maxItems: 1000,
    priorityFields: ['name', 'projectCode', 'programDescriptions']
  },
  'budgets.json': {
    maxItems: 1000,
    priorityFields: ['department', 'amount', 'year']
  }
};

function optimizeFile(filename: string, config: OptimizationConfig) {
  const inputPath = path.join(DATA_DIR, filename);
  const outputPath = path.join(PROD_DATA_DIR, filename);
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }
  
  console.log(`🔧 Optimizing ${filename}...`);
  
  try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    let optimizedData = data;
    
    // Handle different data structures
    if (filename === 'search.json') {
      // Optimize search data by limiting each category
      optimizedData = {
        ...data,
        departments: data.departments?.slice(0, config.maxItems) || [],
        vendors: data.vendors?.slice(0, config.maxItems) || [],
        programs: data.programs?.slice(0, config.maxItems) || [],
        funds: data.funds?.slice(0, config.maxItems) || [],
        keywords: data.keywords?.slice(0, config.maxItems) || [],
        lastUpdated: new Date().toISOString(),
        optimized: true
      };
    } else if (Array.isArray(data)) {
      // Handle array data
      optimizedData = data.slice(0, config.maxItems);
    } else if (data.vendors && Array.isArray(data.vendors)) {
      // Handle vendors data structure
      let vendors = data.vendors;
      
      // Sort by total amount if specified
      if (config.sortBy === 'totalAmount') {
        vendors = vendors.sort((a: any, b: any) => (b.totalAmount || 0) - (a.totalAmount || 0));
      }
      
      optimizedData = {
        ...data,
        vendors: vendors.slice(0, config.maxItems),
        optimized: true,
        originalCount: data.vendors.length
      };
    } else if (data.v && Array.isArray(data.v)) {
      // Handle optimized vendors data structure (with 'v' field)
      console.log(`Found optimized vendor structure with ${data.v.length} vendors`);
      
      // For very large vendor arrays, take only the first N items
      const truncatedVendors = data.v.slice(0, config.maxItems);
      
      optimizedData = {
        ...data,
        v: truncatedVendors,
        optimized: true,
        originalCount: data.v.length,
        note: `Truncated to ${config.maxItems} vendors for production deployment`
      };
    } else if (data.departments && Array.isArray(data.departments)) {
      // Handle departments data structure
      console.log(`Found departments structure with ${data.departments.length} departments`);
      
      // For departments, we can optimize by removing some heavy nested data
      const optimizedDepartments = data.departments.slice(0, config.maxItems).map((dept: any) => {
        // Keep essential fields but remove heavy workforce data for production
        const optimizedDept = {
          name: dept.name,
          canonicalName: dept.canonicalName,
          _slug: dept._slug,
          aliases: dept.aliases,
          description: dept.description,
          organizationalCode: dept.organizationalCode,
          entityCode: dept.entityCode,
          keyFunctions: dept.keyFunctions,
          budgetStatus: dept.budgetStatus,
          // Keep only summary workforce data, not full distributions
          workforce: dept.workforce ? {
            headCount: dept.workforce.headCount,
            totalWages: dept.workforce.totalWages,
            // Remove heavy distribution arrays for production
            ...(isProduction ? {} : {
              tenureDistribution: dept.workforce.tenureDistribution,
              salaryDistribution: dept.workforce.salaryDistribution,
              ageDistribution: dept.workforce.ageDistribution
            })
          } : undefined
        };
        
        return optimizedDept;
      });
      
      optimizedData = {
        ...data,
        departments: optimizedDepartments,
        optimized: true,
        originalCount: data.departments.length,
        note: isProduction ? 'Workforce distributions removed for production' : 'Development build'
      };
    } else if (data.programs && Array.isArray(data.programs)) {
      // Handle programs data structure
      optimizedData = {
        ...data,
        programs: data.programs.slice(0, config.maxItems),
        optimized: true,
        originalCount: data.programs.length
      };
    } else if (data.budgets && Array.isArray(data.budgets)) {
      // Handle budgets data structure
      optimizedData = {
        ...data,
        budgets: data.budgets.slice(0, config.maxItems),
        optimized: true,
        originalCount: data.budgets.length
      };
    }
    
    // Write optimized data
    fs.writeFileSync(outputPath, JSON.stringify(optimizedData, null, 2));
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${filename}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
    
  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error);
  }
}

function main() {
  console.log('🚀 Optimizing data files for production...\n');
  
  // Create production versions of large files
  for (const [filename, config] of Object.entries(OPTIMIZATION_CONFIG)) {
    optimizeFile(filename, config);
  }
  
  // Copy smaller files as-is
  const smallFiles = ['funds.json'];
  for (const filename of smallFiles) {
    const inputPath = path.join(DATA_DIR, filename);
    const outputPath = path.join(PROD_DATA_DIR, filename);
    
    if (fs.existsSync(inputPath)) {
      fs.copyFileSync(inputPath, outputPath);
      console.log(`📋 Copied ${filename} (small file)`);
    }
  }
  
  console.log('\n✨ Data optimization complete!');
  console.log(`📁 Production data files saved to: ${PROD_DATA_DIR}`);
}

if (require.main === module) {
  main();
}

export { optimizeFile, OPTIMIZATION_CONFIG }; 