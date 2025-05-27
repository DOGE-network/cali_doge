/**
 * EIN Resolution Example Script
 * 
 * This script demonstrates how to use the EIN resolution utility
 * with environment variables loaded from .env.local.
 * 
 * Usage:
 *   node src/scripts/ein_resolution_example.js
 * 
 * Make sure to create a .env.local file in the project root with:
 *   SAM_API_KEY=your_sam_api_key_here
 */

// Import the JavaScript version of the module
const path = require('path');
const fs = require('fs');
const einResolution = require('../lib/einResolution.js');

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

// Example vendor names to lookup
const vendors = [
  { id: '1', name: 'Microsoft Corporation' },
  { id: '2', name: 'American Red Cross' },
  { id: '3', name: 'United Way' },
  { id: '4', name: 'Lockheed Martin' },
  { id: '5', name: 'Mayo Clinic' }
];

// Simplified error handler that displays only relevant information
function handleApiError(error, vendorName, source) {
  if (!error) return 'Unknown error';
  
  // Extract only the most useful parts from the error
  let errorMessage = `${source} API error: `;

  if (error.response) {
    // Server responded with a non-2xx status code
    if (error.response.status === 429) {
      return `${source} API rate limit exceeded (429). Please wait before making more requests.`;
    }
    
    errorMessage += `(${error.response.status}) `;
    
    if (error.response.data && typeof error.response.data === 'object') {
      if (error.response.data.message) {
        errorMessage += error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage += JSON.stringify(error.response.data.error);
      }
    } else {
      errorMessage += 'Invalid or restricted response';
    }
  } else if (error.request) {
    // Request was made but no response received
    errorMessage = `${source} API no response: Network or timeout issue`;
  } else if (error.message) {
    // Error setting up the request
    errorMessage = `${source} API issue: ${error.message}`;
  }
  
  return errorMessage;
}

// Function to run the example
async function runExample() {
  console.log('EIN Resolution Example');
  console.log('=====================');
  
  // The SAM_API_KEY is now loaded from .env.local by the einResolution module
  // This check just provides feedback to the user
  if (!process.env.SAM_API_KEY) {
    console.warn('Warning: SAM_API_KEY environment variable is not set.');
    console.warn('Business EIN lookups will be skipped.');
    console.warn('');
  } else {
    console.log('SAM_API_KEY found in environment variables');
    console.log('');
  }
  
  // Process each vendor
  console.log('Looking up EINs for example vendors...');
  console.log('');
  
  for (const vendor of vendors) {
    console.log(`Processing vendor: ${vendor.name}`);
    
    // Try nonprofit lookup first
    let lookup = { ein: null, matches: [], metadata: null };
    let source = 'ProPublica Nonprofit Explorer';
    
    try {
      lookup = await einResolution.lookupNonprofitEIN(vendor.name);
    } catch (error) {
      console.error(handleApiError(error, vendor.name, 'ProPublica Nonprofit'));
    }
    
    // If not found, try business lookup (requires SAM_API_KEY in .env.local)
    if (!lookup.ein && process.env.SAM_API_KEY) {
      try {
        console.log(`Looking up business EIN for: ${vendor.name} in CA`);
        lookup = await einResolution.lookupBusinessEIN(vendor.name);
        source = 'SAM.gov Entity API';
      } catch (error) {
        console.error(handleApiError(error, vendor.name, 'SAM.gov'));
      }
    }
    
    if (lookup.ein) {
      console.log(`✅ Found EIN: ${lookup.ein}`);
      console.log(`   Source: ${source}`);
      console.log(`   Confidence: ${lookup.metadata?.confidence.toFixed(2)}`);
      
      // Validate EIN format
      const isValid = einResolution.isValidEIN(lookup.ein);
      console.log(`   Valid format: ${isValid ? 'Yes' : 'No'}`);
      
      if (lookup.metadata) {
        // Print additional metadata if available
        if (lookup.metadata.orgType) {
          console.log(`   Organization Type: ${lookup.metadata.orgType}`);
        }
        if (lookup.metadata.ueiSAM) {
          console.log(`   UEIDAM: ${lookup.metadata.ueiSAM}`);
        }
        if (lookup.metadata.city && lookup.metadata.state) {
          console.log(`   Location: ${lookup.metadata.city}, ${lookup.metadata.state}`);
        }
      }
    } else {
      console.log(`❌ No EIN found for ${vendor.name}`);
    }
    
    console.log(''); // Empty line between vendors
    
    // Add a short delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Example completed.');
}

// Run the example
runExample().catch(error => {
  console.error('Error running example:', error.message);
  process.exit(1);
}); 