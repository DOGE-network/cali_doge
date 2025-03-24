// This script downloads the CSV files from the Public Pay website
// It uses Puppeteer to navigate the website and download the files
// It also handles the creation of the download directory
// It also handles the extraction of the entity ID from the link
// It also handles the download of the CSV file
// It also handles the closing of the browser

// sources of csv files:
// https://publicpay.ca.gov/Reports/State/State.aspx
// https://publicpay.ca.gov/Reports/SuperiorCourts/SuperiorCourts.aspx
// https://publicpay.ca.gov/Reports/HigherEducations/UniversityOfCalifornia.aspx
// https://publicpay.ca.gov/Reports/HigherEducations/StateUniversity.aspx
/*

PAGE PROCESSING AND NAVIGATION WORKFLOW:

Step 1: Initial Setup and Navigation
1.1. Launch headless Chrome browser
1.2. Create new page instance
1.3. Navigate to first BASE_URL array item
1.4. Wait for network idle state

Step 2: Table Data Processing
2.1. Wait for table element to be present (10s timeout)
2.2. Wait for table rows to load (10s timeout)
2.3  Select the Show Entities select element
2.4  Select the 100 option from the Show Entities select element
2.5. Extract information from table:
    - for all rows in tbody
    - For each row:
      a. Find first cell with link
      b. Extract court name from link text
      c. Parse entityId from link href
      d. Store {name, entityId, href} object
2.6  if Next button is found, navigate to next page repeat steps 2.1-2.5
2.7. Filter out any invalid entries
2.8. Verify array is not empty
2.9  Navigate to next BASE_URL array item unless it is the last item
2.10. Repeat steps 2.1-2.9 until all BASE_URL array items are processed
2.11 verify entity array count is greater than 240

Step 3: Court Processing Loop
3.1. For each random URL in entity array that is not a duplicate of a previous URL downloaded CSV file
    a. Log current processing
    b. Navigate to URL
    c. Wait for .entity_export element
    d. Find CSV download link
    e. from expected filename, check if file already exists and skip to next entity if so
    f. Configure download behavior
    g. Trigger download
    h. Wait for download
    i. Wait before next court
    j. Verify download success
    k. Log completion
    l. rename file as entityId_entityName_YYYY.csv
3.2 repeat steps 3.1 until all entities are downloaded

Step 4: Process Completion
4.1. When no more URLs:
    a. Close browser
    b. Log completion
    c. Exit process

Error Handling:
- Each step includes timeout protection
- Network error recovery
- Invalid data handling
- File system error management
- Download verification
- Navigation failure recovery

Rate Limiting:
- 2000ms between court processing
- 5000ms for download completion
- 10000ms table load timeout
- 10 retries for file checks
*/

// Public Pay Data Download Scripts

// download_publicpay_csv.js

// This script downloads employee salary data CSV files from publicpay.ca.gov for:
// - State departments
// - Superior courts
// - University of California campuses
// - California State University campuses

// Prerequisites

// 1. Node.js 16+ installed
// 2. Install dependencies:
// ```bash
// npm install
// ```

// Usage

// Run the script:
// ```bash
// npm run download-publicpay
// ```

// The script will:
// 1. Create a `src/data/workforce/raw` directory if it doesn't exist
// 2. Visit each main category page
// 3. Extract all department/entity links
// 4. Download CSV files for each entity
// 5. Save files with format: `YYYY_category_entityId_entityName.csv`

// Features

// - Automatic retry on failures (3 attempts)
// - Rate limiting (2 second delay between requests)
// - Progress logging
// - Error handling and reporting
// - Organized file naming

// Notes

// - Downloads are for the year 2023 by default (can be changed in the script)
// - Files are saved in `src/data/workforce/raw/`
// - Each CSV contains employee salary and benefits data
// - The script uses headless Chrome via Puppeteer 

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { mkdirp } = require('mkdirp');

// Configuration
const DOWNLOAD_DIR = path.join(__dirname, '../data/workforce');
const LOG_DIR = path.join(__dirname, '../logs');
const YEAR = '2023';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds delay between requests
const MAX_RETRIES = 3;

// URLs to scrape
const BASE_URLS = [
  'https://publicpay.ca.gov/Reports/State/State.aspx',
  'https://publicpay.ca.gov/Reports/SuperiorCourts/SuperiorCourts.aspx',
  'https://publicpay.ca.gov/Reports/HigherEducations/UniversityOfCalifornia.aspx',
  'https://publicpay.ca.gov/Reports/HigherEducations/StateUniversity.aspx'
];

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sleep function with random interval
const randomSleep = async (logFile) => {
  const ms = Math.floor(Math.random() * (20000 - 1000 + 1) + 1000); // Random between 1-20 seconds
  if (logFile) {
    log(`Sleeping for ${ms/1000} seconds...`, logFile);
  }
  await sleep(ms);
};

