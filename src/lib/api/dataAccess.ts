/**
 * Data Access Layer
 * 
 * This module provides functions for accessing data from JSON files with caching
 * for better performance.
 */

// Don't declare fs/path since they appear to be already in scope
const fs_mod = require('fs');
const path_mod = require('path');

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
      path_mod.join(process.cwd(), 'src', 'data', 'production', filename),
      path_mod.join('/var/task', 'src', 'data', 'production', filename),
      path_mod.join(process.cwd(), '.next', 'server', 'src', 'data', 'production', filename),
    ] : []),
    // Vercel production paths (full files)
    path_mod.join(process.cwd(), 'src', 'data', filename),
    path_mod.join('/var/task', 'src', 'data', filename),
    path_mod.join(process.cwd(), '.next', 'server', 'src', 'data', filename),
    // Development paths
    path_mod.join(__dirname, '..', '..', 'data', filename),
    path_mod.join(process.cwd(), 'src', 'data', filename),
  ];

  for (const testPath of possiblePaths) {
    try {
      if (fs_mod.existsSync(testPath)) {
        console.log(`Found data file at: ${testPath}`);
        return testPath;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // If no file found, return the most likely path for error reporting
  return path_mod.join(process.cwd(), 'src', 'data', filename);
}

/**
 * Check if a file is too large for serverless environment
 */
function isFileTooLarge(filePath: string): boolean {
  try {
    const stats = fs_mod.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    // Vercel has memory limits, files over 50MB are problematic
    if (isVercel && sizeInMB > 50) {
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
function readJsonFile(filename: string) {
  try {
    const fullPath = path_mod.isAbsolute(filename) 
      ? filename 
      : getDataPath(filename);
    
    // Check if file exists
    if (!fs_mod.existsSync(fullPath)) {
      console.error(`Data file not found: ${fullPath}`);
      console.log('Available files in directory:');
      try {
        const dir = path_mod.dirname(fullPath);
        if (fs_mod.existsSync(dir)) {
          const files = fs_mod.readdirSync(dir);
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
    
    const stats = fs_mod.statSync(fullPath);
    
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
    const fileContent = fs_mod.readFileSync(fullPath, 'utf8');
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
    
    const fileContent = fs_mod.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // If it's a large array, consider truncating for production
    if (Array.isArray(data)) {
      console.log(`Large array detected with ${data.length} items`);
      // Limit to first 1000 items in production to prevent memory issues
      if (isProduction && data.length > 1000) {
        console.log(`Truncating large array to 1000 items for production`);
        return data.slice(0, 1000);
      }
    }
    
    // If it's an object with arrays, truncate those
    if (typeof data === 'object' && data !== null) {
      const truncatedData = { ...data };
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 1000 && isProduction) {
          console.log(`Truncating ${key} array from ${value.length} to 1000 items`);
          truncatedData[key] = value.slice(0, 1000);
        }
      }
      return truncatedData;
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to read large file optimized: ${filename}`, error);
    return getEmptyDataStructure(filename);
  }
}

/**
 * Get budgets data
 * 
 * @returns Budgets data from budgets.json
 */
function getBudgetsData() {
  return readJsonFile('budgets.json');
}

/**
 * Get funds data
 * 
 * @returns Funds data from funds.json
 */
function getFundsData() {
  return readJsonFile('funds.json');
}

/**
 * Get programs data
 * 
 * @returns Programs data from programs.json
 */
function getProgramsData() {
  return readJsonFile('programs.json');
}

/**
 * Get vendors data
 * 
 * @returns Vendors data from vendors.json
 */
function getVendorsData() {
  return readJsonFile('vendors.json');
}

/**
 * Get vendor transactions data
 * 
 * @returns Vendor transactions data from vendor_transaction.json
 */
function getVendorTransactionsData() {
  return readJsonFile('vendor_transaction.json');
}

/**
 * Get search data
 * 
 * @returns Search data from search.json
 */
function getSearchData() {
  return readJsonFile('search.json');
}

/**
 * Clear the data cache
 * 
 * @param filePath Optional specific file path to clear from cache
 */
function clearDataCache(filePath) {
  if (filePath) {
    const fullPath = path_mod.isAbsolute(filePath) 
      ? filePath 
      : path_mod.join(process.cwd(), filePath);
    
    dataCache.delete(fullPath);
  } else {
    dataCache.clear();
  }
}

/**
 * Write JSON data to a file with proper formatting
 * 
 * @param filePath Path to the output file
 * @param data Data to write
 */
function writeJsonFile(filePath, data) {
  try {
    const fullPath = path_mod.isAbsolute(filePath) 
      ? filePath 
      : path_mod.join(process.cwd(), filePath);
    
    const dirPath = path_mod.dirname(fullPath);
    if (!fs_mod.existsSync(dirPath)) {
      fs_mod.mkdirSync(dirPath, { recursive: true });
    }
    
    fs_mod.writeFileSync(
      fullPath, 
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    // Update cache
    dataCache.set(fullPath, {
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw new Error(`Failed to write data file: ${filePath}`);
  }
}

module.exports = {
  readJsonFile,
  getBudgetsData,
  getFundsData,
  getProgramsData,
  getVendorsData,
  getVendorTransactionsData,
  getSearchData,
  clearDataCache,
  writeJsonFile
}; 