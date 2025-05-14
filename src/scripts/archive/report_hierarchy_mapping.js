#!/usr/bin/env node

/**
 * Report on Department Hierarchy Script
 * 
 * Purpose:
 * - Matches department records between JSON and CSV sources
 * - Logs all matches and potential updates for review
 * - Tracks data sources for each match
 * - Identifies new department name variations for review
 * - Detects and logs fuzzy matches with strict single-match requirements
 * - Handles department abbreviations without adding them as aliases
 * 
* output to log
*  Name: 
*  Abbreviation: 
*  Code: 
*  Entity: 
*  Slug: 
*  Canonical Name: 
*  Aliases: 
*  Organization Level: 
*  Parent Agency: (only field to match to a parent)
*  Budget Status: 
*  _note: 
*  similar score: 
 * 
 * Steps:
 * 1. Initial Setup
 *    a. Load departments.json
 *    b. Setup logging
 *    c. Load and parse CSV file
 *    d. Initialize results tracking
 * 
 * 2. Department Processing
 *    a. Process each record from JSON and row from CSV
 *    c. Calculate similarity scores by fuzzy matching
 *      i. Identify similar department names, aliases, codes, and abbreviations
 *      ii. Enforce single-match requirement
 *      iii. Log fuzzy match errors
 *      iv. log and Track fuzzy match statistics
 *      v. log potential new aliases
 *    d. Log matches and potential updates
 *    e. Track statistics
 * 
 * 3. Results Generation
 *    a. Generate summary statistics
 *    b. Create detailed log entries
 *    c. Write results as hierarchical structure to log file
 *    d. Output console summary
 * 
 * Usage:
 * ```bash
 * node report_hierarchy_mapping.js
 * ```
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Configuration - Fixed paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEPARTMENTS_JSON_PATH = path.join(PROJECT_ROOT, 'src/data/departments.json');
const CSV_PATH = path.join(PROJECT_ROOT, 'src/data/department-structure-research.csv');
const LOG_DIR = path.join(PROJECT_ROOT, 'src/logs');

// Helper function to generate timestamped filename
function generateTimestampedFilename(scriptName) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')  // Replace colons and periods with hyphens
    .replace('T', '_')      // Replace T with underscore
    .replace('Z', '');      // Remove Z
  const baseName = path.basename(scriptName, '.js');
  return `${baseName}_${timestamp}.log`;
}

// Setup logging
const setupLogging = () => {
  const logFile = path.join(LOG_DIR, generateTimestampedFilename(__filename));
  
  const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    fs.appendFileSync(logFile, logMessage + '\n');
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };
  
  return { logFile, log };
};

// Main execution
const main = async () => {
  let log;
  let logFile;
  let departmentsData;
  let csvData;
  let results;
  
  try {
    // Step 1: Initial Setup
    const logging = setupLogging();
    log = logging.log;
    logFile = logging.logFile;
    log('\n=== STEP 1: INITIAL SETUP ===');
    
    // Step 1a: Load departments.json
    log('Step 1a: Loading departments.json...');
    departmentsData = JSON.parse(fs.readFileSync(DEPARTMENTS_JSON_PATH, 'utf8'));
    log(`Successfully loaded departments.json with ${departmentsData.departments.length} departments`);
    
    // Step 1b: Setup logging
    log('Step 1b: Logging system initialized');
    log(`Log file created at: ${logFile}`);
    
    // Step 1c: Load and parse CSV file
    log('Step 1c: Loading and parsing CSV file...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    csvData = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      comment: '#',
      delimiter: ',',
      trim: true,
      quote: '"'
    });
    log(`Successfully loaded CSV file with ${csvData.length} records`);
    
    // Step 1d: Initialize results tracking
    log('Step 1d: Initializing results tracking...');
    results = {
      total: departmentsData.departments.length,
      matched: 0,
      unmatched: 0,
      potentialAliases: 0,
      fuzzyMatchErrors: [],
      details: []
    };
    log('Initial setup complete\n');
    
    // Step 2: Department Processing
    log('\n=== STEP 2: DEPARTMENT PROCESSING ===');
    
    // Process each department
    for (const dept of departmentsData.departments) {
      log(`\nProcessing department: ${dept.canonicalName}`);
      
      // Step 2a: Process JSON and CSV records
      log('Step 2a: Processing department records...');
      const deptDetails = {
        department: dept.canonicalName,
        jsonData: {
          orgLevel: dept.orgLevel,
          parent_agency: dept.parent_agency,
          parent_agency_details: {
            type: typeof dept.parent_agency,
            isArray: Array.isArray(dept.parent_agency),
            value: dept.parent_agency,
            normalized: Array.isArray(dept.parent_agency) ? dept.parent_agency[0] : dept.parent_agency
          }
        }
      };
      
      // Step 2b: Calculate similarity scores
      log('Step 2b: Calculating similarity scores...');
      let bestMatch = null;
      let bestScore = 0;
      
      for (const csvRecord of csvData) {
        const score = calculateSimilarity(dept.canonicalName, csvRecord.Department);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = csvRecord;
        }
      }
      
      // Step 2c: Enforce single-match requirement
      log('Step 2c: Enforcing single-match requirement...');
      const similarMatches = csvData.filter(record => 
        calculateSimilarity(dept.canonicalName, record.Department) > 0.8
      );
      
      if (similarMatches.length > 1) {
        log(`Warning: Multiple potential matches found for ${dept.canonicalName}`);
        results.fuzzyMatchErrors.push({
          department: dept.canonicalName,
          matches: similarMatches.map(m => m.Department)
        });
      }
      
      // Step 2d: Log matches and potential updates
      log('Step 2d: Logging match details...');
      if (bestScore > 0.8) {
        results.matched++;
        deptDetails.status = 'matched';
        deptDetails.csvData = {
          name: bestMatch.Department,
          orgLevel: bestMatch.orgLevel,
          parent_agency: [bestMatch.parent_agency]
        };
        deptDetails.similarityScore = bestScore;
        
        // Check for potential new aliases
        const newAlias = logNewAlias(dept, bestMatch);
        if (newAlias) {
          results.potentialAliases++;
          deptDetails.newAlias = newAlias;
          log(`Found potential new alias: ${newAlias}`);
        }
      } else {
        results.unmatched++;
        deptDetails.status = 'unmatched';
        log(`No match found for ${dept.canonicalName}`);
      }
      
      // Step 2e: Track statistics
      log('Step 2e: Updating statistics...');
      results.details.push(deptDetails);
    }
    
    // Step 3: Results Generation
    log('\n=== STEP 3: RESULTS GENERATION ===');
    
    // Step 3a: Generate summary statistics
    log('Step 3a: Generating summary statistics...');
    const summaryStats = {
      total: results.total,
      matched: results.matched,
      unmatched: results.unmatched,
      potentialAliases: results.potentialAliases,
      fuzzyMatchErrors: results.fuzzyMatchErrors.length
    };
    
    // Step 3b: Write hierarchical structure
    log('Step 3c: Generating hierarchical structure...');
    const hierarchyOutput = buildHierarchy(results.details, log);
    fs.appendFileSync(logFile, '\n\nHierarchical Department Structure:\n--------------------------------\n');
    fs.appendFileSync(logFile, hierarchyOutput);
    
    // Step 3c: Output console summary
    log('Step 3d: Outputting console summary...');
    console.log('\nVerification Summary:');
    console.log('-------------------');
    console.log(`Total departments processed: ${summaryStats.total}`);
    console.log(`Matched departments: ${summaryStats.matched}`);
    console.log(`Unmatched departments: ${summaryStats.unmatched}`);
    console.log(`Potential new aliases: ${summaryStats.potentialAliases}`);
    console.log(`Fuzzy match errors: ${summaryStats.fuzzyMatchErrors}`);
    console.log(`\nDetailed results written to: ${logFile}`);
    
    log('\nProcessing complete');
    
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Helper function to normalize department names for matching
function normalizeForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,()]/g, '')  // Remove parentheses and commas
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .replace(/dept\.?\s+of/i, 'department of')  // Standardize "Dept of"
    .replace(/agency/i, 'agency')  // Standardize "Agency"
    .replace(/\s+/g, ' ')   // Normalize whitespace again
    .trim();
}

// Function to extract abbreviation from parentheses
function extractAbbreviation(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

// Function to calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1, str2) {
  const s1 = normalizeForMatching(str1);
  const s2 = normalizeForMatching(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return 1 - (distance / Math.max(longer.length, shorter.length));
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Function to check if two names match using the department's aliases
function _namesMatch(csvName, dept) {
  const normalizedCsvName = normalizeForMatching(csvName);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  // Direct match check
  if (normalizedCanonicalName === normalizedCsvName || 
      normalizedAliases.includes(normalizedCsvName)) {
    return true;
  }

  // Check abbreviation match
  const csvAbbr = extractAbbreviation(csvName);
  if (csvAbbr) {
    const normalizedAbbr = normalizeForMatching(csvAbbr);
    if (normalizedCanonicalName.includes(normalizedAbbr) || 
        normalizedAliases.some(alias => alias.includes(normalizedAbbr))) {
      return true;
    }
  }

  return false;
}

// Function to find fuzzy matches
function _findFuzzyMatches(csvName, departments) {
  const matches = departments.filter(dept => {
    const similarity = calculateSimilarity(csvName, dept.canonicalName);
    return similarity > 0.8; // 80% similarity threshold
  });

  if (matches.length > 1) {
    return {
      error: true,
      message: `Multiple fuzzy matches found for "${csvName}": ${matches.map(m => m.canonicalName).join(', ')}`
    };
  }

  return {
    error: false,
    match: matches[0]
  };
}

// Function to log potential new aliases
function logNewAlias(dept, csvRecord) {
  const normalizedCsvName = normalizeForMatching(csvRecord.Department);
  const normalizedCanonicalName = normalizeForMatching(dept.canonicalName);
  const normalizedAliases = (dept.aliases || []).map(alias => normalizeForMatching(alias));
  
  // Check for variations that should be aliases
  if (normalizedCanonicalName !== normalizedCsvName && !normalizedAliases.includes(normalizedCsvName)) {
    // Don't add abbreviations as aliases if they're in parentheses
    if (!csvRecord.Department.includes('(')) {
      return `Potential new alias found: "${csvRecord.Department}" for "${dept.canonicalName}"`;
    }
  }

  // Check for abbreviation matches that should be aliases
  const csvAbbr = extractAbbreviation(csvRecord.Department);
  if (csvAbbr) {
    const normalizedAbbr = normalizeForMatching(csvAbbr);
    if (normalizedCanonicalName.includes(normalizedAbbr) || 
        normalizedAliases.some(alias => alias.includes(normalizedAbbr))) {
      // Clean the abbreviation for the alias (remove special characters)
      const cleanAbbr = csvAbbr.replace(/[()]/g, '').trim();
      return `Potential new alias found (from abbreviation): "${cleanAbbr}" for "${dept.canonicalName}"`;
    }
  }

  // Check for common variations that should be aliases
  const commonVariations = [
    { from: /dept\.?\s+of/i, to: 'Department of' },
    { from: /dept\.?\s+of/i, to: 'Dept of' },
    { from: /agency/i, to: 'Agency' },
    { from: /board/i, to: 'Board' },
    { from: /commission/i, to: 'Commission' },
    { from: /committee/i, to: 'Committee' },
    { from: /office/i, to: 'Office' },
    { from: /bureau/i, to: 'Bureau' },
    { from: /division/i, to: 'Division' },
    { from: /branch/i, to: 'Branch' }
  ];

  for (const variation of commonVariations) {
    const variationMatch = csvRecord.Department.match(variation.from);
    if (variationMatch) {
      const normalizedVariation = normalizeForMatching(csvRecord.Department.replace(variation.from, variation.to));
      if (normalizedCanonicalName === normalizedVariation && !normalizedAliases.includes(normalizedVariation)) {
        // Clean the variation for the alias (remove special characters)
        const cleanVariation = csvRecord.Department.replace(/[()]/g, '').trim();
        return `Potential new alias found (from variation): "${cleanVariation}" for "${dept.canonicalName}"`;
      }
    }
  }

  return null;
}

// Replace BTreeNode and BTree classes with new DepartmentNode implementation
class DepartmentNode {
    constructor(department) {
        if (!department || !department.name) {
            throw new Error('Department must have a name');
        }
        this.department = department;
        this.children = [];
        this.parent = null;
        this.level = 0;
        this.subordinateOffices = 0;
    }

    addChild(node, logger) {
        if (!(node instanceof DepartmentNode)) {
            throw new Error('Child must be a DepartmentNode');
        }

        const oldParent = node.parent ? node.parent.department.name : 'none';
        const oldLevel = node.level;

        // Remove from previous parent if exists
        if (node.parent) {
            logger(`Removing ${node.department.name} from parent ${oldParent}`);
            const index = node.parent.children.indexOf(node);
            if (index !== -1) {
                node.parent.children.splice(index, 1);
            }
        }

        // Add to new parent
        this.children.push(node);
        node.parent = this;
        
        // Update levels based on parent relationship
        logger(`Updating levels for subtree starting at ${node.department.name}`);
        logger(`Before update: ${node.department.name} was level ${oldLevel}`);
        this.updateLevels(logger);
        logger(`After update: ${node.department.name} is now level ${node.level} (Parent: ${this.department.name}, Level: ${this.level})`);
        
        // Update subordinate counts
        this.updateSubordinateOffices();
    }

    updateLevels(logger) {
        const oldLevel = this.level;
        // Level is determined by distance from root
        this.level = this.parent ? this.parent.level + 1 : 0;
        
        if (oldLevel !== this.level) {
            logger(`Level changed for ${this.department.name}: ${oldLevel} -> ${this.level}`);
        }
        
        // Recursively update children's levels
        this.children.forEach(child => {
            logger(`Cascading level update to child: ${child.department.name}`);
            child.updateLevels(logger);
        });
    }

    updateSubordinateOffices() {
        this.subordinateOffices = this.children.length + 
            this.children.reduce((sum, child) => sum + child.subordinateOffices, 0);
        
        if (this.parent) {
            this.parent.updateSubordinateOffices();
        }
    }

    toJSON() {
        // Only include fields that have values
        const dept = {
            name: this.department.name
        };

        // Add optional fields only if they have values
        if (this.department.abbreviation) dept.abbreviation = this.department.abbreviation;
        if (this.department.organizationalCode) dept.organizationalCode = this.department.organizationalCode;
        if (this.department.entity) dept.entity = this.department.entity;
        if (this.department.slug) dept.slug = this.department.slug;
        if (this.department.canonicalName) dept.canonicalName = this.department.canonicalName;
        if (Array.isArray(this.department.aliases) && this.department.aliases.length > 0) {
            dept.aliases = this.department.aliases;
        }
        
        // Always include level as it's computed
        dept.organizationLevel = this.level;
        
        // Include parent agency if not root
        if (this.parent) {
            dept.parentAgency = this.parent.department.name;
        }

        // Include budget status if it exists and isn't 'matched'
        if (this.department.budget_status && this.department.budget_status !== 'matched') {
            dept.budgetStatus = this.department.budget_status;
        }

        // Include match information to help improve future matching
        if (this.department.similarityScore !== undefined) {
            dept.matchInfo = {
                score: Number(this.department.similarityScore.toFixed(2)),
                matchedName: this.department.matchedName,
                matchedAliases: this.department.matchedAliases,
                potentialNewAliases: this.department.potentialNewAliases
            };
        }

        // Sort and validate children
        const sortedChildren = [...this.children]
            .filter(child => child instanceof DepartmentNode)
            .sort((a, b) => a.department.name.localeCompare(b.department.name));

        const childrenJSON = sortedChildren
            .map(child => child.toJSON())
            .filter(Boolean);

        if (childrenJSON.length > 0) {
            dept.children = childrenJSON;
        }

        return dept;
    }

    toString() {
        return JSON.stringify(this.toJSON(), null, 2);
    }
}

class DepartmentHierarchy {
    constructor() {
        this.nodes = new Map();
        this.root = null;
    }

    addNode(department) {
        try {
            if (!department || !department.name) {
                throw new Error('Invalid department data');
            }

            if (!this.nodes.has(department.name)) {
                const node = new DepartmentNode(department);
                this.nodes.set(department.name, node);
                
                if (department.name === 'California State Government') {
                    this.root = node;
                    node.level = 0;
                }
            }
            return this.nodes.get(department.name);
        } catch (error) {
            console.error('Error adding node:', error.message, department);
            return null;
        }
    }

    addRelationship(childName, parentName, logger) {
        const childNode = this.nodes.get(childName);
        const parentNode = this.nodes.get(parentName);
        
        if (!childNode || !parentNode) {
            logger(`Failed to add relationship: Child=${childName}, Parent=${parentName} - One or both nodes not found`);
            return false;
        }

        // Prevent cycles
        if (this.wouldCreateCycle(childNode, parentNode)) {
            logger(`Warning: Skipping relationship ${childName} -> ${parentName} to prevent cycle`);
            return false;
        }

        logger(`Adding child ${childName} (Current Level: ${childNode.level}) to parent ${parentName} (Level: ${parentNode.level})`);
        
        // Add child to parent
        parentNode.addChild(childNode, logger);
        
        logger(`Relationship complete: ${childName} (New Level: ${childNode.level}) -> ${parentName} (Level: ${parentNode.level})`);
        return true;
    }

    wouldCreateCycle(childNode, parentNode) {
        // Check if adding this relationship would create a cycle
        let current = parentNode;
        while (current) {
            if (current === childNode) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    validateHierarchy(logger) {
        if (!this.root) {
            throw new Error('Hierarchy missing root node');
        }

        const validateNode = (node, expectedLevel = 0) => {
            if (node.level !== expectedLevel) {
                logger(`Level mismatch for ${node.department.name}: Expected ${expectedLevel}, Got ${node.level}`);
                throw new Error(`Invalid level for node: ${node.department.name}. Expected: ${expectedLevel}, Got: ${node.level}`);
            }

            logger(`Validated ${node.department.name}: Level ${node.level}, Children: ${node.children.length}`);
            
            // Validate each child is one level deeper
            node.children.forEach(child => {
                if (child.parent !== node) {
                    throw new Error(`Invalid parent reference for: ${child.department.name}`);
                }
                validateNode(child, expectedLevel + 1);
            });
        };

        validateNode(this.root, 0);
        return true;
    }

    toJSON() {
        return this.root ? this.root.toJSON() : {};
    }

    toString() {
        return JSON.stringify(this.toJSON(), null, 2);
    }
}

// Function to build department hierarchy
const buildHierarchy = (departments, logger) => {
    logger('Building hierarchy...');
    const hierarchy = new DepartmentHierarchy();
    
    // Add root node first - using data if available
    logger('Adding root node...');
    const rootDept = departments.find(d => d.department === 'California State Government');
    const rootNode = hierarchy.addNode({
        name: 'California State Government',
        slug: 'california_state_government',
        canonicalName: 'California State Government',
        aliases: [],
        budget_status: 'active',
        keyFunctions: 'State Government',
        abbreviation: rootDept?.jsonData?.abbreviation,
        code: rootDept?.jsonData?.organizationalCode,
        entity: rootDept?.jsonData?.entity,
        parent_agency: '',
        _note: rootDept?.jsonData?._note
    });

    if (!rootNode) {
        throw new Error('Failed to create root node');
    }

    // Track department counts
    let processedCount = 0;
    let addedCount = 0;
    let relationshipCount = 0;

    // First pass: Create all nodes
    logger('Creating department nodes...');
    departments.forEach((dept, index) => {
        processedCount++;
        try {
            // Map from results.details structure to department structure
            const normalizedDept = {
                name: dept.department || dept.name,
                canonicalName: dept.department || dept.canonicalName,
                slug: dept.slug || (dept.department || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                aliases: Array.isArray(dept.aliases) ? dept.aliases : [],
                budget_status: dept.status,
                parent_agency: dept.jsonData?.parent_agency_details?.normalized || 
                             dept.csvData?.parent_agency?.[0] || 
                             'California State Government',
                abbreviation: dept.jsonData?.abbreviation,
                code: dept.jsonData?.organizationalCode,
                entity: dept.jsonData?.entity,
                _note: dept.jsonData?._note,
                similarityScore: dept.similarityScore,
                matchedName: dept.csvData?.Department,
                matchedAliases: dept.csvData?.aliases,
                potentialNewAliases: dept.newAlias ? [dept.newAlias] : []
            };

            logger(`Processing department: ${normalizedDept.name} (Parent: ${normalizedDept.parent_agency})`);
            
            if (hierarchy.addNode(normalizedDept)) {
                addedCount++;
                if (dept.status === 'matched') {
                    logger(`Match found: ${normalizedDept.name} -> ${normalizedDept.matchedName} (score: ${normalizedDept.similarityScore})`);
                }
            } else {
                logger(`Warning: Failed to add department ${index}: ${normalizedDept.name}`);
            }
        } catch (error) {
            logger(`Error processing department ${index}: ${error.message}`);
            logger(`Department data: ${JSON.stringify(dept, null, 2)}`);
        }
    });

    // Second pass: Build relationships
    logger('\nBuilding relationships...');
    departments.forEach((dept, index) => {
        try {
            const childName = dept.department || dept.name;
            const parentName = dept.jsonData?.parent_agency_details?.normalized || 
                             dept.csvData?.parent_agency?.[0] || 
                             'California State Government';
            
            if (!childName) {
                logger(`Warning: Department ${index} has no name`);
                return;
            }

            if (childName === parentName) {
                logger(`Warning: Skipping self-referential department: ${childName}`);
                return;
            }

            logger(`Processing relationship: ${childName} -> ${parentName}`);
            if (hierarchy.addRelationship(childName, parentName, logger)) {
                relationshipCount++;
            } else {
                logger(`Warning: Could not create relationship between ${childName} and ${parentName}`);
            }
        } catch (error) {
            logger(`Error creating relationship for department ${index}: ${error.message}`);
        }
    });

    // Log department counts
    logger('\nDepartment Processing Summary:');
    logger(`Total departments processed: ${processedCount}`);
    logger(`Departments added to hierarchy: ${addedCount}`);
    logger(`Relationships established: ${relationshipCount}`);

    // Validate with detailed logging
    logger('\nValidating final hierarchy...');
    try {
        hierarchy.validateHierarchy(logger);
        logger('Hierarchy validation successful');
    } catch (error) {
        logger(`Hierarchy validation failed: ${error.message}`);
        throw error;
    }

    // Convert to JSON with validation
    logger('Converting to JSON...');
    const output = hierarchy.toJSON();
    if (!output || !output.name) {
        throw new Error('Invalid hierarchy output');
    }

    return JSON.stringify(output, null, 2);
};

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 