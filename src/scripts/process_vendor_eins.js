/**
 * Vendor EIN Update Script
 * 
 * This script updates the Employer Identification Numbers (EINs) for vendors
 * using the EIN resolution system. It uses a combination of:
 * - ProPublica Nonprofit Explorer API (for nonprofits)
 * - SAM.gov Entity API (for business entities)
 * 
 * Usage:
 *   node src/scripts/update_vendor_eins.js [--batch-size=50] [--delay=500] [--checkpoint-freq=100]
 * 
 * Environment variables (in .env.local):
 *   SAM_API_KEY - API key for SAM.gov Entity API
 * 
 * To obtain a SAM.gov API key:
 * 1. Register at https://sam.gov/
 * 2. Navigate to your profile and select "API Keys"
 * 3. Generate a new key for the "Entity Management" API
 */

const path = require('path');
const fs = require('fs');
const einResolution = require('../lib/einResolution');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 50,
  delay: 500,
  checkpointFreq: 100,
  force: false
};

// Parse command line arguments
args.forEach(arg => {
  if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--delay=')) {
    options.delay = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--checkpoint-freq=')) {
    options.checkpointFreq = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--force') {
    options.force = true;
  }
});

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const ENHANCED_VENDORS_PATH = path.join(DATA_DIR, 'vendors.json');
const LOG_DIR = path.join(__dirname, '../logs');
const CHECKPOINT_DIR = path.join(LOG_DIR, 'checkpoints');

// Check if .env.local exists and show help if it doesn't
const envFile = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envFile)) {
  console.warn('Warning: .env.local file not found!');
  console.warn('');
  console.warn('Please create a .env.local file in the project root with the following content:');
  console.warn('');
  console.warn('SAM_API_KEY=your_sam_api_key_here');
  console.warn('');
  console.warn('You can obtain a SAM.gov API key by:');
  console.warn('1. Register at https://sam.gov/');
  console.warn('2. Navigate to your profile and select "API Keys"');
  console.warn('3. Generate a new key for the "Entity Management" API');
  console.warn('');
}

/**
 * Helper function to ensure directories exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Helper function to read existing vendor data
 */
function readExistingVendorData(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`Reading existing data from ${filePath}`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.warn(`Error reading existing data from ${filePath}: ${error.message}`);
  }
  return defaultData;
}

/**
 * Helper function to write vendor data
 */
function writeVendorData(data, filePath) {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote data to ${filePath}`);
  } catch (error) {
    console.error(`Error writing vendor data to ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Process EIN resolution for vendor data
 */
async function resolveVendorEINs(vendorsData) {
  console.log('Starting EIN resolution for vendors...');
  
  // Filter vendors without EINs or with force=true, get all vendors
  const vendorsToProcess = options.force 
    ? vendorsData.vendors 
    : vendorsData.vendors.filter(v => !v.ein);
  
  if (vendorsToProcess.length === 0) {
    console.log('All vendors already have EINs. Skipping resolution.');
    return;
  }
  
  console.log(`Found ${vendorsToProcess.length} vendors to process. Starting resolution process.`);
  
  // Prepare vendor list for batch processing
  const vendorList = vendorsToProcess.map(v => ({
    id: v.vendorName[0]?.name || 'unknown',
    name: v.vendorName[0]?.name || 'unknown'
  }));
  
  try {
    console.log(`EIN resolution configuration: Batch size=${options.batchSize}, Delay=${options.delay}ms, Checkpoint frequency=${options.checkpointFreq}`);
    
    // Process in batches with checkpoint support
    const batchResults = await einResolution.batchResolveEINs(
      vendorList,
      options.batchSize,
      options.delay,
      options.checkpointFreq,
      CHECKPOINT_DIR,
      true // Always try to resume from checkpoint
    );
    
    console.log(`EIN resolution complete: ${batchResults.resolved} resolved, ${batchResults.failed} failed`);
    
    // Spot check EIN validity
    const spotCheckResults = einResolution.spotCheckEINs(batchResults, 20); // Sample 20 EINs
    console.log(`EIN validation spot check: ${spotCheckResults.validCount}/${spotCheckResults.sampledCount} valid (${spotCheckResults.validPercent.toFixed(1)}%)`);
    
    if (spotCheckResults.invalidEINs.length > 0) {
      console.warn(`Found ${spotCheckResults.invalidEINs.length} invalid EINs in sample. First few: ${JSON.stringify(spotCheckResults.invalidEINs.slice(0, 3))}`);
    }
    
    // Update vendors with resolved EINs
    let updatedCount = 0;
    for (const result of batchResults.results) {
      if (result.ein) {
        // Only use EINs that pass validation
        if (einResolution.isValidEIN(result.ein)) {
          // Find the vendor in our data and update EIN
          const vendor = vendorsData.vendors.find(v => 
            v.vendorName.some(n => n.name === result.name)
          );
          
          if (vendor) {
            vendor.ein = result.ein;
            vendor.einSource = result.metadata?.source;
            vendor.einConfidence = result.metadata?.confidence;
            vendor.einAcquiredDate = result.metadata?.acquiredDate;
            updatedCount++;
            
            // Periodically save the entire vendor data to prevent loss on crash
            if (updatedCount % 1000 === 0) {
              console.log(`Saving interim enhanced vendor data after updating ${updatedCount} EINs`);
              writeVendorData(vendorsData, ENHANCED_VENDORS_PATH);
            }
          }
        }
      }
    }
    
    console.log(`Updated ${updatedCount} vendors with valid EINs`);
    
  } catch (error) {
    console.error(`Error in EIN resolution process: ${error.message}`);
  }
  
  console.log('Vendor EIN resolution process completed');
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    console.log('Vendor EIN Update Script');
    console.log('=======================');
    
    // Ensure required directories exist
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(LOG_DIR);
    ensureDirectoryExists(CHECKPOINT_DIR);
    
    // Load existing enhanced vendor data
    const defaultData = {
      vendors: [],
      processedFiles: [],
      lastProcessedFile: null,
      lastProcessedTimestamp: null,
      sources: [
        { name: 'California Fiscal Data Portal', url: 'https://fiscal.ca.gov/' }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    const enhancedVendorData = readExistingVendorData(ENHANCED_VENDORS_PATH, defaultData);
    
    // Check if we have vendors to process
    if (!enhancedVendorData.vendors || enhancedVendorData.vendors.length === 0) {
      console.error('No vendors found in the data file. Run process_vendors.ts first to generate vendor data.');
      return;
    }
    
    console.log(`Loaded ${enhancedVendorData.vendors.length} vendors from data file.`);
    const vendorsWithEIN = enhancedVendorData.vendors.filter(v => v.ein).length;
    console.log(`Current EIN coverage: ${vendorsWithEIN}/${enhancedVendorData.vendors.length} vendors (${Math.round(vendorsWithEIN/enhancedVendorData.vendors.length*100)}%)`);
    
    // Resolve EINs
    await resolveVendorEINs(enhancedVendorData);
    
    // Update lastUpdated timestamp
    enhancedVendorData.lastUpdated = new Date().toISOString();
    
    // Write the final enhanced vendor data
    console.log('Writing final enhanced vendor data with updated EINs');
    writeVendorData(enhancedVendorData, ENHANCED_VENDORS_PATH);
    
    console.log('EIN update completed successfully');
    
  } catch (error) {
    console.error(`Error in main process: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
}); 