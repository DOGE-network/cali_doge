#!/usr/bin/env node

/**
 * Department Mappings Generator Script
 * 
 * This script processes department markdown files and generates TypeScript code
 * for department mappings used throughout the application. It handles:
 * - Reading department markdown files
 * - Matching departments with departments.json data
 * - Generating TypeScript code for department mappings
 * - Updating the departmentMapping.ts file
 * 
 * Workflow:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup file paths
 *    c. Validate directories
 * 
 * 2. File Processing
 *    a. Read markdown files
 *    b. Extract department information
 *    c. Match with departments.json data
 *    d. Generate standardized mappings
 * 
 * 3. Code Generation
 *    a. Generate departmentMappings array
 *    b. Generate DEPARTMENT_SLUGS_WITH_PAGES array
 *    c. Update departmentMapping.ts file
 * 
 * 4. Results Summary
 *    a. Log processing statistics
 *    b. Report any warnings or issues
 * 
 * Usage:
 * ```bash
 * node generate-department-mappings.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = process.cwd();
const POSTS_DIR = path.join(PROJECT_ROOT, 'src/app/departments/posts');
const TARGET_FILE = path.join(PROJECT_ROOT, 'src/lib/departmentMapping.ts');
const DEPARTMENTS_JSON_FILE = path.join(PROJECT_ROOT, 'src/data/departments.json');

/**
 * Step 1a: Validate directories and files
 * Exits if required directories or files are not found
 */
if (!fs.existsSync(POSTS_DIR)) {
  console.error('Department posts directory not found:', POSTS_DIR);
  process.exit(1);
}

/**
 * Step 1b: Load departments data
 * Loads and validates departments.json file
 * Exits if file is not found or invalid
 */
let departmentsData = { departments: [] };
try {
  if (fs.existsSync(DEPARTMENTS_JSON_FILE)) {
    departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_FILE, 'utf8'));
    console.log(`Loaded ${departmentsData.departments.length} departments from departments.json`);
  } else {
    console.warn('Departments data file not found:', DEPARTMENTS_JSON_FILE);
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading departments data:', error.message);
  process.exit(1);
}

/**
 * Utility function to escape special characters in strings
 * Used for generating valid TypeScript string literals
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Step 2a: Get all markdown files
 * Lists all .md files in the posts directory
 */
const fileNames = fs.readdirSync(POSTS_DIR);
console.log(`Found ${fileNames.length} markdown files in posts directory`);

/**
 * Step 2b: Process markdown files
 * Extracts department information from each markdown file
 * Matches with departments.json data
 * Generates standardized mappings
 */
