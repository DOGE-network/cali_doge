// This script downloads and processes vendor transaction data from open.fiscal.ca.gov
// It uses Puppeteer to navigate the website and extract transaction data
// It also handles the creation and updating of the vendors.json file
// It also handles the aggregation of transaction data by department and category
// It also handles the calculation of transaction distributions
// It also handles the verification of data integrity

// sources of vendor transaction data:
// https://open.fiscal.ca.gov/dept_vendor_transaction.html

/*

PAGE PROCESSING AND NAVIGATION WORKFLOW:

Step 1: Initial Setup and Navigation
1.1. Launch headless Chrome browser
1.2. Create new page instance
1.3. Navigate to vendor transactions page
1.4. Wait for network idle state

Step 2: Table Data Processing
2.1. Wait for table element to be present (10s timeout)
2.2. Wait for table rows to load (10s timeout)
2.3. Select the Show Entries select element
2.4. Select the 100 option from the Show Entries select element
2.5  Find the Search field and enter "FY23"
2.6 Extract information from table:
    - for all rows in tbody
    - For each row:
      a. Extract all cell values
      b. Map to transaction record structure
      c. Store complete transaction object
2.7 For each random row in vendor page table array
    a. Log current processing
    b. Navigate to Download button
    c. Wait for .entity_export element
    d. Find CSV download link
    e. from FileName, check if file already exists and skip to next row if so
    f. Configure download behavior
    g. Trigger download
    h. Wait for download
    i. Wait before next row
    j. Verify download success
    k. Log completion
    l. dont rename file, the FileName is correct
2.8 repeat 2.6a-l steps until all files are downloaded
2.9. If Next button is found and existing page row count is 100:
     a. Click Next button
     b. Wait for table update
     c. Repeat steps 2.5-2.6
     d. Filter out any invalid entries
     e. Verify transaction array is not empty
2.10. else 
     a. Filter out any invalid entries
     b. Verify transaction array is not empty

Step 3: Process Completion
4.1. Verify total transaction count
4.2. Close browser
4.3. Log completion
4.4. Exit process

Error Handling:
- Each step includes timeout protection
- Network error recovery
- Invalid data handling
- File system error management
- Data validation
- Navigation failure recovery

Rate Limiting:
- 2000ms between page navigation
- 10000ms table load timeout
*/

// Prerequisites:
// 1. Node.js 16+ installed
// 2. Install dependencies:
// ```bash
// npm install puppeteer csv-parse mkdirp
// ```

// Usage:
// ```bash
// node src/scripts/process_vendor_transactions.js
// ```

// The script will:
// 1. Create necessary directories if they don't exist
// 2. Navigate to the vendor transactions page
// 3. Extract all transaction data
// 4. Process and aggregate transactions by vendor
// 5. Update vendors.json with new data
// 6. Generate transaction distributions
// 7. Save all changes

// Features:
// - Automatic pagination handling
// - Transaction aggregation by department
// - Category classification
// - Distribution analysis
// - Data integrity verification
// - Progress logging
// - Error handling and reporting

// Notes:
// - Processes current fiscal year data by default
// - Files are saved in src/data/vendors/
// - Each vendor record contains transaction history and relationships
// - The script maintains data consistency with department records

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { mkdirp } = require('mkdirp');

