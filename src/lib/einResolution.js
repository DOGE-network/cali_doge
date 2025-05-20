/**
 * EIN Resolution Utilities
 * 
 * This module provides functions for resolving Employer Identification Numbers (EINs)
 * for vendors using various lookup methods and string similarity matching.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local file if it exists
const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  // Fall back to default .env
  dotenv.config();
}

/**
 * Helper function to retry API calls with exponential backoff
 * 
 * @param {Function} apiCallFn Function that returns a promise for the API call
 * @param {number} maxRetries Maximum number of retries
 * @param {number} initialDelay Initial delay in ms
 * @returns {Promise<any>} API response or throws error after all retries
 */
async function retryWithBackoff(apiCallFn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not the first attempt, log that we're retrying
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
        // Wait for the exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay for next attempt (exponential backoff)
        delay *= 2;
      }
      
      // Make the API call
      return await apiCallFn();
    } catch (error) {
      lastError = error;
      
      // If the error is not a rate limit (429), don't retry
      if (!error.response || error.response.status !== 429) {
        throw error;
      }
      
      // If we've used all our retries, throw the last error
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Rate limit exceeded (429). Will retry after delay.`);
    }
  }
  
  // This should never happen but just in case
  throw lastError;
}

/**
 * Calculate string similarity score between two strings
 * Uses a combination of Levenshtein distance and token matching
 * 
 * @param {string} str1 First string to compare
 * @param {string} str2 Second string to compare
 * @returns {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings for comparison
  const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const a = normalize(str1);
  const b = normalize(str2);
  
  // Simple case - exact match
  if (a === b) return 1;
  
  // Split into tokens and find matching tokens
  const tokensA = a.split(/\s+/);
  const tokensB = b.split(/\s+/);
  
  // Count matching tokens
  const matchingTokens = tokensA.filter(token => 
    tokensB.some(t => t === token || (token.length > 3 && t.includes(token)) || (t.length > 3 && token.includes(t)))
  ).length;
  
  // Calculate score based on token match percentage and length differences
  const tokenScore = (matchingTokens / Math.max(tokensA.length, tokensB.length));
  const lengthScore = 1 - (Math.abs(a.length - b.length) / Math.max(a.length, b.length));
  
  return (tokenScore * 0.7) + (lengthScore * 0.3);
}

/**
 * Validates if a string is a properly formatted EIN
 * Standard EIN format is XX-XXXXXXX (9 digits with hyphen after the first 2)
 * 
 * @param {string|null} ein The EIN string to validate
 * @returns {boolean} Whether the EIN is valid
 */
function isValidEIN(ein) {
  if (!ein) return false;
  
  // Standard format XX-XXXXXXX
  const standardPattern = /^\d{2}-\d{7}$/;
  
  // Allow format without hyphen but must be 9 digits
  const noHyphenPattern = /^\d{9}$/;
  
  return standardPattern.test(ein) || noHyphenPattern.test(ein);
}

/**
 * Format EIN to standard format (XX-XXXXXXX)
 * 
 * @param {string|null} ein Input EIN string (may or may not have hyphen)
 * @returns {string|null} Formatted EIN or null if invalid
 */
function formatEIN(ein) {
  if (!ein) return null;
  
  // Handle non-string values
  if (typeof ein !== 'string') {
    try {
      ein = String(ein);
    } catch (error) {
      console.error(`Error converting EIN to string:`, error);
      return null;
    }
  }
  
  // Remove any non-digit characters
  const digitsOnly = ein.replace(/\D/g, '');
  
  // Check if we have exactly 9 digits
  if (digitsOnly.length !== 9) return null;
  
  // Format as XX-XXXXXXX
  return `${digitsOnly.substring(0, 2)}-${digitsOnly.substring(2)}`;
}

/**
 * Look up EIN for a nonprofit organization using ProPublica's Nonprofit Explorer API
 * 
 * @param {string} vendorName Name of the vendor/organization
 * @returns {Promise<Object>} Object with EIN (if found) and potential matches
 */
async function lookupNonprofitEIN(vendorName) {
  console.log(`Looking up nonprofit EIN for: ${vendorName}`);
  
  return retryWithBackoff(async () => {
    try {
      // ProPublica Nonprofit Explorer API
      // See: https://projects.propublica.org/nonprofits/api
      const apiUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(vendorName)}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'CaliDoge/1.0 (Data Research Project; contact@example.org)'
        }
      });
      
      if (response.data && response.data.organizations && response.data.organizations.length > 0) {
        // Find best match
        let bestMatch = null;
        let bestScore = 0;
        
        for (const org of response.data.organizations) {
          const score = calculateStringSimilarity(vendorName, org.name);
          if (score > bestScore && score > 0.7) {
            bestScore = score;
            bestMatch = org;
          }
        }
        
        if (bestMatch) {
          // Validate and format the EIN - handle non-string values safely
          const formattedEIN = formatEIN(bestMatch.ein);
          
          if (formattedEIN) {
            return {
              ein: formattedEIN,
              matches: response.data.organizations,
              metadata: {
                source: 'ProPublica Nonprofit Explorer API',
                acquiredDate: new Date().toISOString(),
                confidence: bestScore,
                orgType: bestMatch.ntee_code,
                city: bestMatch.city,
                state: bestMatch.state
              }
            };
          }
        }
        
        return { 
          ein: null, 
          matches: response.data.organizations,
          metadata: null 
        };
      }
      
      return { ein: null, matches: [], metadata: null };
    } catch (error) {
      console.error(`Error in nonprofit EIN lookup:`, error.message);
      throw error;
    }
  });
}

/**
 * Look up EIN for a business entity using SAM.gov Entity API
 * 
 * @param {string} vendorName Name of the business
 * @param {string} state Optional state code to refine search
 * @returns {Promise<Object>} Object with EIN (if found) and potential matches
 */
async function lookupBusinessEIN(vendorName, state = 'CA') {
  console.log(`Looking up business EIN for: ${vendorName} in ${state}`);
  
  return retryWithBackoff(async () => {
    try {
      // SAM.gov Entity API requires an API key
      // Get from the environment variable loaded from .env.local
      const SAM_API_KEY = process.env.SAM_API_KEY;
      
      if (!SAM_API_KEY) {
        console.warn('SAM_API_KEY environment variable not set. Please add it to your .env.local file. Cannot look up business EINs through SAM.gov');
        return { ein: null, matches: [], metadata: null };
      }
      
      // SAM.gov Entity Management API - fixed parameter name to match API requirements
      // Documentation: https://open.gsa.gov/api/entity-api/
      const apiUrl = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_API_KEY}&q=${encodeURIComponent(vendorName)}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.data.entityData && response.data.entityData.length > 0) {
        // Find best match
        let bestMatch = null;
        let bestScore = 0;
        
        for (const entity of response.data.entityData) {
          if (entity.entityRegistration) {
            const entityName = entity.entityRegistration.legalBusinessName;
            const score = calculateStringSimilarity(vendorName, entityName);
            
            // Prioritize state match if provided
            const stateBonus = entity.coreData?.physicalAddress?.stateOrProvinceCode === state ? 0.1 : 0;
            
            if ((score + stateBonus) > bestScore && score > 0.65) {
              bestScore = score + stateBonus;
              bestMatch = entity;
            }
          }
        }
        
        if (bestMatch && bestMatch.entityRegistration) {
          // Format the TIN as an EIN - handle non-string values safely
          const tinRaw = bestMatch.entityRegistration.taxpayerIdentificationNumber;
          const formattedEIN = formatEIN(tinRaw);
          
          if (formattedEIN) {
            return {
              ein: formattedEIN,
              matches: response.data.entityData,
              metadata: {
                source: 'SAM.gov Entity API',
                acquiredDate: new Date().toISOString(),
                confidence: bestScore,
                ueiSAM: bestMatch.entityRegistration.ueiSAM,
                legalBusinessName: bestMatch.entityRegistration.legalBusinessName,
                city: bestMatch.coreData?.physicalAddress?.city?.name,
                state: bestMatch.coreData?.physicalAddress?.stateOrProvinceCode
              }
            };
          }
        }
        
        return { 
          ein: null, 
          matches: response.data.entityData,
          metadata: null 
        };
      }
      
      return { ein: null, matches: [], metadata: null };
    } catch (error) {
      console.error(`Error in business EIN lookup:`, error.message);
      throw error;
    }
  });
}

/**
 * Save checkpoint data during batch processing
 * 
 * @param {Object} checkpointData Checkpoint data to save
 * @param {string} checkpointDir Directory to save checkpoint files
 * @returns {string} Path to the saved checkpoint file
 */
function saveCheckpoint(checkpointData, checkpointDir) {
  try {
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointPath = path.join(checkpointDir, `ein_checkpoint_${timestamp}.json`);
    
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpointData, null, 2));
    console.log(`Checkpoint saved: ${checkpointPath}`);
    
    return checkpointPath;
  } catch (error) {
    console.error(`Error saving checkpoint: ${error}`);
    return '';
  }
}

/**
 * Load the latest checkpoint from checkpoint directory
 * 
 * @param {string} checkpointDir Directory containing checkpoint files
 * @returns {Object|null} The latest checkpoint data or null if none exists
 */
function loadLatestCheckpoint(checkpointDir) {
  try {
    if (!fs.existsSync(checkpointDir)) {
      return null;
    }
    
    const files = fs.readdirSync(checkpointDir)
      .filter(file => file.startsWith('ein_checkpoint_') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      return null;
    }
    
    const latestCheckpointPath = path.join(checkpointDir, files[0]);
    const checkpointData = JSON.parse(fs.readFileSync(latestCheckpointPath, 'utf8'));
    
    console.log(`Loaded checkpoint: ${latestCheckpointPath}`);
    console.log(`Resuming from vendor ${checkpointData.processedCount}/${checkpointData.totalCount}`);
    
    return checkpointData;
  } catch (error) {
    console.error(`Error loading checkpoint: ${error}`);
    return null;
  }
}

/**
 * Batch process vendors without EINs with checkpoint support
 * 
 * @param {Array} vendors Array of vendor objects without EINs
 * @param {number} batchSize Size of batches to process
 * @param {number} delayMs Delay between batches in milliseconds
 * @param {number} checkpointFrequency How often to save checkpoints (number of vendors processed)
 * @param {string} checkpointDir Directory to save checkpoint files
 * @param {boolean} resumeFromCheckpoint Whether to resume from latest checkpoint
 * @returns {Promise<Object>} Results object with counts
 */
async function batchResolveEINs(
  vendors,
  batchSize = 50,
  delayMs = 500,
  checkpointFrequency = 100,
  checkpointDir = path.join(process.cwd(), 'logs/checkpoints'),
  resumeFromCheckpoint = true
) {
  let results = {
    resolved: 0,
    failed: 0,
    total: vendors.length,
    results: []
  };
  
  let startIndex = 0;
  
  // Try to load checkpoint if resuming
  if (resumeFromCheckpoint) {
    const checkpoint = loadLatestCheckpoint(checkpointDir);
    if (checkpoint) {
      // Restore progress from checkpoint
      results.resolved = checkpoint.results.filter(r => r.ein).length;
      results.failed = checkpoint.results.filter(r => !r.ein).length;
      results.results = checkpoint.results;
      
      // Find where to resume from
      if (checkpoint.lastProcessedId) {
        const lastProcessedIndex = vendors.findIndex(v => v.id === checkpoint.lastProcessedId);
        if (lastProcessedIndex !== -1) {
          startIndex = lastProcessedIndex + 1;
        }
      }
      
      console.log(`Resuming from index ${startIndex}, already processed ${results.results.length} vendors`);
    }
  }
  
  // Start from where we left off
  for (let i = startIndex; i < vendors.length; i += batchSize) {
    const batch = vendors.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vendors.length/batchSize)}, vendors ${i+1}-${Math.min(i+batchSize, vendors.length)}`);
    
    // Process each vendor in the batch
    for (const vendor of batch) {
      try {
        // Skip if already processed (from checkpoint)
        if (results.results.some(r => r.id === vendor.id)) {
          continue;
        }
        
        // Try nonprofit lookup first
        let lookup = await lookupNonprofitEIN(vendor.name);
        
        // If not found, try business lookup
        if (!lookup.ein) {
          lookup = await lookupBusinessEIN(vendor.name);
        }
        
        if (lookup.ein) {
          results.resolved++;
          results.results.push({
            id: vendor.id,
            name: vendor.name,
            ein: lookup.ein,
            metadata: lookup.metadata
          });
        } else {
          results.failed++;
          results.results.push({
            id: vendor.id,
            name: vendor.name,
            ein: null,
            reason: 'No matches found'
          });
        }
      } catch (error) {
        // Handle the error gracefully
        let errorReason = 'Unknown error';
        if (error.response && error.response.status) {
          errorReason = `API error (${error.response.status})`;
          if (error.response.status === 429) {
            errorReason = 'Rate limit exceeded';
          }
        } else if (error.message) {
          errorReason = error.message;
        }
        
        results.failed++;
        results.results.push({
          id: vendor.id,
          name: vendor.name,
          ein: null,
          reason: `Error: ${errorReason}`
        });
      }
      
      // Save checkpoint periodically
      if ((results.resolved + results.failed) % checkpointFrequency === 0) {
        const checkpointData = {
          timestamp: new Date().toISOString(),
          processedCount: results.resolved + results.failed,
          totalCount: vendors.length,
          lastProcessedId: vendor.id,
          results: results.results
        };
        
        saveCheckpoint(checkpointData, checkpointDir);
        
        console.log(`Checkpoint saved at ${results.resolved + results.failed}/${vendors.length} vendors processed`);
        console.log(`Progress: ${Math.round((results.resolved + results.failed) / vendors.length * 100)}%`);
      }
      
      // Add delay between individual vendor lookups to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, Math.max(delayMs / batchSize, 200)));
    }
    
    // Save checkpoint after each batch
    const checkpointData = {
      timestamp: new Date().toISOString(),
      processedCount: results.resolved + results.failed,
      totalCount: vendors.length,
      lastProcessedId: batch[batch.length - 1].id,
      results: results.results
    };
    
    saveCheckpoint(checkpointData, checkpointDir);
    
    // Add delay between batches
    if (i + batchSize < vendors.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Final checkpoint at completion
  const finalCheckpointData = {
    timestamp: new Date().toISOString(),
    processedCount: results.resolved + results.failed,
    totalCount: vendors.length,
    lastProcessedId: vendors[vendors.length - 1]?.id || '',
    results: results.results
  };
  
  saveCheckpoint(finalCheckpointData, checkpointDir);
  
  return results;
}