const mappings = fileNames
  .filter(fileName => fileName.endsWith('.md'))
  .map(fileName => {
    // Extract slug from filename
    const slug = fileName.replace(/\.md$/, '');
    
    // Read the file content
    const fullPath = path.join(POSTS_DIR, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    
    // Parse frontmatter
    const { data } = matter(fileContents);
    
    // Extract department name and code
    const name = data.name || '';
    const code = data.budgetCode || '';
    
    if (!name || !code) {
      console.warn(`Missing name or code in department file: ${fileName}`);
      return null;
    }
    
    // Extract code from filename (e.g., 0250_judicial_branch.md -> 0250)
    const fileCode = fileName.split('_')[0];
    
    // Use the code from the filename as the source of truth
    const standardizedCode = fileCode;
    
    // Find the matching department in departments.json
    const matchingDept = departmentsData.departments.find(dept => 
      dept.name === name || 
      dept.canonicalName === name || 
      (dept.aliases && dept.aliases.includes(name)) ||
      // Also match by code in case name is slightly different
      (dept.budgetCode && dept.budgetCode.toString() === standardizedCode.toString())
    );
    
    // If we found a match, use department data from departments.json
    if (matchingDept) {
      return {
        slug,
        name: matchingDept.name,
        code: standardizedCode,
        // Use the actual names from departments.json
        fullName: matchingDept.canonicalName || matchingDept.name,
        spendingName: matchingDept.name,
        workforceName: matchingDept.name
      };
    }
    
    // If no match, just use data from the markdown file
    console.warn(`No matching department found in departments.json for: ${name} (code: ${standardizedCode}), using markdown data only`);
    return {
      slug,
      name,
      code: standardizedCode,
      fullName: name,
      spendingName: name,
      workforceName: name
    };
  })
  .filter(item => item !== null);

console.log(`Processed ${mappings.length} department mappings from markdown files`);

/**
 * Step 3a: Read current departmentMapping.ts file
 * Prepares for updating the file with new mappings
 */
const fileContent = fs.readFileSync(TARGET_FILE, 'utf8');

// Find the section with the departmentMappings array
const mappingsStartPattern = /export const departmentMappings: DepartmentMapping\[\] = \[/;
const mappingsEndPattern = /\];/;

/**
 * Step 3b: Generate mappings code
 * Creates TypeScript code for departmentMappings array
 */
const mappingsCode = mappings.map(mapping => {
  // Convert the code to a regular decimal number by removing leading zeros
  const decimalCode = parseInt(mapping.code, 10);
  return `  {
    slug: '${escapeString(mapping.slug)}',
    name: '${escapeString(mapping.name)}',
    canonicalName: '${escapeString(mapping.fullName)}',
    budgetCode: toNonNegativeInteger(${decimalCode}),
    spendingName: '${escapeString(mapping.spendingName)}',
    workforceName: '${escapeString(mapping.workforceName)}'
  }`;
}).join(',\n');

/**
 * Step 3c: Generate slugs code
 * Creates TypeScript code for DEPARTMENT_SLUGS_WITH_PAGES array
 */
const slugs = mappings.map(mapping => `'${escapeString(mapping.slug)}'`);
const slugsCode = slugs.join(',\n  ');

/**
 * Step 3d: Find array positions
 * Locates the start and end positions of arrays in the target file
 */
const contentLines = fileContent.split('\n');
let startLineIndex = -1;
let endLineIndex = -1;

for (let i = 0; i < contentLines.length; i++) {
  if (mappingsStartPattern.test(contentLines[i])) {
    startLineIndex = i;
  }
  if (startLineIndex !== -1 && mappingsEndPattern.test(contentLines[i])) {
    endLineIndex = i;
    break;
  }
}

/**
 * Step 3e: Update target file
 * Replaces existing arrays with new generated code
 */
if (startLineIndex !== -1 && endLineIndex !== -1) {
  contentLines.splice(startLineIndex + 1, endLineIndex - startLineIndex - 1, mappingsCode);
  
  // Now update the DEPARTMENT_SLUGS_WITH_PAGES array
  const slugsStartPattern = /const DEPARTMENT_SLUGS_WITH_PAGES = \[/;
  const slugsEndPattern = /\];/;
  
  let slugsStartLineIndex = -1;
  let slugsEndLineIndex = -1;
  
  for (let i = 0; i < contentLines.length; i++) {
    if (slugsStartPattern.test(contentLines[i])) {
      slugsStartLineIndex = i;
    }
    if (slugsStartLineIndex !== -1 && i > slugsStartLineIndex && slugsEndPattern.test(contentLines[i])) {
      slugsEndLineIndex = i;
      break;
    }
  }
  
  if (slugsStartLineIndex !== -1 && slugsEndLineIndex !== -1) {
    contentLines.splice(slugsStartLineIndex + 1, slugsEndLineIndex - slugsStartLineIndex - 1, slugsCode);
  } else {
    console.warn('Could not find DEPARTMENT_SLUGS_WITH_PAGES array in the target file');
  }
  
  const updatedContent = contentLines.join('\n');
  fs.writeFileSync(TARGET_FILE, updatedContent);
  console.log(`Generated mappings for ${mappings.length} departments`);
} else {
  console.error('Could not find departmentMappings array in the target file');
  process.exit(1);
} 