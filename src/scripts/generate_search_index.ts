#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import type { SearchJSON, KeywordSource } from '../types/search';
import type { ProgramsJSON } from '../types/program';
import type { FundsJSON } from '../types/fund';
import { getAllPosts } from '../lib/blog';

// Paths to data files
const DATA_DIR = path.join(__dirname, '../data');
const PROGRAMS_PATH = path.join(DATA_DIR, 'programs.json');
const FUNDS_PATH = path.join(DATA_DIR, 'funds.json');
const DEPARTMENTS_PATH = path.join(DATA_DIR, 'departments.json');
const SEARCH_OUTPUT_PATH = path.join(DATA_DIR, 'search.json');
const LOG_DIR = path.join(__dirname, '../logs');
const _VERSION = '1.0.1';

// Interface definitions
interface LogMessage {
  message: string;
  type?: 'info' | 'error' | 'warn';
}

// Initialize basic console logging first
const consoleLog = ({ message, type = 'info' }: LogMessage) => {
  const timestamp = new Date().toISOString();
  const logType = type.toUpperCase();
  console.log(`[${timestamp}] [${logType}] ${message}`);
};

// Ensure directories exist
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    consoleLog({ message: `Created directory: ${dirPath}` });
  }
}

// Setup logging with step tracking
function setupLogging() {
  ensureDirectoryExists(LOG_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `generate_search_index_${timestamp}.log`);
  
  // Create file logging function
  const fileLog = ({ message, type = 'info' }: LogMessage) => {
    const timestamp = new Date().toISOString();
    const logType = type.toUpperCase();
    
    const logMessage = `[${timestamp}] [${logType}] ${message}`;
    fs.appendFileSync(logFile, logMessage + '\n');
    console.log(message);
  };
  
  return fileLog;
}

// Initialize logging
const log = setupLogging();

// Common words to exclude from keyword extraction
const COMMON_WORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'among', 'under', 'over', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'like', 'such', 'than',
  'so', 'very', 'just', 'now', 'then', 'here', 'there', 'where', 'when', 'why',
  'how', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
  'a', 'an', 'as', 'if', 'each', 'all', 'any', 'both', 'either', 'neither',
  'some', 'many', 'much', 'more', 'most', 'few', 'little', 'less', 'least',
  'department', 'state', 'california', 'ca', 'gov', 'government', 'public', 'office'
]);