// Setup directories
const setupDirectories = async () => {
  await mkdirp(DOWNLOAD_DIR);
  await mkdirp(LOG_DIR);
  console.log(`Download directory: ${DOWNLOAD_DIR}`);
  console.log(`Log directory: ${LOG_DIR}`);
};

// Create log file
const createLogFile = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `download_publicpay_csv_${timestamp}.log`);
  return logFile;
};

// Logger function
const log = (message, logFile) => {
  if (!logFile) {
    console.error('LogFile parameter is missing');
    throw new Error('LogFile parameter is required for logging');
  }
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  fs.appendFileSync(logFile, logMessage + '\n');
};

// Helper function to find temporary download file
const findTempDownloadFile = (downloadDir) => {
  const files = fs.readdirSync(downloadDir);
  const tempFile = files.find(file => 
    file.endsWith('.csv.crdownload') || 
    file.endsWith('.csv.download') || 
    file.endsWith('.download') ||
    file.endsWith('.crdownload')
  );
  return tempFile;
};

// Helper function to find any CSV file that might match our entity
const _findMatchingCSV = (downloadDir, entityName, logFile) => {
  try {
    const files = fs.readdirSync(downloadDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    // Log all found CSV files for debugging
    log(`Found ${csvFiles.length} CSV files in directory:`, logFile);
    csvFiles.forEach(file => log(`- ${file}`, logFile));
    
    // First try to find exact match
    const exactMatch = csvFiles.find(file => file.includes(entityName));
    if (exactMatch) {
      log(`Found exact matching CSV file: ${exactMatch}`, logFile);
      return exactMatch;
    }
    
    // If no exact match, try to find a file containing parts of the entity name
    const nameParts = entityName.split(/[,\s]+/).filter(part => part.length > 3);
    for (const file of csvFiles) {
      for (const part of nameParts) {
        if (file.includes(part)) {
          log(`Found partial matching CSV file: ${file} (matched: ${part})`, logFile);
          return file;
        }
      }
    }
    
    return null;
  } catch (error) {
    log(`Error searching for matching CSV: ${error.message}`, logFile);
    return null;
  }
};

// Helper function to find and verify GccExport CSV file
const findAndVerifyGccExport = async (downloadDir, entityName, logFile) => {
  try {
    const files = fs.readdirSync(downloadDir);
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const expectedPrefix = `GccExport-${dateStr}`;
    
    log(`Looking for export file with prefix: ${expectedPrefix}`, logFile);
    
    const gccFiles = files.filter(file => 
      file.startsWith('GccExport-') && 
      file.endsWith('.csv')
    );
    
    if (gccFiles.length === 0) {
      log(`No GccExport CSV files found in directory`, logFile);
      return null;
    }
    
    log(`Found ${gccFiles.length} GccExport files:`, logFile);
    gccFiles.forEach(file => log(`- ${file}`, logFile));
    
    // Check each GccExport file's contents for the entity name
    for (const file of gccFiles) {
      const filePath = path.join(downloadDir, file);
      log(`Checking contents of ${file} for "${entityName}"`, logFile);
      
      try {
        // Use child_process.execSync to grep the file
        const cmd = `grep -l "${entityName}" "${filePath}"`;
        const result = require('child_process').execSync(cmd, { encoding: 'utf8' });
        
        if (result.includes(filePath)) {
          log(`Found matching entity "${entityName}" in file: ${file}`, logFile);
          return file;
        }
      } catch (grepError) {
        // grep returns non-zero exit code if no match found
        log(`No match found in ${file}`, logFile);
      }
    }
    
    log(`Entity "${entityName}" not found in any GccExport files`, logFile);
    return null;
  } catch (error) {
    log(`Error searching for GccExport file: ${error.message}`, logFile);
    return null;
  }
};

// Helper function to wait for download to complete
const waitForDownload = async (downloadDir, logFile, entityName, timeout = 30000) => {
  const startTime = Date.now();
  let tempFile = null;
  
  // Log directory contents before waiting
  log(`Current directory contents before download:`, logFile);
  fs.readdirSync(downloadDir).forEach(file => log(`- ${file}`, logFile));
  
  // First wait for temp file to appear
  while (Date.now() - startTime < timeout) {
    tempFile = findTempDownloadFile(downloadDir);
    if (tempFile) {
      log(`Found temporary download file: ${tempFile}`, logFile);
      break;
    }
    await sleep(100);
  }
  
  // If no temp file found, check for GccExport file
  if (!tempFile) {
    log(`No temporary file found, checking for GccExport file...`, logFile);
    const matchingFile = await findAndVerifyGccExport(downloadDir, entityName, logFile);
    
    if (matchingFile) {
      log(`Found and verified GccExport file: ${matchingFile}`, logFile);
      return matchingFile;
    }
    
    throw new Error('Download did not start - no temporary file or verified GccExport found');
  }
  
  // Then wait for temp file to disappear (download complete)
  while (Date.now() - startTime < timeout) {
    if (!findTempDownloadFile(downloadDir)) {
      // Wait a bit more to ensure file is fully written
      await sleep(1000);
      
      // Verify the downloaded file
      log(`Checking for downloaded GccExport file...`, logFile);
      const matchingFile = await findAndVerifyGccExport(downloadDir, entityName, logFile);
      
      if (matchingFile) {
        log(`Found and verified GccExport file after download: ${matchingFile}`, logFile);
        return matchingFile;
      }
      
      throw new Error('Download completed but GccExport file not found or not verified');
    }
    await sleep(100);
  }
  
  throw new Error('Download did not complete - temporary file still exists');
};

// Helper function to find and rename downloaded file
const findAndRenameDownload = async (downloadDir, entity, logFile) => {
  // Wait for any filesystem operations to complete
  await sleep(1000);
  
  const files = fs.readdirSync(downloadDir);
  const downloadedFile = files.find(file => 
    file.endsWith('.csv') && 
    (file.includes('download') || file.includes('Export'))
  );
  
  if (!downloadedFile) {
    throw new Error('Could not find downloaded CSV file');
  }
  
  const sanitizedName = entity.name.replace(/[^a-zA-Z0-9]/g, '_');
  const newFilename = `${entity.id}_${sanitizedName}_${YEAR}.csv`;
  const oldPath = path.join(downloadDir, downloadedFile);
  const newPath = path.join(downloadDir, newFilename);
  
  log(`Renaming ${downloadedFile} to ${newFilename}`, logFile);
  fs.renameSync(oldPath, newPath);
  
  return newPath;
};

// Download CSV for a single entity
async function _downloadCourtCSV(page, entityName, entityId, entityType, logFile) {
  if (!logFile) {
    throw new Error('LogFile parameter is required for downloadCourtCSV');
  }
  
  try {
    // Step 3.1.a: Log current processing
    log(`Processing download for ${entityName}`, logFile);

    // Step 3.1.b: Navigate to URL
    const entityUrl = `https://publicpay.ca.gov/Reports/${entityType}/${entityType}.aspx?entityid=${entityId}&year=2023`;
    await page.goto(entityUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    log(`Navigated to ${entityName}'s page`, logFile);

    // Log the page title and URL to verify we're on the right page
    const pageTitle = await page.title();
    const currentUrl = await page.url();
    log(`Current page title: ${pageTitle}`, logFile);
    log(`Current URL: ${currentUrl}`, logFile);

    // If we got redirected to an error page, retry once
    if (pageTitle.includes('Error') || currentUrl.includes('Error.aspx')) {
      log(`Got error page, retrying navigation...`, logFile);
      await sleep(2000);
      await page.goto(entityUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Check if we're still on error page
      const newTitle = await page.title();
      if (newTitle.includes('Error')) {
        throw new Error('Still on error page after retry');
      }
    }

    // Step 3.1.c: Wait for .entity_export element with increased timeout
    try {
      await page.waitForSelector('.entity_export', { timeout: 10000 });
    } catch (error) {
      // If we can't find .entity_export, try looking for any download link
      const downloadLink = await page.$('a[href*="Export"]');
      if (!downloadLink) {
        throw new Error('No download link found on page');
      }
    }
    
    // Step 3.1.d: Find CSV download link
    const csvLink = await page.$('.entity_export a.csv');
    if (!csvLink) {
      throw new Error('CSV link not found on entity page');
    }

    // Generate expected filename
    const sanitizedName = entityName.replace(/[^a-zA-Z0-9]/g, '_');
    const expectedFilename = `${YEAR}_${entityType}_${entityId}_${sanitizedName}.csv`;
    log(`Expected download filename: ${expectedFilename}`, logFile);

    // Step 3.1.e: Configure download behavior to save directly to target directory
    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_DIR
    });
    log(`Step 3.1.e: Download path set to: ${DOWNLOAD_DIR}`, logFile);

    // Step 3.1.f: Trigger download
    await csvLink.click();
    log(`Initiated download for ${entityName}`, logFile);

    // Step 3.1.g: Wait for download to complete
    await sleep(5000);

    // Step 3.1.i: Verify download success
    let downloadSuccess = false;
    let attempts = 0;
    while (!downloadSuccess && attempts < MAX_RETRIES) {
      attempts++;
      log(`Verifying download, attempt ${attempts}/${MAX_RETRIES}`, logFile);
      
      try {
        // Check if file exists in target directory
        const filePath = path.join(DOWNLOAD_DIR, expectedFilename);
        if (fs.existsSync(filePath)) {
          downloadSuccess = true;
          log(`Successfully downloaded CSV for ${entityName}`, logFile);
          break;
        }
      } catch (error) {
        log(`Download attempt ${attempts} failed: ${error.message}`, logFile);
        if (attempts < MAX_RETRIES) {
          log(`Retrying download in 2 seconds...`, logFile);
          await sleep(2000);
        }
      }
    }

    if (!downloadSuccess) {
      throw new Error(`Failed to download CSV after ${MAX_RETRIES} attempts`);
    }

    // Step 3.1.h: Wait before next entity
    await sleep(DELAY_BETWEEN_REQUESTS);

    return true;
  } catch (error) {
    log(`Error processing ${entityName}: ${error.message}`, logFile);
    
    // Log the full page HTML on error for debugging
    try {
      const errorPageHtml = await page.content();
      log(`Page HTML at time of error:\n${errorPageHtml}\n`, logFile);
    } catch (e) {
      log(`Could not capture error page HTML: ${e.message}`, logFile);
    }
    
    return false;
  }
}

// Process entities on current page
async function processCurrentPage(page, browser, downloadDir, logFile, existingEntities = []) {
  const url = await page.url();
  log('Step 2.0: Starting page processing', logFile);
  log(`Current URL: ${url}`, logFile);

  try {
    // Step 2.1: Wait for table element with retries
    log('Step 2.1: Waiting for table element...', logFile);
    
    const tableSelector = '#reportDataTable';
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        await page.waitForSelector(tableSelector, { timeout: 30000 });
        break;
      } catch (error) {
        retries++;
        log(`Step 2.1: Retry ${retries}/${maxRetries} - Table element not found: ${error.message}`, logFile);
        
        if (retries === maxRetries) {
          throw new Error(`Failed to find table element after ${maxRetries} retries`);
        }
        
        // Reload the page and wait before retrying
        await page.reload({ waitUntil: 'networkidle0' });
        await sleep(2000);
      }
    }
    
    await sleep(2000); // Wait for table to be fully loaded
    
    const tableHtml = await page.$eval(tableSelector, table => table.outerHTML);
    log('Step 2.1: Table element found and loaded', logFile);
    log(`Step 2.1: Table HTML structure:\n${tableHtml}`, logFile);

    // Step 2.2: Get all rows
    log('Step 2.2: Getting table rows...', logFile);
    
    const initialRows = await page.$$('tr[role="row"]:not(:first-child)');
    log(`Step 2.2: Found ${initialRows.length} rows in table`, logFile);

    // Step 2.3: Set entries to show 100 with retries
    log('Step 2.3: Setting entries to show 100...', logFile);

    const entriesSelector = '#reportDataTable_length select';
    const hasEntriesSelector = await page.$(entriesSelector);
    
    if (hasEntriesSelector) {
      log('Step 2.3: Found entries selector, attempting to set to 100...', logFile);
      
      const beforeHtml = await page.$eval(entriesSelector, el => el.outerHTML);
      log(`Step 2.3: Before change HTML:\n${beforeHtml}`, logFile);
      
      retries = 0;
      while (retries < maxRetries) {
        try {
          // Change the entries selector value
          await page.evaluate((selector) => {
            const select = document.querySelector(selector);
            select.value = '100';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }, entriesSelector);
          
          // Wait for processing indicator to appear and disappear
          log('Step 2.3: Waiting for table to update...', logFile);
          await page.waitForFunction(() => {
            const processing = document.querySelector('#reportDataTable_processing');
            return processing && window.getComputedStyle(processing).display !== 'none';
          }, { timeout: 5000 });
          
          await page.waitForFunction(() => {
            const processing = document.querySelector('#reportDataTable_processing');
            return processing && window.getComputedStyle(processing).display === 'none';
          }, { timeout: 30000 });
          
          break;
        } catch (error) {
          retries++;
          log(`Step 2.3: Retry ${retries}/${maxRetries} - Failed to update entries: ${error.message}`, logFile);
          
          if (retries === maxRetries) {
            log(`Step 2.3: Warning - Could not update entries after ${maxRetries} retries`, logFile);
            break;
          }
          
          await sleep(2000);
        }
      }
      
      // Additional wait to ensure table is fully loaded
      await sleep(2000);
      
      // Verify the change took effect
      const afterHtml = await page.$eval(entriesSelector, el => el.outerHTML);
      log(`Step 2.3: After change HTML:\n${afterHtml}`, logFile);
      
      const tableInfo = await page.$eval('#reportDataTable_info', el => el.textContent);
      log(`Step 2.3: Table info after change: ${tableInfo}`, logFile);
      
      // Count actual visible rows
      const updatedRowCount = await page.$$eval('#reportDataTable tbody tr', rows => rows.length);
      log(`Step 2.3: Number of visible rows: ${updatedRowCount}`, logFile);
      
      if (updatedRowCount > 10) {
        log('Step 2.3: Successfully increased entries shown', logFile);
        if (updatedRowCount < 100) {
          log(`Step 2.3: Warning - Expected 100 rows but found ${updatedRowCount}`, logFile);
        }
      } else {
        log(`Step 2.3: ERROR - Table did not update properly. Row count: ${updatedRowCount}`, logFile);
        // Log the current table state for debugging
        const tableState = await page.$eval('#reportDataTable', table => table.outerHTML);
        log(`Step 2.3: Current table state:\n${tableState}`, logFile);
      }
    } else {
      log('Step 2.3: No entries selector found on page', logFile);
      const pageHtml = await page.content();
      log(`Step 2.3: Full page HTML:\n${pageHtml}`, logFile);
    }

    // Step 2.4: Wait for table to be ready with retries
    log('Step 2.4: Waiting for table rows...', logFile);
    retries = 0;
    while (retries < maxRetries) {
      try {
        await page.waitForSelector('#reportDataTable tbody tr', { timeout: 10000 });
        const updatedTableRows = await page.$$('#reportDataTable tbody tr');
        log(`Step 2.4: Found ${updatedTableRows.length} rows ready for processing`, logFile);
        break;
      } catch (error) {
        retries++;
        log(`Step 2.4: Retry ${retries}/${maxRetries} - Failed to find table rows: ${error.message}`, logFile);
        
        if (retries === maxRetries) {
          throw new Error(`Failed to find table rows after ${maxRetries} retries`);
        }
        
        await sleep(2000);
      }
    }

    // Step 2.5: Extract entity information from table
    log('Step 2.5: Extracting entity information from table...', logFile);
    const entities = existingEntities; // Use existing array instead of creating new one
    log(`Step 2.5: Starting with ${entities.length} existing entities`, logFile);
    
    const updatedTableRows = await page.$$('#reportDataTable tbody tr');
    log(`Step 2.5: Processing ${updatedTableRows.length} table rows`, logFile);

    for (const row of updatedTableRows) {
      // Step 2.5.a: Find first cell with link
      log('Step 2.5.a: Looking for link in first cell...', logFile);
      const entityData = await page.evaluate(row => {
        const firstCell = row.querySelector('td:first-child');
        const link = firstCell?.querySelector('a');
        const name = link?.textContent?.trim();
        const href = link?.href || '';
        const id = href.match(/entityid=(\d+)/)?.[1];
        const type = href.toLowerCase().includes('reports/state/state') ? 'State' :
                    href.toLowerCase().includes('superiorcourts') ? 'SuperiorCourts' :
                    href.toLowerCase().includes('university') ? 'HigherEducations' : 'unknown';
        return { name, type, id, href, hasLink: !!link };
      }, row);

      if (entityData.name && entityData.id) {
        // Log each step of the extraction
        log(`Step 2.5.a: Found link in first cell: ${entityData.hasLink ? 'yes' : 'no'}`, logFile);
        log(`Step 2.5.b: Extracted name from link text: "${entityData.name}"`, logFile);
        log(`Step 2.5.c: Parsed entityId ${entityData.id} from href: ${entityData.href}`, logFile);
        
        // Store the entity
        delete entityData.hasLink;
        entities.push(entityData);
        log(`Step 2.5.d: Stored entity object: ${JSON.stringify(entityData)}`, logFile);
        log(`Step 2.5.d: Current entities array size: ${entities.length}`, logFile);
      } else {
        log(`Step 2.5: Warning - Invalid entity data in row: ${JSON.stringify(entityData)}`, logFile);
      }
    }

    log(`Step 2.5: Found ${entities.length} total entities to process`, logFile);
    if (entities.length > 0) {
      log(`Step 2.5: Sample entity data:\nName: ${entities[0].name}\nType: ${entities[0].type}\nID: ${entities[0].id}`, logFile);
    } else {
      log('Step 2.5: WARNING: No entities found in table', logFile);
      const pageHtml = await page.content();
      log(`Step 2.5: Full page HTML:\n${pageHtml}`, logFile);
      return entities;
    }

    // Step 2.6: Check for next page and process if found
    log('Step 2.6: Checking for next page button...', logFile);
    const currentPageEntities = updatedTableRows.length;
    log(`Step 2.6: Current page has ${currentPageEntities} entities`, logFile);
    
    if (currentPageEntities === 100) {
      const nextButton = await page.$('#reportDataTable_next:not(.disabled)');
      if (nextButton) {
        log('Step 2.6: Found next page button and exactly 100 entities on current page, processing next page', logFile);
        log(`Step 2.6: Current entities array size before pagination: ${entities.length}`, logFile);
        
        // Click next with retries
        retries = 0;
        let paginationSuccess = false;
        
        while (retries < maxRetries && !paginationSuccess) {
          try {
            // Get current page info before clicking
            const beforeInfo = await page.$eval('#reportDataTable_info', el => el.textContent);
            log(`Step 2.6: Current page info before click: ${beforeInfo}`, logFile);
            
            // Click and wait for initial processing indicator
            await nextButton.click();
            log('Step 2.6: Clicked next page button', logFile);
            
            // Wait for processing indicator to appear
            await page.waitForFunction(() => {
              const processing = document.querySelector('#reportDataTable_processing');
              return processing && window.getComputedStyle(processing).display !== 'none';
            }, { timeout: 5000 }).catch(() => {
              log('Step 2.6: Processing indicator did not appear, continuing...', logFile);
            });
            
            // Wait for processing indicator to disappear
            await page.waitForFunction(() => {
              const processing = document.querySelector('#reportDataTable_processing');
              return !processing || window.getComputedStyle(processing).display === 'none';
            }, { timeout: 30000 });
            
            // Additional wait for table stability
            await sleep(2000);
            
            // Verify page changed by checking info text changed
            const afterInfo = await page.$eval('#reportDataTable_info', el => el.textContent);
            log(`Step 2.6: Page info after click: ${afterInfo}`, logFile);
            
            if (beforeInfo !== afterInfo) {
              log('Step 2.6: Successfully navigated to next page', logFile);
              paginationSuccess = true;
            } else {
              throw new Error('Page info did not change after clicking next');
            }
            
          } catch (error) {
            retries++;
            log(`Step 2.6: Retry ${retries}/${maxRetries} - Failed to navigate: ${error.message}`, logFile);
            
            if (retries === maxRetries) {
              throw new Error(`Failed to navigate to next page after ${maxRetries} retries`);
            }
            
            // Wait longer between retries
            await sleep(5000);
          }
        }
        
        if (paginationSuccess) {
          // Process next page and add entities to our existing array
          log('Step 2.6: Starting processing of next page...', logFile);
          const nextPageEntities = await processCurrentPage(page, browser, downloadDir, logFile, entities);
          log(`Step 2.6: Next page returned ${nextPageEntities ? nextPageEntities.length : 0} entities`, logFile);
          return entities; // Return our accumulated entities array
        }
        
      } else {
        log('Step 2.6: No more pages to process', logFile);
      }
    } else {
      log(`Step 2.6: No pagination needed - found ${currentPageEntities} entities on this page`, logFile);
    }

    // Return the entities array with all accumulated entities
    return entities;
  } catch (error) {
    log(`Error in page processing: ${error.message}`, logFile);
    try {
      const pageHtml = await page.content();
      log(`Page HTML at time of error:\n${pageHtml}`, logFile);
    } catch (e) {
      log(`Failed to get page HTML: ${e.message}`, logFile);
    }
    throw error;
  }
}

