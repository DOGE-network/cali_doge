#!/usr/bin/env node

/**
 * This script reads all department markdown files and generates code to populate
 * the departmentMappings array in src/lib/departmentMapping.ts
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Path to department markdown files
const postsDirectory = path.join(process.cwd(), 'src/app/departments/posts');
const targetFile = path.join(process.cwd(), 'src/lib/departmentMapping.ts');
const spendingDataFile = path.join(process.cwd(), 'src/data/spending-data.json');
const workforceDataFile = path.join(process.cwd(), 'src/data/workforce-data.json');

// Check if directory exists
if (!fs.existsSync(postsDirectory)) {
  console.error('Department posts directory not found:', postsDirectory);
  process.exit(1);
}

// Load spending and workforce data
const spendingData = JSON.parse(fs.readFileSync(spendingDataFile, 'utf8'));
const workforceData = JSON.parse(fs.readFileSync(workforceDataFile, 'utf8'));

// Helper function to escape special characters for TypeScript string literals
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Get all markdown files
const fileNames = fs.readdirSync(postsDirectory);

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
    const code = data.code || '';
    
    if (!name || !code) {
      console.warn(`Missing name or code in department file: ${fileName}`);
      return null;
    }
    
    // Generate name variations for matching with data sources
    const nameVariations = [
      name,
      name.replace('California ', ''),
      name.startsWith('California ') ? name : `California ${name}`,
      // Add more specific variations to handle edge cases
      name === 'Air Resources Board' ? 'California Air Resources Board' : null,
    ].filter(Boolean); // Remove null values
    
    // Find matching names in spending data
    const spendingMatch = spendingData.agencies?.find(
      dept => nameVariations.some(variation => 
        dept.name === variation || 
        dept.name.toLowerCase() === variation.toLowerCase()
      )
    );
    
    // Find matching names in workforce data
    const workforceMatch = workforceData.find(
      dept => nameVariations.some(variation => 
        dept.name === variation || 
        dept.name.toLowerCase() === variation.toLowerCase()
      )
    );
    
    // Return mapping using the markdown name as the primary key
    return {
      slug,
      name,
      code,
      // Use the actual name from the data source if found, otherwise use the markdown name
      spendingName: spendingMatch?.name || name,
      workforceName: workforceMatch?.name || name
    };
  })
  .filter(item => item !== null);

// Read the current departmentMapping.ts file
const fileContent = fs.readFileSync(targetFile, 'utf8');

// Find the section with the departmentMappings array
const mappingsStartPattern = /export const departmentMappings: DepartmentMapping\[\] = \[/;
const mappingsEndPattern = /\];/;

// Generate the mappings code
const mappingsCode = mappings.map(mapping => {
  return `  {
    slug: '${escapeString(mapping.slug)}',
    fullName: '${escapeString(mapping.name)}',
    spendingName: '${escapeString(mapping.spendingName)}',
    workforceName: '${escapeString(mapping.workforceName)}'
  }`;
}).join(',\n');

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
  const updatedContent = contentLines.join('\n');
  fs.writeFileSync(targetFile, updatedContent);
  console.log(`Generated mappings for ${mappings.length} departments`);
} else {
  console.error('Could not find departmentMappings array in the target file');
  process.exit(1);
} 