/**
 * Spot-check EIN validity by sampling and validating
 * 
 * @param {Object} results EIN batch resolution results
 * @param {number} sampleSize Number of EINs to sample for manual verification
 * @returns {Object} Object with validation statistics
 */
function spotCheckEINs(results, sampleSize = 10) {
  const resolvedResults = results.results.filter(r => r.ein);
  
  if (resolvedResults.length === 0) {
    return {
      sampledCount: 0,
      validCount: 0,
      validPercent: 0,
      invalidEINs: []
    };
  }
  
  // Limit sample size to available results
  const actualSampleSize = Math.min(sampleSize, resolvedResults.length);
  const invalidEINs = [];
  
  // Take a random sample of resolved EINs
  const sampledIndices = new Set();
  while (sampledIndices.size < actualSampleSize) {
    sampledIndices.add(Math.floor(Math.random() * resolvedResults.length));
  }
  
  // Check format validity of each sampled EIN
  let validCount = 0;
  for (const index of Array.from(sampledIndices)) {
    const result = resolvedResults[index];
    if (isValidEIN(result.ein)) {
      validCount++;
    } else {
      invalidEINs.push({
        id: result.id,
        name: result.name,
        ein: result.ein
      });
    }
  }
  
  return {
    sampledCount: actualSampleSize,
    validCount,
    validPercent: (validCount / actualSampleSize) * 100,
    invalidEINs
  };
}

module.exports = {
  calculateStringSimilarity,
  lookupNonprofitEIN,
  lookupBusinessEIN,
  batchResolveEINs,
  isValidEIN,
  formatEIN,
  spotCheckEINs,
  saveCheckpoint,
  loadLatestCheckpoint
}; 