// Utility functions
function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      log({ message: `File not found: ${filePath}`, type: 'warn' });
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    log({ message: `Error reading ${filePath}: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    return null;
  }
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Clean and normalize text
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Split into words and filter
  const words = cleaned.split(' ')
    .filter(word => 
      word.length >= 3 && // At least 3 characters
      !COMMON_WORDS.has(word) && // Not a common word
      !/^\d+$/.test(word) // Not just numbers
    );
  
  // Remove duplicates and return
  return Array.from(new Set(words));
}

// Get all vendor files
function getVendorFiles(): string[] {
  const files = fs.readdirSync(DATA_DIR);
  return files
    .filter(file => file.startsWith('vendors_') && file.endsWith('.json'))
    .map(file => path.join(DATA_DIR, file));
}

async function generateSearchIndex(): Promise<SearchJSON> {
  log({ message: '🔍 Generating search index...' });
  
  const searchIndex: SearchJSON = {
    departments: [],
    vendors: [],
    programs: [],
    funds: [],
    keywords: [],
    lastUpdated: new Date().toISOString()
  };

  const keywordMap = new Map<string, KeywordSource[]>();
  const processedDepartments = new Set<string>(); // Track unique departments by ID

  // Process Departments from blog posts
  log({ message: '📁 Processing departments from blog posts...' });
  const posts = await getAllPosts();
  if (posts) {
    for (const post of posts) {
      // Add department to search items with enhanced information
      searchIndex.departments.push({
        term: post.name,
        type: 'department',
        id: post.id,
        lastUpdated: post.date || new Date().toISOString()
      });
      processedDepartments.add(post.id);

      // Extract keywords from department data
      const deptKeywords = [
        ...extractKeywords(post.name),
        ...extractKeywords(post.excerpt || ''),
        ...extractKeywords(post.content || '')
      ];

      // Add keywords with department context
      for (const keyword of deptKeywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        keywordMap.get(keyword)!.push({
          type: 'department',
          id: post.id,
          context: post.excerpt || post.name
        });
      }
    }
    log({ message: `✅ Processed ${searchIndex.departments.length} departments from blog posts` });
  }

  // Process Departments from departments.json
  log({ message: '📁 Processing departments from departments.json...' });
  const departmentsData = readJsonFile<any>(DEPARTMENTS_PATH);
  if (departmentsData?.departments) {
    for (const dept of departmentsData.departments) {
      // Skip if we've already processed this department from blog posts
      if (processedDepartments.has(dept.id)) {
        continue;
      }

      // Add department to search items
      searchIndex.departments.push({
        term: dept.name,
        type: 'department',
        id: dept.id
      });

      // Extract keywords from department data
      const deptKeywords = [
        ...extractKeywords(dept.name),
        ...extractKeywords(dept.description || '')
      ];

      // Add keywords with department context
      for (const keyword of deptKeywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        keywordMap.get(keyword)!.push({
          type: 'department',
          id: dept.id,
          context: dept.description || dept.name
        });
      }
    }
    log({ message: `✅ Added ${searchIndex.departments.length - processedDepartments.size} departments from departments.json` });
  }

  // Process Vendors
  log({ message: '🏢 Processing vendors...' });
  const vendorFiles = getVendorFiles();
  log({ message: `Found vendor files: ${vendorFiles.join(', ')}` });
  
  const processedVendors = new Set<string>(); // Track unique vendors by name
  let stats = {
    totalVendors: 0,
    vendorsWithEIN: 0,
    vendorsWithoutEIN: 0
  };

  for (const vendorFile of vendorFiles) {
    log({ message: `📄 Processing ${path.basename(vendorFile)}...` });
    const vendorsData = readJsonFile<any>(vendorFile);
    
    // Debug log the structure
    log({ message: `File structure keys: ${Object.keys(vendorsData || {}).join(', ')}` });
    
    if (!vendorsData) {
      log({ message: `❌ Failed to read vendor file: ${vendorFile}`, type: 'error' });
      continue;
    }

    if (vendorsData.t) {
      log({ message: `Found ${vendorsData.t.length} transactions in file` });
      
      for (const transaction of vendorsData.t) {
        if (!transaction.n) {
          log({ message: `⚠️ Skipping transaction with no name`, type: 'warn' });
          continue;
        }
        
        const vendorId = transaction.n; // Use vendor name as ID
        // Skip if we've already processed this vendor
        if (processedVendors.has(vendorId)) {
          continue;
        }
        
        processedVendors.add(vendorId);
        stats.totalVendors++;

        // Track EIN status
        if (transaction.e) {
          stats.vendorsWithEIN++;
        } else {
          stats.vendorsWithoutEIN++;
        }

        // Add vendor to search items
        searchIndex.vendors.push({
          term: transaction.n,
          type: 'vendor',
          id: vendorId,
          lastUpdated: vendorsData.lastUpdated
        });

        // Extract keywords from vendor name
        const vendorKeywords = extractKeywords(transaction.n);
        
        // Add keywords with vendor context (limited to avoid too much noise)
        for (const keyword of vendorKeywords.slice(0, 3)) { // Limit to first 3 keywords per vendor
          if (!keywordMap.has(keyword)) {
            keywordMap.set(keyword, []);
          }
          // Add vendor context to keywords
          keywordMap.get(keyword)!.push({
            type: 'department', // Use department type for vendor keywords to maintain consistency
            id: vendorId,
            context: transaction.n
          });
        }
      }
    } else {
      log({ message: `⚠️ No 't' array found in vendor file: ${vendorFile}`, type: 'warn' });
    }
  }

  // Log vendor processing statistics
  log({ message: '\n📊 Vendor Processing Statistics:' });
  log({ message: `  Total Vendors Processed: ${stats.totalVendors}` });
  log({ message: `  Vendors with EIN: ${stats.vendorsWithEIN}` });
  log({ message: `  Vendors without EIN: ${stats.vendorsWithoutEIN}` });
  log({ message: `  Files Processed: ${vendorFiles.length}` });
  log({ message: `  Unique Vendors: ${processedVendors.size}\n` });

  log({ message: `✅ Processed ${searchIndex.vendors.length} unique vendors from ${vendorFiles.length} files` });

  // Process Programs
  log({ message: '📋 Processing programs...' });
  const programsData = readJsonFile<ProgramsJSON>(PROGRAMS_PATH);
  if (programsData?.programs) {
    for (const program of programsData.programs) {
      // Skip programs without valid names
      if (!program.name || typeof program.name !== 'string' || program.name.trim() === '') {
        continue;
      }

      // Add program to search items
      searchIndex.programs.push({
        term: program.name,
        type: 'program',
        id: program.projectCode,
        lastUpdated: programsData.lastUpdated
      });

      // Extract keywords from program data
      const programKeywords = [
        ...extractKeywords(program.name),
        ...(program.programDescriptions || []).flatMap(desc => 
          extractKeywords(desc.description)
        )
      ];

      // Add keywords with program context
      for (const keyword of programKeywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        
        // Use the first program description as context, or fall back to name
        const context = program.programDescriptions?.[0]?.description || program.name;
        keywordMap.get(keyword)!.push({
          type: 'program',
          id: program.projectCode,
          context: context.length > 100 ? context.substring(0, 100) + '...' : context
        });
      }
    }
    log({ message: `✅ Processed ${searchIndex.programs.length} programs` });
  }

  // Process Funds
  log({ message: '💰 Processing funds...' });
  const fundsData = readJsonFile<FundsJSON>(FUNDS_PATH);
  if (fundsData?.funds) {
    for (const fund of fundsData.funds) {
      // Skip funds without valid names
      if (!fund.fundName || typeof fund.fundName !== 'string' || fund.fundName.trim() === '') {
        continue;
      }

      // Add fund to search items
      searchIndex.funds!.push({
        term: fund.fundName,
        type: 'fund',
        id: fund.fundCode,
        lastUpdated: fundsData.lastUpdated
      });

      // Extract keywords from fund data
      const fundKeywords = [
        ...extractKeywords(fund.fundName),
        ...extractKeywords(fund.fundDescription || ''),
        ...extractKeywords(fund.fundGroup || '')
      ];

      // Add keywords with fund context (limited)
      for (const keyword of fundKeywords.slice(0, 2)) { // Limit to avoid noise
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        // Don't add fund context to keywords to keep them focused on departments/programs
      }
    }
    log({ message: `✅ Processed ${searchIndex.funds!.length} funds` });
  }

  // Convert keyword map to keyword items
  log({ message: '🔤 Processing keywords...' });
  for (const [term, sources] of Array.from(keywordMap.entries())) {
    // Only include keywords that have context sources (from departments or programs)
    const contextSources = sources.filter(source => 
      source.type === 'department' || source.type === 'program'
    );
    
    if (contextSources.length > 0) {
      // Remove duplicate sources (same type and id)
      const uniqueSources = contextSources.filter((source, index, arr) => 
        arr.findIndex(s => s.type === source.type && s.id === source.id) === index
      );
      
      searchIndex.keywords.push({
        term,
        type: 'keyword',
        sources: uniqueSources
      });
    }
  }
  
  // Sort keywords by number of sources (most relevant first)
  searchIndex.keywords.sort((a, b) => b.sources.length - a.sources.length);
  
  log({ message: `✅ Processed ${searchIndex.keywords.length} keywords` });

  return searchIndex;
}

function writeSearchIndex(searchIndex: SearchJSON): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write the search index
    fs.writeFileSync(
      SEARCH_OUTPUT_PATH, 
      JSON.stringify(searchIndex, null, 2), 
      'utf-8'
    );
    
    log({ message: `✅ Search index written to: ${SEARCH_OUTPUT_PATH}` });
    
    // Log statistics
    log({ message: '\n📊 Search Index Statistics:' });
    log({ message: `  Departments: ${searchIndex.departments.length}` });
    log({ message: `  Vendors: ${searchIndex.vendors.length}` });
    log({ message: `  Programs: ${searchIndex.programs.length}` });
    log({ message: `  Funds: ${searchIndex.funds!.length}` });
    log({ message: `  Keywords: ${searchIndex.keywords.length}` });
    log({ message: `  Total searchable items: ${
      searchIndex.departments.length + 
      searchIndex.vendors.length + 
      searchIndex.programs.length + 
      searchIndex.funds!.length + 
      searchIndex.keywords.length
    }` });
    
  } catch (error) {
    log({ message: `❌ Error writing search index: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  log({ message: '🚀 Starting search index generation...\n' });
  
  try {
    const searchIndex = await generateSearchIndex();
    writeSearchIndex(searchIndex);
    
    log({ message: '\n🎉 Search index generation completed successfully!' });
    
  } catch (error) {
    log({ message: `❌ Error generating search index: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log({ message: `❌ Error in main: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    process.exit(1);
  });
}

export { generateSearchIndex, writeSearchIndex }; 