/**
 * Data Access Layer
 * 
 * This module provides functions for accessing data from JSON files with caching
 * for better performance.
 */

import fs from 'fs';
import path from 'path';
import type { SearchJSON } from '@/types/search';

// Cache for data files to reduce disk I/O
const dataCache = new Map();

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

/**
 * Get the correct data directory path for both local and production environments
 */
function getDataPath(filename: string): string {
  // In production (Vercel), files should be in the deployment
  // In development, files are in src/data
  const possiblePaths = [
    // Production optimized files (smaller versions)
    ...(isProduction ? [
      path.join(process.cwd(), 'src', 'data', 'production', filename),
      path.join('/var/task', 'src', 'data', 'production', filename),
      path.join(process.cwd(), '.next', 'server', 'src', 'data', 'production', filename),
    ] : []),
    // Vercel production paths (full files)
    path.join(process.cwd(), 'src', 'data', filename),
    path.join('/var/task', 'src', 'data', filename),
    path.join(process.cwd(), '.next', 'server', 'src', 'data', filename),
    // Development paths
    path.join(__dirname, '..', '..', 'data', filename),
    path.join(process.cwd(), 'src', 'data', filename),
  ];

  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        console.log(`Found data file at: ${testPath}`);
        return testPath;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // If no file found, return the most likely path for error reporting
  return path.join(process.cwd(), 'src', 'data', filename);
}

/**
 * Check if a file is too large for serverless environment
 */
function isFileTooLarge(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    // Vercel has memory limits, files over 250MB are problematic
    if (isVercel && sizeInMB > 250) {
      console.warn(`File ${filePath} is ${sizeInMB.toFixed(2)}MB, which may cause memory issues in production`);
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Generic function to read JSON data files with caching
 * 
 * @param filename Path to the JSON file
 * @returns Parsed JSON data
 */
export function readJsonFile(filename: string) {
  try {
    const fullPath = path.isAbsolute(filename) 
      ? filename 
      : getDataPath(filename);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`Data file not found: ${fullPath}`);
      console.log('Available files in directory:');
      try {
        const dir = path.dirname(fullPath);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          console.log('Files found:', files);
        } else {
          console.log('Directory does not exist:', dir);
        }
      } catch (dirError: any) {
        console.log('Could not read directory:', dirError.message);
      }
      
      // In production, return empty data structure instead of throwing
      if (isProduction) {
        console.log(`Returning empty data structure for missing file: ${filename}`);
        return getEmptyDataStructure(filename);
      }
      
      throw new Error(`Data file not found: ${filename}`);
    }
    
    const stats = fs.statSync(fullPath);
    
    // Check if file is too large for production
    if (isFileTooLarge(fullPath)) {
      console.warn(`File ${filename} may be too large for serverless environment`);
      
      // In production, try to return a smaller subset or empty structure
      if (isProduction) {
        console.log(`Attempting to read large file ${filename} with memory optimization`);
        return readLargeFileOptimized(fullPath, filename);
      }
    }
    
    // Check cache validity
    const cache = dataCache.get(fullPath);
    if (cache && cache.timestamp >= stats.mtimeMs) {
      console.log(`Using cached data for: ${filename}`);
      return cache.data;
    }
    
    console.log(`Reading data file: ${fullPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Read and parse file
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Update cache
    dataCache.set(fullPath, {
      data,
      timestamp: stats.mtimeMs
    });
    
    console.log(`Successfully loaded: ${filename}`);
    return data;
  } catch (error) {
    console.error(`Error reading JSON file ${filename}:`, error);
    
    // In production, return empty data structure instead of throwing
    if (isProduction) {
      console.log(`Returning empty data structure due to error: ${filename}`);
      return getEmptyDataStructure(filename);
    }
    
    throw new Error(`Failed to read data file: ${filename}`);
  }
}

/**
 * Get empty data structure for fallback
 */
function getEmptyDataStructure(filename: string) {
  switch (filename) {
    case 'search.json':
      return {
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        keywords: [],
        lastUpdated: new Date().toISOString()
      };
    case 'budgets.json':
      return { budgets: [] };
    case 'vendors.json':
      return { vendors: [] };
    case 'programs.json':
      return { programs: [] };
    case 'funds.json':
      return { funds: [] };
    case 'departments.json':
      return { departments: [] };
    default:
      return {};
  }
}

/**
 * Read large files with memory optimization
 */
function readLargeFileOptimized(fullPath: string, filename: string) {
  try {
    // For very large files, we might need to implement streaming or chunking
    // For now, try to read with increased memory awareness
    console.log(`Attempting optimized read of large file: ${filename}`);
    
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    return data;
  } catch (error) {
    console.error(`Error reading large file ${filename}:`, error);
    return getEmptyDataStructure(filename);
  }
}

/**
 * Get budgets data
 */
export function getBudgetsData() {
  return readJsonFile('budgets.json');
}

/**
 * Get funds data
 */
export function getFundsData() {
  return readJsonFile('funds.json');
}

/**
 * Get programs data
 */
export function getProgramsData() {
  return readJsonFile('programs.json');
}

/**
 * Get vendors data for a specific year
 */
export function getVendorsDataByYear(year: string) {
  return readJsonFile(`vendors_${year}.json`);
}

/**
 * Get vendors data
 */
export function getVendorsData(year?: string) {
  if (year) {
    return getVendorsDataByYear(year);
  }
  return readJsonFile('vendors.json');
}

/**
 * Get vendor transactions data
 */
export function getVendorTransactionsData() {
  return readJsonFile('vendor_transactions.json');
}

/**
 * Get search data
 */
export async function getSearchData(): Promise<SearchJSON | null> {
  try {
    const data = await readJsonFile('search.json') as SearchJSON;
    if (!data) {
      console.error('Search data not found or empty');
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error loading search data:', error);
    return null;
  }
}

/**
 * Clear data cache for a specific file
 */
export function clearDataCache(filePath: string) {
  dataCache.delete(filePath);
}

/**
 * Write data to a JSON file
 */
export function writeJsonFile(filePath: string, data: any) {
  try {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : getDataPath(filePath);
    
    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(fullPath, jsonContent, 'utf8');
    
    // Update cache
    dataCache.set(fullPath, {
      data,
      timestamp: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
} 