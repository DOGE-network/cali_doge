#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import type { SearchJSON, KeywordSource } from '../types/search';
import type { DepartmentsJSON } from '../types/department';
import type { ProgramsJSON } from '../types/program';
import type { FundsJSON } from '../types/fund';

// Paths to data files
const DATA_DIR = path.join(__dirname, '../data');
const DEPARTMENTS_PATH = path.join(DATA_DIR, 'departments.json');
const VENDORS_PATH = path.join(DATA_DIR, 'vendors.json');
const PROGRAMS_PATH = path.join(DATA_DIR, 'programs.json');
const FUNDS_PATH = path.join(DATA_DIR, 'funds.json');
const SEARCH_OUTPUT_PATH = path.join(DATA_DIR, 'search.json');

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
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
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

function generateSearchIndex(): SearchJSON {
  console.log('🔍 Generating search index...');
  
  const searchIndex: SearchJSON = {
    departments: [],
    vendors: [],
    programs: [],
    funds: [],
    keywords: [],
    lastUpdated: new Date().toISOString()
  };

  const keywordMap = new Map<string, KeywordSource[]>();

  // Process Departments
  console.log('📁 Processing departments...');
  const departmentsData = readJsonFile<DepartmentsJSON>(DEPARTMENTS_PATH);
  if (departmentsData?.departments) {
    for (const dept of departmentsData.departments) {
      // Add department to search items
      searchIndex.departments.push({
        term: dept.name,
        type: 'department',
        id: dept.organizationalCode?.toString() || dept._slug
      });

      // Extract keywords from department data
      const deptKeywords = [
        ...extractKeywords(dept.name),
        ...extractKeywords(dept.keyFunctions || ''),
        ...extractKeywords(dept.canonicalName || ''),
        ...(dept.aliases || []).flatMap(alias => extractKeywords(alias))
      ];

      // Add keywords with department context
      for (const keyword of deptKeywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        keywordMap.get(keyword)!.push({
          type: 'department',
          id: dept.organizationalCode?.toString() || dept._slug,
          context: dept.keyFunctions || dept.name
        });
      }
    }
    console.log(`✅ Processed ${searchIndex.departments.length} departments`);
  }

  // Process Vendors
  console.log('🏢 Processing vendors...');
  const vendorsData = readJsonFile<any>(VENDORS_PATH); // Use any since the structure is complex
  if (vendorsData?.v) {
    for (const vendorGroup of vendorsData.v) {
      if (vendorGroup.n && Array.isArray(vendorGroup.n)) {
        for (const vendor of vendorGroup.n) {
          // Add vendor to search items
          searchIndex.vendors.push({
            term: vendor.n, // vendor name
            type: 'vendor',
            id: vendorGroup.e || vendor.n // EIN from group or name as fallback
          });

          // Extract keywords from vendor name
          const vendorKeywords = extractKeywords(vendor.n);
          
          // Add keywords with vendor context (limited to avoid too much noise)
          for (const keyword of vendorKeywords.slice(0, 3)) { // Limit to first 3 keywords per vendor
            if (!keywordMap.has(keyword)) {
              keywordMap.set(keyword, []);
            }
            // Don't add vendor context to keywords to avoid clutter
          }
        }
      }
    }
    console.log(`✅ Processed ${searchIndex.vendors.length} vendors`);
  }

  // Process Programs
  console.log('📋 Processing programs...');
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
        id: program.projectCode
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
    console.log(`✅ Processed ${searchIndex.programs.length} programs`);
  }

  // Process Funds
  console.log('💰 Processing funds...');
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
        id: fund.fundCode
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
    console.log(`✅ Processed ${searchIndex.funds!.length} funds`);
  }

  // Convert keyword map to keyword items
  console.log('🔤 Processing keywords...');
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
  
  console.log(`✅ Processed ${searchIndex.keywords.length} keywords`);

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
    
    console.log(`✅ Search index written to: ${SEARCH_OUTPUT_PATH}`);
    
    // Log statistics
    console.log('\n📊 Search Index Statistics:');
    console.log(`  Departments: ${searchIndex.departments.length}`);
    console.log(`  Vendors: ${searchIndex.vendors.length}`);
    console.log(`  Programs: ${searchIndex.programs.length}`);
    console.log(`  Funds: ${searchIndex.funds!.length}`);
    console.log(`  Keywords: ${searchIndex.keywords.length}`);
    console.log(`  Total searchable items: ${
      searchIndex.departments.length + 
      searchIndex.vendors.length + 
      searchIndex.programs.length + 
      searchIndex.funds!.length + 
      searchIndex.keywords.length
    }`);
    
  } catch (error) {
    console.error('❌ Error writing search index:', error);
    process.exit(1);
  }
}

// Main execution
function main(): void {
  console.log('🚀 Starting search index generation...\n');
  
  try {
    const searchIndex = generateSearchIndex();
    writeSearchIndex(searchIndex);
    
    console.log('\n🎉 Search index generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating search index:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateSearchIndex, writeSearchIndex }; 