async function processEntityDownload(page, entity, downloadDir, logFile, currentIndex, totalEntities) {
  if (!logFile) {
    throw new Error('LogFile parameter is required for processEntityDownload');
  }

  try {
    log(`Step 3.1: Processing entity ${currentIndex + 1} of ${totalEntities}: ${entity.name}`, logFile);
    log(`Step 3.1.a: Starting download for ${entity.name} (${entity.type}, ID: ${entity.id})`, logFile);

    // Step 3.1.e: Check if file already exists
    const sanitizedName = entity.name.replace(/[^a-zA-Z0-9]/g, '_');
    const expectedFilename = `${entity.id}_${sanitizedName}_${YEAR}.csv`;
    const filePath = path.join(downloadDir, expectedFilename);
    
    // Check if file exists and has content
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        log(`Step 3.1.e: File ${expectedFilename} already exists and has content, skipping download`, logFile);
        return true;
      }
    }
    
    log(`Step 3.1.e: File ${expectedFilename} does not exist or is empty, proceeding with download`, logFile);

    // Create CDP session for download handling
    const client = await page.target().createCDPSession();
    log(`Created CDP session for download handling`, logFile);

    // Random sleep before navigation
    await randomSleep(logFile);

    // Step 3.1.b: Navigate to URL - use the stored href from entity collection
    const entityUrl = entity.href;
    if (!entityUrl) {
      throw new Error('No URL found for entity');
    }
    log(`Step 3.1.b: Navigating to ${entityUrl}`, logFile);
    
    try {
      await page.goto(entityUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      log(`Step 3.1.b: Successfully navigated to entity page`, logFile);

      // Log the page title and URL to verify we're on the right page
      const pageTitle = await page.title();
      const currentUrl = await page.url();
      log(`Current page title: ${pageTitle}`, logFile);
      log(`Current URL: ${currentUrl}`, logFile);

      // If we got redirected to an error page, retry once with constructed URL
      if (pageTitle.includes('Error') || currentUrl.includes('Error.aspx')) {
        log(`Got error page, retrying with constructed URL...`, logFile);
        await randomSleep(logFile);
        const fallbackUrl = `https://publicpay.ca.gov/Reports/${entity.type}/${entity.type}Entity.aspx?entityid=${entity.id}&year=2023`;
        log(`Retrying with fallback URL: ${fallbackUrl}`, logFile);
        await page.goto(fallbackUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Check if we're still on error page
        const newTitle = await page.title();
        if (newTitle.includes('Error')) {
          throw new Error('Still on error page after retry');
        }
      }
    } catch (navigationError) {
      log(`Navigation error: ${navigationError.message}`, logFile);
      throw navigationError;
    }

    // Random sleep after navigation
    await randomSleep(logFile);

    // Step 3.1.c: Wait for export element
    log(`Step 3.1.c: Looking for export element...`, logFile);
    const exportSelector = '.entity_export';
    await page.waitForSelector(exportSelector, { timeout: 10000 });
    log(`Step 3.1.c: Found export element`, logFile);

    // Random sleep after finding element
    await randomSleep(logFile);

    // Step 3.1.d: Find CSV download link
    log(`Step 3.1.d: Looking for CSV download link...`, logFile);
    const csvLink = await page.$('.entity_export a.csv');
    if (!csvLink) {
      throw new Error('CSV link not found');
    }
    log(`Step 3.1.d: Found CSV download link`, logFile);

    // Random sleep before configuring download
    await randomSleep(logFile);

    // Step 3.1.f: Configure download behavior
    log(`Step 3.1.f: Configuring download behavior...`, logFile);
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
      eventsEnabled: true
    });
    log(`Step 3.1.f: Download path set to: ${downloadDir}`, logFile);

    // Random sleep before triggering download
    await randomSleep(logFile);

    // Step 3.1.g: Trigger download
    log(`Step 3.1.g: Initiating download...`, logFile);
    await csvLink.click();
    log(`Step 3.1.g: Download triggered`, logFile);

    // Step 3.1.h: Wait for download to complete
    log(`Step 3.1.h: Waiting for download to complete...`, logFile);
    await waitForDownload(downloadDir, logFile, entity.name);
    log(`Step 3.1.h: Download completed`, logFile);

    // Random sleep before renaming
    await randomSleep(logFile);

    // Step 3.1.l: Rename downloaded file
    log(`Step 3.1.l: Renaming downloaded file...`, logFile);
    const newFilePath = await findAndRenameDownload(downloadDir, entity, logFile);
    log(`Step 3.1.l: Successfully renamed file to: ${path.basename(newFilePath)}`, logFile);

    // Random sleep before next entity
    await randomSleep(logFile);

    // Cleanup CDP session
    await client.detach();

    // Step 3.1.k: Log completion
    log(`Step 3.1.k: Successfully completed download for ${entity.name}`, logFile);
    return true;

  } catch (error) {
    log(`Error in entity download process: ${error.message}`, logFile);
    
    // Enhanced error logging
    try {
      // Log the full page state
      const pageContent = await page.content();
      const truncatedContent = pageContent.substring(0, 500) + '... [truncated]';
      log(`Page content at time of error:\n${truncatedContent}`, logFile);
      
      // Log all page errors
      const pageErrors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error-message, .alert, .error'))
          .map(el => el.textContent);
      });
      if (pageErrors.length > 0) {
        log(`Page error messages:\n${pageErrors.join('\n')}`, logFile);
      }
      
      // If error was during download, check for GccExport file
      if (error.message.includes('Download did not start') || 
          error.message.includes('Download did not complete')) {
        log(`Double checking for GccExport file...`, logFile);
        const matchingFile = await findAndVerifyGccExport(downloadDir, entity.name, logFile);
        
        if (matchingFile) {
          log(`Found and verified GccExport file despite error: ${matchingFile}`, logFile);
          // Rename the file to our expected format
          const sanitizedName = entity.name.replace(/[^a-zA-Z0-9]/g, '_');
          const newFilename = `${entity.id}_${sanitizedName}_${YEAR}.csv`;
          const oldPath = path.join(downloadDir, matchingFile);
          const newPath = path.join(downloadDir, newFilename);
          
          fs.renameSync(oldPath, newPath);
          log(`Renamed verified file to: ${newFilename}`, logFile);
          return true;
        }
      }
    } catch (e) {
      log(`Error during enhanced error handling: ${e.message}`, logFile);
    }
    
    return false;
  }
}

