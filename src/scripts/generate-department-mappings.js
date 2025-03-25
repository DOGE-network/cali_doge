#!/usr/bin/env node

/**
 * This script reads all department markdown files and generates code to populate
 * the departmentMappings array in src/lib/departmentMapping.ts
 * runs every build to ensure the mappings are up to date
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Path to department markdown files
const postsDirectory = path.join(process.cwd(), 'src/app/departments/posts');
const targetFile = path.join(process.cwd(), 'src/lib/departmentMapping.ts');
const departmentsJsonFile = path.join(process.cwd(), 'src/data/departments.json');

// Check if directory exists
if (!fs.existsSync(postsDirectory)) {
  console.error('Department posts directory not found:', postsDirectory);
  process.exit(1);
}

// Load departments data
let departmentsData = { departments: [] };
try {
  if (fs.existsSync(departmentsJsonFile)) {
    departmentsData = JSON.parse(fs.readFileSync(departmentsJsonFile, 'utf8'));
    console.log(`Loaded ${departmentsData.departments.length} departments from departments.json`);
  } else {
    console.warn('Departments data file not found:', departmentsJsonFile);
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading departments data:', error.message);
  process.exit(1);
}

// Helper function to escape special characters for TypeScript string literals
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Get all markdown files
const fileNames = fs.readdirSync(postsDirectory);
console.log(`Found ${fileNames.length} markdown files in posts directory`);

// Process each file to extract department information
const mappings = fileNames
  .filter(fileName => fileName.endsWith('.md'))
  .map(fileName => {
    // Extract slug from filename
    const slug = fileName.replace(/\.md$/, '');
    
    // Read the file content
    const fullPath = path.join(postsDirectory, fileName);
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

// Read the current departmentMapping.ts file
const fileContent = fs.readFileSync(targetFile, 'utf8');

// Find the section with the departmentMappings array
const mappingsStartPattern = /export const departmentMappings: DepartmentMapping\[\] = \[/;
const mappingsEndPattern = /\];/;

// Generate the mappings code
const mappingsCode = mappings.map(mapping => {
  return `  {
    slug: '${escapeString(mapping.slug)}',
    name: '${escapeString(mapping.name)}',
    canonicalName: '${escapeString(mapping.fullName)}',
    code: '${escapeString(mapping.budgetCode.toString())}',
    fullName: '${escapeString(mapping.fullName)}',
    spendingName: '${escapeString(mapping.spendingName)}',
    workforceName: '${escapeString(mapping.workforceName)}'
  }`;
}).join(',\n');

// Generate the list of slugs with pages
const slugs = mappings.map(mapping => `'${escapeString(mapping.slug)}'`);
const slugsCode = slugs.join(',\n  ');

// Find the start and end positions of the mappings array
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

// Replace the existing mappings with the new ones
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
  fs.writeFileSync(targetFile, updatedContent);
  console.log(`Generated mappings for ${mappings.length} departments`);
} else {
  console.error('Could not find departmentMappings array in the target file');
  process.exit(1);
} 