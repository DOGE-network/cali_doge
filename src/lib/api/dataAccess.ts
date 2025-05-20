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

/**
 * Generic function to read JSON data files with caching
 * 
 * @param filename Path to the JSON file
 * @returns Parsed JSON data
 */
function readJsonFile(filename) {
  try {
    const fullPath = path_mod.isAbsolute(filename) 
      ? filename 
      : path_mod.join(process.cwd(), filename);
    
    const stats = fs_mod.statSync(fullPath);
    
    // Check cache validity
    const cache = dataCache.get(fullPath);
    if (cache && cache.timestamp >= stats.mtimeMs) {
      return cache.data;
    }
    
    // Read and parse file
    const fileContent = fs_mod.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Update cache
    dataCache.set(fullPath, {
      data,
      timestamp: stats.mtimeMs
    });
    
    return data;
  } catch (error) {
    console.error(`Error reading JSON file ${filename}:`, error);
    throw new Error(`Failed to read data file: ${filename}`);
  }
}

/**
 * Get budgets data
 * 
 * @returns Budgets data from budgets.json
 */
function getBudgetsData() {
  return readJsonFile('src/data/budgets.json');
}

/**
 * Get funds data
 * 
 * @returns Funds data from funds.json
 */
function getFundsData() {
  return readJsonFile('src/data/funds.json');
}

/**
 * Get programs data
 * 
 * @returns Programs data from programs.json
 */
function getProgramsData() {
  return readJsonFile('src/data/programs.json');
}

/**
 * Get vendors data
 * 
 * @returns Vendors data from vendors.json
 */
function getVendorsData() {
  return readJsonFile('src/data/vendors.json');
}

/**
 * Get vendor transactions data
 * 
 * @returns Vendor transactions data from vendor_transaction.json
 */
function getVendorTransactionsData() {
  return readJsonFile('src/data/vendor_transaction.json');
}

/**
 * Get search data
 * 
 * @returns Search data from search.json
 */
function getSearchData() {
  return readJsonFile('src/data/search.json');
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