// Main function to run the script
async function main() {
  let browser;
  let logFile;
  let allEntities = [];
  
  try {
    // Setup directories and create log file
    await setupDirectories();
    logFile = createLogFile();
    log('Starting download process...', logFile);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create new page
    const page = await browser.newPage();
    
    // Process each base URL in sequence
    for (let i = 0; i < BASE_URLS.length; i++) {
      const url = BASE_URLS[i];
      log(`Processing base URL ${i + 1}/${BASE_URLS.length}: ${url}`, logFile);
      
      try {
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        await sleep(5000); // Wait for page to stabilize
        
        // Process the current page and accumulate entities
        log(`Current total entities before processing URL: ${allEntities.length}`, logFile);
        const pageEntities = await processCurrentPage(page, browser, DOWNLOAD_DIR, logFile, allEntities);
        if (pageEntities && pageEntities.length > 0) {
          // No need to push or concat since we passed allEntities directly
          log(`Successfully processed ${url} - Total entities now: ${allEntities.length}`, logFile);
      } else {
          log(`Warning: No entities found for ${url}`, logFile);
        }
      } catch (error) {
        log(`Error processing URL ${url}: ${error.message}`, logFile);
        continue;
      }
      
      // Wait before processing next URL
      if (i < BASE_URLS.length - 1) {
        log(`Waiting before processing next URL...`, logFile);
      await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    // Log summary of collected entities
    log(`Total entities collected from all URLs: ${allEntities.length}`, logFile);
    log('Entity count by type:', logFile);
    const countByType = allEntities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {});
    Object.entries(countByType).forEach(([type, count]) => {
      log(`${type}: ${count} entities`, logFile);
    });

    // Step 2.11: Verify total entity count
    log('Step 2.11: Verifying total entity count...', logFile);
    if (!allEntities || !Array.isArray(allEntities)) {
      throw new Error('Step 2.11: ERROR - Entities array is invalid or undefined');
    }
    log(`Step 2.11: Found ${allEntities.length} total entities`, logFile);
    
    // Verify we have enough entities before proceeding
    if (allEntities.length < 240) {
      throw new Error(`Step 2.11: ERROR - Expected at least 240 entities but found ${allEntities.length}`);
    }
    log('Step 2.11: Successfully verified minimum entity count requirement', logFile);

    // After verification, download CSVs for all entities
    log(`Starting CSV downloads for ${allEntities.length} verified entities`, logFile);
    let successfulDownloads = 0;
    let failedDownloads = 0;
    
    for (let i = 0; i < allEntities.length; i++) {
      const entity = allEntities[i];
      try {
        const success = await processEntityDownload(page, entity, DOWNLOAD_DIR, logFile, i, allEntities.length);
        if (success) {
          successfulDownloads++;
        } else {
          failedDownloads++;
        }
        log(`Download progress: ${successfulDownloads} successful, ${failedDownloads} failed, ${allEntities.length - (i + 1)} remaining`, logFile);
      } catch (error) {
        failedDownloads++;
        log(`Error downloading CSV for ${entity.name}: ${error.message}`, logFile);
        continue;
      }
    }

    log(`Download process completed. Final results: ${successfulDownloads} successful, ${failedDownloads} failed`, logFile);
  } catch (error) {
    if (logFile) {
      log(`Fatal error: ${error.message}`, logFile);
    }
    console.error('Fatal error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});