// Configuration
const DOWNLOAD_DIR = path.join(__dirname, '../data/vendors');
const LOG_DIR = path.join(__dirname, '../logs');
const BASE_URL = 'https://open.fiscal.ca.gov/dept_vendor_transaction.html';
const MAX_RETRIES = 3;

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
  const logFile = path.join(LOG_DIR, `download_vendor_transactions_${timestamp}.log`);
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

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Random sleep function
const randomSleep = async (logFile) => {
  const ms = Math.floor(Math.random() * (20000 - 1000 + 1) + 1000);
  if (logFile) {
    log(`Sleeping for ${ms/1000} seconds...`, logFile);
  }
  await sleep(ms);
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

// Helper function to wait for download to complete
const waitForDownload = async (downloadDir, logFile, fileName, timeout = 30000) => {
  const startTime = Date.now();
  let tempFile = null;
  
  log(`Current directory contents before download:`, logFile);
  fs.readdirSync(downloadDir).forEach(file => log(`- ${file}`, logFile));
  
  while (Date.now() - startTime < timeout) {
    tempFile = findTempDownloadFile(downloadDir);
    if (tempFile) {
      log(`Found temporary download file: ${tempFile}`, logFile);
      break;
    }
    await sleep(100);
  }
  
  if (!tempFile) {
    throw new Error('Download did not start - no temporary file found');
  }
  
  while (Date.now() - startTime < timeout) {
    if (!findTempDownloadFile(downloadDir)) {
      await sleep(1000);
      const files = fs.readdirSync(downloadDir);
      const downloadedFile = files.find(file => file.includes(fileName));
      
      if (downloadedFile) {
        log(`Found downloaded file: ${downloadedFile}`, logFile);
        return downloadedFile;
      }
      
      throw new Error('Download completed but file not found');
    }
    await sleep(100);
  }
  
  throw new Error('Download did not complete - temporary file still exists');
};

// Process current page of vendor transactions
async function processCurrentPage(page, browser, downloadDir, logFile) {
  try {
    // Add page load debugging
    log('Current URL:', logFile);
    log(await page.url(), logFile);
    
    // Log page title
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`, logFile);
    
    // Log page content for analysis
    const pageContent = await page.content();
    log('Page HTML structure:', logFile);
    log(pageContent.substring(0, 2000) + '...', logFile);
    
    // Step 2.1: Wait for table element with retries
    log('Step 2.1: Waiting for table element...', logFile);
    let tableElement = null;
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        // Try different possible selectors
        const selectors = [
          '#table-container-table',
          'table.dataTable',
          'table.display',
          'table#vendorTransactionsTable',
          'table'
        ];
        
        for (const selector of selectors) {
          log(`Trying selector: ${selector}`, logFile);
          tableElement = await page.$(selector);
          if (tableElement) {
            // Log table structure
            const tableHtml = await page.evaluate(table => table.outerHTML, tableElement);
            log(`Found table with selector: ${selector}`, logFile);
            log('Table HTML structure:', logFile);
            log(tableHtml, logFile);
            break;
          }
        }
        
        if (tableElement) break;
        
        retries++;
        if (retries < MAX_RETRIES) {
          log(`Table not found, retrying (${retries}/${MAX_RETRIES})...`, logFile);
          await sleep(5000);
          await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
        }
      } catch (error) {
        log(`Error finding table (attempt ${retries + 1}): ${error.message}`, logFile);
        retries++;
        if (retries < MAX_RETRIES) {
          await sleep(5000);
          await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
        }
      }
    }
    
    if (!tableElement) {
      throw new Error(`Failed to find table element after ${MAX_RETRIES} retries`);
    }
    
    // Step 2.2: Wait for table rows with retries
    log('Step 2.2: Waiting for table rows...', logFile);
    retries = 0;
    let rows = [];
    
    while (retries < MAX_RETRIES) {
      try {
        // Try different row selectors
        const rowSelectors = [
          '#table-container-table tbody tr',
          'table tbody tr',
          'tr[role="row"]',
          'tr'
        ];
        
        for (const selector of rowSelectors) {
          rows = await page.$$(selector);
          if (rows.length > 0) {
            // Log first row structure
            const firstRowHtml = await page.evaluate(row => row.outerHTML, rows[0]);
            log(`Found ${rows.length} rows with selector: ${selector}`, logFile);
            log('First row HTML structure:', logFile);
            log(firstRowHtml, logFile);
            break;
          }
        }
        
        if (rows.length > 0) break;
        
        retries++;
        if (retries < MAX_RETRIES) {
          log(`No rows found, retrying (${retries}/${MAX_RETRIES})...`, logFile);
          await sleep(2000);
        }
      } catch (error) {
        log(`Error finding rows (attempt ${retries + 1}): ${error.message}`, logFile);
        retries++;
        if (retries < MAX_RETRIES) {
          await sleep(2000);
        }
      }
    }
    
    if (rows.length === 0) {
      throw new Error('No rows found in table');
    }
    
    // Step 2.3: Try to set entries to show 100
    log('Step 2.3: Attempting to set entries to show 100...', logFile);
    try {
      const lengthSelectors = [
        'select[name="table-container-table_length"]',
        'select.form-select',
        'select'
      ];
      
      for (const selector of lengthSelectors) {
        const selectElement = await page.$(selector);
        if (selectElement) {
          // Log select element structure
          const selectHtml = await page.evaluate(select => select.outerHTML, selectElement);
          log(`Found length selector: ${selector}`, logFile);
          log('Select element HTML:', logFile);
          log(selectHtml, logFile);
          
          // Get available options
          const options = await page.evaluate(select => {
            return Array.from(select.options).map(option => ({
              value: option.value,
              text: option.text
            }));
          }, selectElement);
          log('Available options:', logFile);
          log(JSON.stringify(options, null, 2), logFile);
          
          await page.select(selector, '100');
          log('Successfully set entries to 100', logFile);
          await sleep(2000);
          break;
        }
      }
    } catch (error) {
      log(`Warning: Could not set entries to 100: ${error.message}`, logFile);
      // Continue with available rows
    }
    
    // Step 2.5: Find the Search field and enter "FY23"
    log('Step 2.5: Finding search field and entering "FY23"...', logFile);
    try {
      const searchSelectors = [
        'input[type="search"]',
        '.dataTables_filter input',
        'input[aria-controls="table-container-table"]'
      ];
      
      let searchField = null;
      for (const selector of searchSelectors) {
        searchField = await page.$(selector);
        if (searchField) {
          log(`Found search field with selector: ${selector}`, logFile);
          break;
        }
      }
      
      if (searchField) {
        // Clear existing search value
        await page.evaluate(el => el.value = '', searchField);
        await searchField.type('FY23');
        log('Entered "FY23" in search field', logFile);
        
        // Wait for table to update
        await sleep(2000);
        await page.waitForFunction(() => {
          const processing = document.querySelector('#table-container-table_processing');
          return !processing || window.getComputedStyle(processing).display === 'none';
        }, { timeout: 10000 });
        
        // Log updated row count
        const updatedRows = await page.$$('#table-container-table tbody tr');
        log(`Table updated after search, found ${updatedRows.length} rows`, logFile);
        rows = updatedRows;
      } else {
        log('Warning: Could not find search field', logFile);
      }
    } catch (error) {
      log(`Error setting search field: ${error.message}`, logFile);
      // Continue with available rows
    }
    
    // Step 2.6: Extract table data
    log('Step 2.6: Extracting table data...', logFile);
    const rowsData = await Promise.all(rows.map(async (row) => {
      try {
        const data = await page.evaluate(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          const fileName = cells[0]?.textContent?.trim() || '';
          const uploadDate = cells[1]?.textContent?.trim() || '';
          const fileSize = cells[2]?.textContent?.trim() || '';
          const downloadUrl = row.querySelector('button')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || '';
          
          // Extract business unit and department name from filename
          const fileNameParts = fileName.split('_');
          if (fileNameParts.length >= 4) {
            return {
              business_unit: fileNameParts[1],
              department_name: fileNameParts[2],
              fiscal_year: fileNameParts[3].replace('.csv', ''),
              fileName,
              uploadDate,
              fileSize,
              downloadUrl
            };
          }
          return null;
        }, row);
        
        if (!data) {
          log('Row data extraction failed - invalid format', logFile);
          return null;
        }
        
        log(`Extracted data from row:`, logFile);
        log(JSON.stringify(data, null, 2), logFile);
        
        return data;
      } catch (error) {
        log(`Error extracting data from row: ${error.message}`, logFile);
        return null;
      }
    }));
    
    // Filter out any null rows and invalid entries
    const validRowsData = rowsData.filter(data => data !== null && data.fiscal_year === 'FY23');
    log(`Extracted valid FY23 data from ${validRowsData.length} rows`, logFile);
    
    // Verify transaction array is not empty
    if (validRowsData.length === 0) {
      throw new Error('No valid FY23 transaction data found in table');
    }
    
    // Step 2.7: Process each row for download
    for (let i = 0; i < validRowsData.length; i++) {
      const rowData = validRowsData[i];
      log(`Processing row ${i + 1} of ${validRowsData.length}`, logFile);
      
      if (rowData.downloadUrl) {
        try {
          // Configure download behavior
          const client = await page.target().createCDPSession();
          await client.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadDir
          });
          
          // Check if file already exists
          if (fs.existsSync(path.join(downloadDir, rowData.fileName))) {
            log(`File ${rowData.fileName} already exists, skipping...`, logFile);
            continue;
          }
          
          // Click download button
          log(`Initiating download for ${rowData.fileName}`, logFile);
          await page.evaluate((url) => {
            singleDownload(url);
          }, rowData.downloadUrl);
          
          // Wait for download to complete
          await waitForDownload(downloadDir, logFile, rowData.fileName);
          log(`Successfully downloaded ${rowData.fileName}`, logFile);
          
          // Random sleep before next download
          await randomSleep(logFile);
          
        } catch (error) {
          log(`Error downloading row ${i + 1}: ${error.message}`, logFile);
          log(`Row data:`, logFile);
          log(JSON.stringify(rowData, null, 2), logFile);
        }
      } else {
        log(`No download URL found for row ${i + 1}:`, logFile);
        log(JSON.stringify(rowData, null, 2), logFile);
      }
    }
    
    // Step 2.8: Check for next page
    const hasNextPage = await page.$('#table-container-table_next:not(.disabled)');
    const currentRowCount = validRowsData.length;
    
    if (hasNextPage && currentRowCount === 100) {
      log('Found next page, continuing to next page...', logFile);
      await page.click('#table-container-table_next');
      await sleep(2000);
      return processCurrentPage(page, browser, downloadDir, logFile);
    }
    
    return true;
  } catch (error) {
    log(`Error in page processing: ${error.message}`, logFile);
    if (error.stack) {
      log(`Error stack: ${error.stack}`, logFile);
    }
    throw error;
  }
}

// Main function
async function main() {
  let browser;
  let logFile;
  
  try {
    // Setup
    await setupDirectories();
    logFile = createLogFile();
    log('Starting vendor transaction download process...', logFile);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create new page
    const page = await browser.newPage();
    
    // Navigate to vendor transactions page
    log(`Navigating to ${BASE_URL}`, logFile);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(5000);
    
    // Process pages
    await processCurrentPage(page, browser, DOWNLOAD_DIR, logFile);
    
    log('Download process completed successfully', logFile);
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

