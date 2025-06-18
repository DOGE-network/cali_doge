/**
 * process_json - Supabase Database Update Script
 * 
 * This script updates the Supabase database with the latest data from various JSON files.
 * It handles the following data types:
 * - Departments (departments.json)
 * - Programs (programs.json)
 * - Funds (funds.json)
 * - Budgets (budgets.json)
 * - Vendors (vendors_YYYY.json)
 * - Search Index (built from all data)
 * 
 * Script Steps:
 * 1. Environment Setup
 *    1.1. Load environment variables from .env.local
 *    1.2. Validate required environment variables
 *    1.3. Initialize Supabase client
 *    1.4. Initialize file logger
 * 
 * 2. Department Update (updateDepartments)
 *    2.1. Read and validate departments.json
 *    2.2. Validate required fields for each department
 *    2.3. Process departments in batches
 *    2.4. Upsert new department records
 *    2.5. Handle validation errors and logging
 *    2.6. Upsert department spending data
 *    2.7. Upsert department workforce data
 *    2.8. Upsert department distributions
 * 
 * 3. Program Update (updatePrograms)
 *    3.1. Read and validate programs.json
 *    3.2. Process programs in batches
 *    3.3. Map program data to database schema
 *    3.4. Upsert programs with conflict handling
 *    3.5. Handle optional fields and descriptions
 * 
 * 4. Fund Update (updateFunds)
 *    4.1. Read and validate funds.json
 *    4.2. Process funds in batches
 *    4.3. Map fund data to database schema
 *    4.4. Upsert funds with conflict handling
 *    4.5. Handle fund groups and descriptions
 * 
 * 5. Budget Update (updateBudgets)
 *    5.1. Read and validate budgets.json
 *    5.2. Delete existing database table records
 *    5.3. Process each department's budget
 *    5.4. insert budget records
 *    5.5. Process line items in batches
 *    5.6. Upsert missing project codes and fund codes
 * 
 * 6. Vendor Update (updateVendors)
 *    6.1. Find all vendor files (vendors_YYYY.json)
 *    6.2. Validate vendor data structure
 *    6.3  Delete existing database table records for each fiscal year
 *    6.4. Process vendors in batches for each fiscal year
 *    6.5. Insert vendors and get their IDs
 *    6.6. Process transactions for each vendor
 *    6.7. Insert transaction categories and descriptions
 * 
 * 7. Search Index Update (updateSearchIndex)
 *    7.1. Ensure search_index table has full-text search
 *    7.2. Fetch data from all tables
 *    7.3. Process search items in batches
 *    7.4. Map data to search index schema
 *    7.5. Upsert additional data fields
 *    7.6. Upsert with conflict handling
 * 
 * 8. Cleanup and Logging
 *    8.1. Log completion status
 *    8.2. Track failed updates
 *    8.3. Cleanup file logger
 *    8.4. Generate final status report
 * 
 * The script processes data in batches to avoid memory issues and provides detailed logging.
 * Each update function follows a similar pattern:
 * 1. Read and validate the source JSON file
 * 2. Delete existing data for the current year
 * 3. Process data in batches
 * 4. Upsert new data with proper error handling
 * 
 * Dependencies:
 * - @supabase/supabase-js: For database operations
 * - fs: For file operations
 * - path: For file path handling
 * - dotenv: For environment variable loading
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_SERVICE_ROLE: Supabase service role key
 * 
 * Data Files Required:
 * - src/data/departments.json
 * - src/data/programs.json
 * - src/data/funds.json
 * - src/data/budgets.json
 * - src/data/vendors_YYYY.json (where YYYY is the fiscal year)
 * 
 * Logging:
 * - Console logs for immediate feedback
 * - File logs in src/logs/process_json_YYYY-MM-DDTHH-mm-ss-SSSZ.log
 * - Transaction ID tracking for correlation
 * 
 * Error Handling:
 * - Validation errors are logged with details
 * - Database errors include stack traces
 * - Batch processing errors are tracked
 * - Failed updates are reported in final status
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import type { DepartmentData } from '../types/department';
import type { BudgetsJSON } from '../types/budget';
import type { ProgramsJSON } from '../types/program';
import type { Fund } from '../types/fund';

import { log, FileLogger, generateTransactionId } from '../lib/logging';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const transactionId = generateTransactionId();

// Initialize file logger first since we need it for logging
if (typeof FileLogger === 'undefined') {
  throw new Error('FileLogger is not available in this environment');
}
const fileLogger = FileLogger;

// Step 1: Environment Setup
log('INFO', transactionId, 'Starting Step 1: Environment Setup', { step: '1.0' });
fileLogger.log('Starting Step 1: Environment Setup');

// Step 1.1: Load environment variables
log('INFO', transactionId, 'Step 1.1: Loading environment variables', { step: '1.1', path: envPath });
fileLogger.log('Step 1.1: Loading environment variables');
log('INFO', transactionId, 'File exists', { step: '1.1', exists: fs.existsSync(envPath) });
fileLogger.log(`File exists: ${fs.existsSync(envPath)}`);

const result = dotenv.config({ path: envPath });
if (result.error) {
  log('ERROR', transactionId, 'Error loading .env.local', { step: '1.1', error: result.error });
  fileLogger.error(`Error loading .env.local: ${result.error}`);
  process.exit(1);
}

// Step 1.2: Validate required environment variables
log('INFO', transactionId, 'Step 1.2: Validating required environment variables', { step: '1.2' });
fileLogger.log('Step 1.2: Validating required environment variables');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE;

log('INFO', transactionId, 'Environment variables loaded', {
  step: '1.2',
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseServiceKey: !!supabaseServiceKey
});
fileLogger.log(`Environment variables loaded - Supabase URL: ${!!supabaseUrl}, Service Key: ${!!supabaseServiceKey}`);

if (!supabaseUrl || !supabaseServiceKey) {
  log('ERROR', transactionId, 'Missing required environment variables', {
    step: '1.2',
    message: 'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE are set in .env.local'
  });
  fileLogger.error('Missing required environment variables');
  process.exit(1);
}

// Step 1.3: Initialize Supabase client
log('INFO', transactionId, 'Step 1.3: Initializing Supabase client', { step: '1.3' });
fileLogger.log('Step 1.3: Initializing Supabase client');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Step 1.4: Initialize file logger
log('INFO', transactionId, 'Step 1.4: Initializing file logger', { step: '1.4' });
fileLogger.log('Step 1.4: Initializing file logger');

log('INFO', transactionId, 'Step 1: Environment Setup completed', { step: '1.0' });
fileLogger.log('Step 1: Environment Setup completed');

// Configuration
const config = {
  batchSize: 100,
  dataDir: path.join(process.cwd(), 'src/data'),
  currentYear: new Date().getFullYear()
} as const;



interface ProcessingResult {
  success: boolean;
  message: string;
  data?: unknown;
}



interface DepartmentWorkforce {
  department_code: string;
  fiscal_year: number;
  head_count: number;
  total_wages: number | null;
}



interface ProgramData {
  projectCode: string;
  name: string;
  programDescriptions?: Array<{
    description: string;
    source: string | string[];
  }>;
  departmentCode?: string;
  fiscalYear?: number;
}

/**
 * VendorDepartment matches the structure of vendors_2024.json:
 * ...
 */
//
// --- VENDORS TABLE DEFINITION (REFERENCE) ---
// CREATE TABLE vendors (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   name TEXT NOT NULL,
//   ein TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
//
//  ALTER TABLE vendors ADD CONSTRAINT vendors_name_unique UNIQUE (name);
// );
//
// CREATE TABLE vendor_transactions (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
//   fiscal_year INTEGER NOT NULL,
//   amount DECIMAL(20, 2) NOT NULL,
//   transaction_date TIMESTAMPTZ,
//   transaction_count INTEGER NOT NULL,
//   department_code TEXT REFERENCES departments(organizational_code),
//   program_code TEXT REFERENCES programs(project_code),
//   fund_code TEXT REFERENCES funds(fund_code),
//   category TEXT,
//   description TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// Correct type for vendors_2024.json:
/**
 * VendorDepartment matches the structure of vendors_2024.json:
 * {
 *   t: [
 *     {
 *       n: string, // vendor name
 *       d: [
 *         {
 *           n: string, // department name
 *           oc: number, // org code
 *           at: [
 *             {
 *               t: string, // type
 *               ac: [
 *                 {
 *                   c: string, // category
 *                   asc: [
 *                     {
 *                       sc: string, // subcategory
 *                       ad: [
 *                         {
 *                           d: string, // description
 *                           pc: string, // program code
 *                           fc: string, // fund code
 *                           a: number, // amount
 *                           ct: number // count
 *                         }
 *                       ]
 *                     }
 *                   ]
 *                 }
 *               ]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
interface VendorDepartment {
  n: string;
  d: Array<{
    n: string;
    oc: string;  // Changed from number to string
    at: Array<{
      t: string;
      ac: Array<{
        c: string;
        asc: Array<{
          sc: string;
          ad: Array<{
            d: string;
            pc: string;
            fc: string;
            a: number;
            ct: number;
          }>;
        }>;
      }>;
    }>;
  }>;
}

// eslint-disable-next-line no-unused-vars
interface VendorData {
  t: VendorDepartment[];
}

interface DatabaseVendorTransaction {
  vendor_id: string;
  fiscal_year: number;
  amount: number;
  transaction_date: Date | null;
  transaction_count: number;
  department_code?: string;
  program_code?: string;
  fund_code?: string;
  category?: string;
  description?: string;
}





interface DepartmentsJSON {
  departments: DepartmentData[];
}

/**
 * Process data in batches to avoid memory issues
 * @param items Array of items to process
 * @param batchSize Size of each batch
 * @param processFn Function to process each batch
 * @param context Context for logging
 * @returns ProcessingResult indicating success or failure
 */
async function processBatches<T>(
  items: T[],
  batchSize: number,
  // eslint-disable-next-line no-unused-vars
  processFn: (batch: T[]) => Promise<void>,
  context: string
): Promise<ProcessingResult> {
  try {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    log('INFO', transactionId, `Processing ${batches.length} batches of size ${batchSize}`, { context });
    fileLogger.log(`Processing ${batches.length} batches of size ${batchSize} for ${context}`);
    
    for (let i = 0; i < batches.length; i++) {
      log('INFO', transactionId, `Processing batch ${i + 1}/${batches.length}`, { context });
      fileLogger.log(`Processing batch ${i + 1}/${batches.length} for ${context}`);
      await processFn(batches[i]);
    }

    return {
      success: true,
      message: `Successfully processed ${batches.length} batches`
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', transactionId, `Failed to process batches: ${errorMessage}`, { context, error });
    fileLogger.error(`Failed to process batches for ${context}: ${errorMessage}`);
    return {
      success: false,
      message: `Failed to process batches: ${errorMessage}`
    };
  }
}

/**
 * Update vendors data in the database
 * 
 * This function:
 * 1. Finds all vendor files (vendors_YYYY.json)
 * 2. Validates the data structure
 * 3. Deletes existing vendor data for the current year
 * 4. Processes vendors in batches:
 *    - Upsert vendors to get their IDs
 *    - Maps vendor names to IDs
 *    - Processes transactions for each vendor
 *    - Upsert transactions in batches
 * 
 * Data Structure:
 * - VendorDepartment: { n: string, d: Array<{ n: string, oc: number, at: Array<{ t: string, ac: Array<{ c: string, asc: Array<{ sc: string, ad: Array<{ d: string, pc: string, fc: string, a: number, ct: number }> }> }> }> }
 * - VendorAccountType: { t: string, ac: VendorAccountCategory[] }
 * - VendorAccountCategory: { c: string, asc: VendorAccountSubCategory[] }
 * - VendorAccountSubCategory: { sc: string, ad: VendorTransaction[] }
 * - VendorTransaction: { amount: number, date?: string, ... }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updateVendors(): Promise<ProcessingResult> {
  const context = 'updateVendors';
  
  // Step 6: Vendor Update
  log('INFO', transactionId, 'Starting Step 6: Vendor Update', { step: '6.0', context });
  fileLogger.log('Starting Step 6: Vendor Update');
  
  try {
    // Step 6.1: Find all vendor files
    log('INFO', transactionId, 'Step 6.1: Finding all vendor files', { step: '6.1', context });
    fileLogger.log('Step 6.1: Finding all vendor files');
    
    const vendorFiles = fs.readdirSync(config.dataDir)
      .filter(file => file.startsWith('vendors_') && file.endsWith('.json'))
      .sort();

    if (vendorFiles.length === 0) {
      log('ERROR', transactionId, 'No vendor files found in data directory', { step: '6.1', context });
      fileLogger.error('No vendor files found in data directory');
      return {
        success: false,
        message: 'No vendor files found in data directory'
      };
    }

    // Process each vendor file
    for (const vendorFile of vendorFiles) {
      const filePath = path.join(config.dataDir, vendorFile);
      const fiscalYear = parseInt(vendorFile.replace('vendors_', '').replace('.json', ''));
      
      log('INFO', transactionId, `Processing vendor file: ${vendorFile} for fiscal year ${fiscalYear}`, { step: '6.1', context });
      fileLogger.log(`Processing vendor file: ${vendorFile} for fiscal year ${fiscalYear}`);
      
      if (!fs.existsSync(filePath)) {
        log('ERROR', transactionId, `${vendorFile} does not exist`, { step: '6.1', context });
        fileLogger.error(`${vendorFile} does not exist`);
        continue;
      }

      // Step 6.2: Validate vendor data structure
      log('INFO', transactionId, 'Step 6.2: Validating vendor data structure', { step: '6.2', context });
      fileLogger.log('Step 6.2: Validating vendor data structure');
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { t: VendorDepartment[] };
      if (!data.t || !Array.isArray(data.t)) {
        log('ERROR', transactionId, 'Invalid vendors data structure', { 
          step: '6.2',
          context,
          data: JSON.stringify(data).slice(0, 1000) // Log first 1000 chars of data for debugging
        });
        fileLogger.error('Invalid vendors data structure');
        continue;
      }

      // Step 6.3: Delete existing database table records for this fiscal year
      log('INFO', transactionId, `Step 6.3: Deleting existing database table records for fiscal year ${fiscalYear}`, { step: '6.3', context });
      fileLogger.log(`Step 6.3: Deleting existing database table records for fiscal year ${fiscalYear}`);

      // First get all vendor IDs that have transactions for this fiscal year
      const { data: vendorIds, error: fetchError } = await supabase
        .from('vendor_transactions')
        .select('vendor_id')
        .eq('fiscal_year', fiscalYear);

      if (fetchError) {
        log('ERROR', transactionId, `Error fetching vendor IDs: ${fetchError.message}`, { 
          step: '6.3', 
          context,
          error: fetchError
        });
        fileLogger.error(`Error fetching vendor IDs: ${fetchError.message}`);
        throw fetchError;
      }

      // Delete existing transactions for the fiscal year
      const { error: deleteError } = await supabase
        .from('vendor_transactions')
        .delete()
        .eq('fiscal_year', fiscalYear);

      if (deleteError) {
        log('ERROR', transactionId, `Error deleting existing transactions: ${deleteError.message}`, { 
          step: '6.3', 
          context,
          error: deleteError
        });
        fileLogger.error(`Error deleting existing transactions: ${deleteError.message}`);
        throw deleteError;
      }

      // Delete vendors that had transactions for this fiscal year
      if (vendorIds && vendorIds.length > 0) {
        const { error: deleteVendorError } = await supabase
          .from('vendors')
          .delete()
          .in('id', vendorIds.map(v => v.vendor_id));

        if (deleteVendorError) {
          log('ERROR', transactionId, `Error deleting existing vendors: ${deleteVendorError.message}`, { 
            step: '6.3', 
            context,
            error: deleteVendorError
          });
          fileLogger.error(`Error deleting existing vendors: ${deleteVendorError.message}`);
          throw deleteVendorError;
        }
      }

      // Step 6.4: Process vendors in batches for this fiscal year
      log('INFO', transactionId, `Step 6.4: Processing vendors in batches for fiscal year ${fiscalYear}`, { step: '6.4', context });
      fileLogger.log(`Step 6.4: Processing vendors in batches for fiscal year ${fiscalYear}`);
      
      await processBatches(
        data.t,
        config.batchSize,
        async (batch) => {
          // Step 6.5: Upsert vendors
          log('INFO', transactionId, 'Step 6.5: Upserting vendors', { step: '6.5', context, batchSize: batch.length });
          fileLogger.log(`Step 6.5: Upserting ${batch.length} vendors`);

          const vendorsToUpsert = batch.map((vendor: VendorDepartment) => ({
            name: vendor.n,
            ein: '' // No EIN in this structure
          }));

          log('DEBUG', transactionId, 'Vendor data to upsert:', { 
            step: '6.5', 
            context,
            sample: vendorsToUpsert.slice(0, 2)
          });
          fileLogger.log(`Vendor data to upsert: ${JSON.stringify(vendorsToUpsert.slice(0, 2), null, 2)}`);

          const { data: upsertedVendors, error: upsertError } = await supabase
            .from('vendors')
            .upsert(vendorsToUpsert, { onConflict: 'name' })
            .select('id, name');

          if (upsertError) {
            log('ERROR', transactionId, `Error upserting vendors: ${upsertError.message}`, { 
              step: '6.5', 
              context,
              error: upsertError
            });
            fileLogger.error(`Error upserting vendors: ${upsertError.message}`);
            throw upsertError;
          }

          log('INFO', transactionId, `Successfully upserted ${upsertedVendors.length} vendors`, { 
            step: '6.5', 
            context 
          });
          fileLogger.log(`Successfully upserted ${upsertedVendors.length} vendors`);

          // Step 6.6: Process transactions
          log('INFO', transactionId, 'Step 6.6: Processing transactions', { step: '6.6', context });
          fileLogger.log('Step 6.6: Processing transactions');

          const transactions: DatabaseVendorTransaction[] = [];
          const vendorMap = new Map(upsertedVendors.map(v => [v.name, v.id]));

          // Track unique program codes and their details
          const programDetails = new Map<string, { name: string; description: string }>();

          for (const vendor of batch) {
            const vendorId = vendorMap.get(vendor.n);
            if (!vendorId) {
              log('WARN', transactionId, `No ID found for vendor: ${vendor.n}`, { step: '6.6', context });
              fileLogger.log(`No ID found for vendor: ${vendor.n}`);
              continue;
            }
            for (const dept of vendor.d) {
              for (const accountType of dept.at) {
                for (const category of accountType.ac) {
                  for (const subcategory of category.asc) {
                    for (const tx of subcategory.ad) {
                      if (tx.pc) {
                        // Store program details from the transaction
                        programDetails.set(tx.pc, {
                          name: subcategory.sc, // Use subcategory as name
                          description: tx.d      // Use transaction description
                        });
                      }
                      transactions.push({
                        vendor_id: vendorId,
                        fiscal_year: fiscalYear,
                        amount: tx.a,
                        transaction_date: null,
                        transaction_count: tx.ct,
                        department_code: undefined,
                        program_code: tx.pc,
                        fund_code: tx.fc,
                        category: category.c,
                        description: tx.d
                      });
                    }
                  }
                }
              }
            }
          }

          // Check which programs already exist
          if (programDetails.size > 0) {
            const { data: existingPrograms, error: fetchError } = await supabase
              .from('programs')
              .select('project_code')
              .in('project_code', Array.from(programDetails.keys()));

            if (fetchError) {
              log('ERROR', transactionId, `Error fetching existing programs: ${fetchError.message}`, { 
                step: '6.6', 
                context,
                error: fetchError
              });
              fileLogger.error(`Error fetching existing programs: ${fetchError.message}`);
              throw fetchError;
            }

            // Filter out programs that already exist
            const existingCodes = new Set(existingPrograms?.map(p => p.project_code) || []);
            const programsToCreate = Array.from(programDetails.entries())
              .filter(([code]) => !existingCodes.has(code))
              .map(([code, details]) => ({
                project_code: code,
                name: details.name,
                description: details.description,
                sources: [vendorFile] // Use the vendor file name as source
              }));

            if (programsToCreate.length > 0) {
              log('INFO', transactionId, `Creating ${programsToCreate.length} new programs`, { step: '6.6', context });
              fileLogger.log(`Creating ${programsToCreate.length} new programs`);

              const { error: programError } = await supabase
                .from('programs')
                .upsert(programsToCreate, {
                  onConflict: 'project_code'
                });

              if (programError) {
                log('ERROR', transactionId, `Error creating programs: ${programError.message}`, { 
                  step: '6.6', 
                  context,
                  error: programError
                });
                fileLogger.error(`Error creating programs: ${programError.message}`);
                throw programError;
              }
            }
          }

          log('DEBUG', transactionId, `Prepared ${transactions.length} transactions for insert`, { 
            step: '6.6', 
            context,
            sample: transactions.slice(0, 2)
          });
          fileLogger.log(`Prepared ${transactions.length} transactions for insert`);

          // Step 6.7: Insert transactions in batches
          if (transactions.length > 0) {
            log('INFO', transactionId, 'Step 6.7: Processing transactions', { step: '6.7', context });
            fileLogger.log('Step 6.7: Processing transactions');

            // Insert new transactions in batches
            await processBatches(
              transactions,
              config.batchSize,
              async (transactionBatch) => {
                const { error: transactionError } = await supabase
                  .from('vendor_transactions')
                  .insert(transactionBatch);

                if (transactionError) {
                  log('ERROR', transactionId, `Error inserting transactions: ${transactionError.message}`, { 
                    step: '6.7', 
                    context,
                    error: transactionError,
                    batchSize: transactionBatch.length
                  });
                  fileLogger.error(`Error inserting transactions: ${transactionError.message}`);
                  throw transactionError;
                }

                log('INFO', transactionId, `Successfully inserted ${transactionBatch.length} transactions`, { 
                  step: '6.7', 
                  context 
                });
                fileLogger.log(`Successfully inserted ${transactionBatch.length} transactions`);
              },
              'vendor-transactions'
            );
          }
        },
        'updateVendors'
      );
    }

    log('INFO', transactionId, 'Step 6: Vendor Update completed', { step: '6.0', context });
    fileLogger.log('Step 6: Vendor Update completed');
    return {
      success: true,
      message: 'Vendors data update completed'
    };
  } catch (error) {
    log('ERROR', transactionId, 'Failed to update vendors data', { 
      step: '6.0',
      context, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    fileLogger.error(`Failed to update vendors data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      message: 'Failed to update vendors data'
    };
  }
}

/**
 * Update funds data in the database
 * 
 * This function:
 * 1. Reads funds.json
 * 2. Validates the data structure
 * 3. Processes funds in batches:
 *    - Maps fund data to database schema
 *    - Upserts funds with conflict handling
 * 
 * Data Structure:
 * - Fund: { fundCode: string, fundName: string, fundGroup: string, fundDescription?: string }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updateFunds(): Promise<ProcessingResult> {
  const context = 'updateFunds';
  
  // Step 4: Fund Update
  log('INFO', transactionId, 'Starting Step 4: Fund Update', { step: '4.0', context });
  fileLogger.log('Starting Step 4: Fund Update');
  
  // Step 4.1: Read and validate funds.json
  log('INFO', transactionId, 'Step 4.1: Reading and validating funds.json', { step: '4.1', context });
  fileLogger.log('Step 4.1: Reading and validating funds.json');
  
  const filePath = path.join(config.dataDir, 'funds.json');
  
  if (!fs.existsSync(filePath)) {
    log('ERROR', transactionId, 'funds.json does not exist', { step: '4.1', context });
    fileLogger.error('funds.json does not exist');
    return {
      success: false,
      message: 'funds.json does not exist'
    };
  }
  
  log('INFO', transactionId, 'Reading fund data from funds.json', { step: '4.1', context });
  fileLogger.log('Reading fund data from funds.json');
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { funds: Fund[] };
  
  if (!data.funds || !Array.isArray(data.funds)) {
    log('ERROR', transactionId, 'Invalid funds data structure', { step: '4.1', context });
    fileLogger.error('Invalid funds data structure');
    return {
      success: false,
      message: 'Invalid funds data structure'
    };
  }
  
  // Step 4.2: Process funds in batches
  log('INFO', transactionId, 'Step 4.2: Processing funds in batches', { step: '4.2', context });
  fileLogger.log('Step 4.2: Processing funds in batches');
  
  const result = await processBatches(
    data.funds,
    config.batchSize,
    async (batch) => {
      // Step 4.3: Map fund data to database schema
      log('INFO', transactionId, 'Step 4.3: Mapping fund data to database schema', { step: '4.3', context });
      fileLogger.log('Step 4.3: Mapping fund data to database schema');

      const fundsToUpsert = batch.map((fund: Fund) => ({
        fund_code: fund.fundCode,
        name: fund.fundName,
        fund_group: fund.fundGroup,
        description: fund.fundDescription
      }));
      
      // Step 4.4: Upsert funds with conflict handling
      log('INFO', transactionId, 'Step 4.4: Upserting funds with conflict handling', { step: '4.4', context });
      fileLogger.log('Step 4.4: Upserting funds with conflict handling');
      
      const { error } = await supabase
        .from('funds')
        .upsert(fundsToUpsert, {
          onConflict: 'fund_code'
        });
        
      if (error) {
        log('ERROR', transactionId, `Error updating funds: ${error.message}`, { step: '4.4', context });
        fileLogger.error(`Error updating funds: ${error.message}`);
      } else {
        log('INFO', transactionId, `Successfully upserted ${fundsToUpsert.length} funds`, { step: '4.4', context });
        fileLogger.log(`Successfully upserted ${fundsToUpsert.length} funds`);
      }
    },
    context
  );
  
  if (!result.success) {
    log('ERROR', transactionId, 'Failed to update funds', { step: '4.0', context, error: result.message });
    fileLogger.error(`Failed to update funds: ${result.message}`);
    return result;
  }
  
  // Step 4.5: Handle fund groups and descriptions
  log('INFO', transactionId, 'Step 4.5: Handling fund groups and descriptions', { step: '4.5', context });
  fileLogger.log('Step 4.5: Handling fund groups and descriptions');

  log('INFO', transactionId, 'Step 4: Fund Update completed', { step: '4.0', context });
  fileLogger.log('Step 4: Fund Update completed');
  return {
    success: true,
    message: 'Funds data update completed'
  };
}

/**
 * Upsert departments data in the database
 * 
 * This function:
 * 1. Reads departments.json
 * 2. Validates required fields:
 *    - name (required, only field that prevents data upsert)
 *    - organizationalCode (required for SQL operations)
 *    - canonicalName, aliases, keyFunctions, abbreviation, orgLevel, budget_status
 *    Note: Fields prefixed with underscore (_) like _slug are deprecated and should not be used
 *    for SQL operations or any other database interactions.
 * 3. Processes departments in batches:
 *    - Maps department data to database schema
 *    - Handles optional fields
 *    - Provides detailed validation errors
 * 
 * Data Structure:
 * - DepartmentData: {
 *     name: string,
 *     organizationalCode: string,
 *     canonicalName: string,
 *     aliases: string[],
 *     keyFunctions: string,
 *     abbreviation: string,
 *     orgLevel: number,
 *     budget_status: string,
 *     ...
 *   }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updateDepartments(): Promise<ProcessingResult> {
  const context = 'updateDepartments';
  
  // Step 2: Department Update
  log('INFO', transactionId, 'Starting Step 2: Department Update', { step: '2.0', context });
  fileLogger.log('Starting Step 2: Department Update');

  try {
    // Step 2.1: Read and parse departments.json
    log('INFO', transactionId, 'Step 2.1: Reading and parsing departments.json', { step: '2.1', context });
    fileLogger.log('Step 2.1: Reading and parsing departments.json');
    
    const filePath = path.join(config.dataDir, 'departments.json');
    let departmentsData: DepartmentsJSON;
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      departmentsData = JSON.parse(fileContent);
      log('INFO', transactionId, 'Successfully read departments.json', { step: '2.1', context });
      fileLogger.log('Successfully read departments.json');
    } catch (error) {
      log('ERROR', transactionId, 'Failed to read or parse departments.json', { 
        step: '2.1',
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });
      fileLogger.error(`Failed to read or parse departments.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: 'Failed to read or parse departments.json'
      };
    }

    // Step 2.2: Validate required fields
    log('INFO', transactionId, 'Step 2.2: Validating required fields', { step: '2.2', context });
    fileLogger.log('Step 2.2: Validating required fields');

    // Data integrity check
    if (!departmentsData.departments || !Array.isArray(departmentsData.departments)) {
      log('ERROR', transactionId, 'Invalid departments data structure', { 
        step: '2.2',
        context,
        data: departmentsData
      });
      fileLogger.error('Invalid departments data structure');
      return {
        success: false,
        message: 'Invalid departments data structure'
      };
    }

    // Enhanced validation for each department
    const validationErrors: { department: string; error: string }[] = [];
    const missingFields: { department: string; fields: string[] }[] = [];
    
    departmentsData.departments.forEach((dept, index) => {
      const missing: string[] = [];
      
      // Only name prevents insertion
      if (!dept.name) {
        validationErrors.push({ department: `Department at index ${index}`, error: 'Missing name' });
      }
      
      // Log other missing fields but don't prevent insertion
      if (!dept.organizationalCode) {
        missing.push('organizationalCode');
      }
      if (!dept.canonicalName) {
        missing.push('canonicalName');
      }
      if (!dept.aliases || !Array.isArray(dept.aliases)) {
        missing.push('aliases');
      }
      if (!dept.keyFunctions) {
        missing.push('keyFunctions');
      }
      if (!dept.abbreviation) {
        missing.push('abbreviation');
      }
      if (typeof dept.orgLevel !== 'number') {
        missing.push('orgLevel');
      }
      if (!dept.budget_status) {
        missing.push('budget_status');
      }
      
      if (missing.length > 0) {
        missingFields.push({
          department: dept.name || `Department at index ${index}`,
          fields: missing
        });
      }
    });

    // Log missing fields for later fixing
    if (missingFields.length > 0) {
      log('WARN', transactionId, 'Found departments with missing indexable fields', {
        step: '2.2',
        context,
        missingFields,
        totalDepartmentsWithMissingFields: missingFields.length
      });
      fileLogger.log(`Found ${missingFields.length} departments with missing indexable fields:\n${
        missingFields.map(mf => `${mf.department}: Missing ${mf.fields.join(', ')}`).join('\n')
      }`);
    }

    if (validationErrors.length > 0) {
      log('ERROR', transactionId, 'Department validation errors found', {
        step: '2.2',
        context,
        validationErrors,
        totalErrors: validationErrors.length,
        errorDetails: validationErrors.map(e => `${e.department}: ${e.error}`).join('\n')
      });
      fileLogger.error(`Found ${validationErrors.length} validation errors in department data:\n${validationErrors.map(e => `${e.department}: ${e.error}`).join('\n')}`);
      return {
        success: false,
        message: `Found ${validationErrors.length} validation errors in department data:\n${validationErrors.map(e => `${e.department}: ${e.error}`).join('\n')}`
      };
    }



    // Step 2.3: Process departments in batches
    log('INFO', transactionId, 'Step 2.3: Processing departments in batches', { step: '2.3', context });
    fileLogger.log('Step 2.3: Processing departments in batches');

    // Include all departments, not just those with organizational codes
    const validDepartments = departmentsData.departments;
    const batchSize = 100;
    const batches: typeof validDepartments[] = [];
    for (let i = 0; i < validDepartments.length; i += batchSize) {
      batches.push(validDepartments.slice(i, i + batchSize));
    }

    log('INFO', transactionId, `Processing ${batches.length} batches of size ${batchSize}`, {
      step: '2.3',
      context,
      batchCount: batches.length,
      batchSize
    });
    fileLogger.log(`Processing ${batches.length} batches of size ${batchSize}`);

    // Step 2.4: Insert new department records
    log('INFO', transactionId, 'Step 2.4: Inserting new department records', { step: '2.4', context });
    fileLogger.log('Step 2.4: Inserting new department records');

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      log('INFO', transactionId, `Processing batch ${i + 1}/${batches.length}`, {
        step: '2.4',
        context,
        batchNumber: i + 1,
        totalBatches: batches.length,
        batchSize: batch.length
      });
      fileLogger.log(`Processing batch ${i + 1}/${batches.length}`);

      try {
        // Check for duplicates within the batch
        const orgCodes = new Set<string>();
        const duplicates = batch.filter(dept => {
          if (!dept.organizationalCode) return false; // Skip if no org code
          if (orgCodes.has(dept.organizationalCode)) {
            return true;
          }
          orgCodes.add(dept.organizationalCode);
          return false;
        });

        if (duplicates.length > 0) {
          log('ERROR', transactionId, 'Found duplicate organizational codes within batch', {
            step: '2.4',
            context,
            duplicates: duplicates.map(d => ({
              organizational_code: d.organizationalCode || 'undefined',
              name: d.name
            }))
          });
          fileLogger.error(`Found duplicate organizational codes within batch: ${JSON.stringify(duplicates.map(d => ({
            organizational_code: d.organizationalCode || 'undefined',
            name: d.name
          })), null, 2)}`);
          throw new Error(`Found ${duplicates.length} duplicate organizational codes within batch`);
        }

        // Prepare departments for upsert
        const departmentsToUpsert = batch.map(dept => {
          return {
            name: dept.name,
            organizational_code: dept.organizationalCode || null,
            canonical_name: dept.canonicalName,
            aliases: dept.aliases,
            description: dept.description,
            key_functions: dept.keyFunctions,
            abbreviation: dept.abbreviation,
            org_level: dept.orgLevel,
            budget_status: dept.budget_status,
            parent_agency: dept.parent_agency,
            entity_code: dept.entityCode
          };
        });

        const { data: insertedData, error: insertError } = await supabase
          .from('departments')
          .upsert(departmentsToUpsert, {
            onConflict: 'name'
          })
          .select();

        if (insertError) {
          log('ERROR', transactionId, 'Error inserting departments', {
            step: '2.4',
            context,
            error: insertError,
            errorDetails: {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details
            },
            batchNumber: i + 1,
            duplicateValues: batch.map(dept => ({
              organizational_code: dept.organizationalCode,
              name: dept.name
            }))
          });
          fileLogger.error(`Error inserting departments batch ${i + 1}: ${insertError.message}`);
          fileLogger.error(`Duplicate values in batch: ${JSON.stringify(batch.map(dept => ({
            organizational_code: dept.organizationalCode,
            name: dept.name
          })), null, 2)}`);
          throw new Error(`Failed to insert departments batch ${i + 1}: ${insertError.message}`);
        }

        // Step 2.4: Handle validation errors and logging
        if (insertedData) {
          log('INFO', transactionId, `Successfully inserted ${insertedData.length} departments`, {
            step: '2.4',
            context,
            batchNumber: i + 1,
            insertedCount: insertedData.length,
            expectedCount: batch.length
          });
          fileLogger.log(`Successfully inserted ${insertedData.length} departments in batch ${i + 1}`);
        }
      } catch (error) {
        log('ERROR', transactionId, 'Exception in department batch processing', {
          step: '2.4',
          context,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          batchNumber: i + 1
        });
        fileLogger.error(`Exception in department batch processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    // Step 2.5: Update department spending data
    log('INFO', transactionId, 'Step 2.5: Updating department spending data', { step: '2.5', context });
    fileLogger.log('Step 2.5: Updating department spending data');

    try {
      // Delete existing spending data
      const { error: deleteError } = await supabase
        .from('department_spending')
        .delete()
        .eq('fiscal_year', config.currentYear);

      if (deleteError) {
        log('ERROR', transactionId, 'Error deleting existing department spending data', {
          step: '2.5',
          context,
          error: deleteError
        });
        fileLogger.error(`Error deleting existing department spending data: ${deleteError.message}`);
        throw deleteError;
      }

      // Insert new spending data
      const spendingDataMap = new Map<string, {
        department_code: string;
        fiscal_year: number;
        total_amount: number;
      }>();

      // Deduplicate spending data by using a Map with department_code as key
      departmentsData.departments
        .filter(dept => dept.organizationalCode && dept.spending)
        .forEach(dept => {
          const key = dept.organizationalCode!;
          const amount = typeof dept.spending === 'object' && dept.spending?.yearly?.[config.currentYear] 
            ? dept.spending.yearly[config.currentYear] 
            : (typeof dept.spending === 'number' ? dept.spending : 0);
          
          spendingDataMap.set(key, {
            department_code: key,
            fiscal_year: config.currentYear,
            total_amount: amount
          });
        });

      const spendingData = Array.from(spendingDataMap.values());

      if (spendingData.length > 0) {
        const { error: insertError } = await supabase
          .from('department_spending')
          .upsert(spendingData, {
            onConflict: 'department_code,fiscal_year'
          });

        if (insertError) {
          log('ERROR', transactionId, 'Error inserting department spending data', {
            step: '2.5',
            context,
            error: insertError,
            sampleData: spendingData.slice(0, 2), // Log first two records for debugging
            totalRecords: spendingData.length
          });
          fileLogger.error(`Error inserting department spending data: ${insertError.message}`);
          throw insertError;
        }

        log('INFO', transactionId, `Successfully upserted ${spendingData.length} department spending records`, {
          step: '2.5',
          context
        });
        fileLogger.log(`Successfully upserted ${spendingData.length} department spending records`);
      }
    } catch (error) {
      log('ERROR', transactionId, 'Failed to update department spending data', {
        step: '2.5',
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      fileLogger.error(`Failed to update department spending data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    // Step 2.6: Update department workforce data
    log('INFO', transactionId, 'Step 2.6: Updating department workforce data', { step: '2.6', context });
    fileLogger.log('Step 2.6: Updating department workforce data');

    try {
      // Create a Map to deduplicate workforce data
      const workforceDataMap = new Map<string, DepartmentWorkforce[]>();

      // Process and deduplicate workforce data
      departmentsData.departments
        .filter(dept => dept.organizationalCode)
        .forEach(dept => {
          const key = dept.organizationalCode!;
          const years = new Set<number>();
          
          // Get all years from both headCount and wages
          if (dept.headCount?.yearly) {
            Object.keys(dept.headCount.yearly).forEach(year => years.add(parseInt(year)));
          }
          if (dept.wages?.yearly) {
            Object.keys(dept.wages.yearly).forEach(year => years.add(parseInt(year)));
          }

          const departmentData = Array.from(years).map(year => {
            const headCount = dept.headCount?.yearly?.[year];
            const wages = dept.wages?.yearly?.[year];
            
            if (typeof headCount === 'number') {
              return {
                department_code: key,
                fiscal_year: year,
                head_count: headCount,
                total_wages: typeof wages === 'number' ? Number(wages.toFixed(2)) : null
              } as DepartmentWorkforce;
            }
            return null;
          }).filter((data): data is DepartmentWorkforce => data !== null);

          if (departmentData.length > 0) {
            workforceDataMap.set(key, departmentData);
            log('DEBUG', transactionId, `Including department ${dept.name} (${key}) with data for years: ${departmentData.map(d => d.fiscal_year).join(', ')}`, {
              step: '2.6',
              context,
              years: departmentData.length
            });
            fileLogger.log(`Including department ${dept.name} (${key}) with data for years: ${departmentData.map(d => d.fiscal_year).join(', ')}`);
          } else {
            log('DEBUG', transactionId, `Skipping department ${dept.name} (${key}) - no valid data for any year`, {
              step: '2.6',
              context
            });
            fileLogger.log(`Skipping department ${dept.name} (${key}) - no valid data for any year`);
          }
        });

      const workforceData = Array.from(workforceDataMap.values()).flat();
      log('DEBUG', transactionId, `Prepared workforceData length: ${workforceData.length}`, { step: '2.6', context });
      fileLogger.log(`Prepared workforceData length: ${workforceData.length}`);
      
      if (workforceData.length > 0) {
        log('DEBUG', transactionId, `Sample workforceData:`, {
          step: '2.6',
          context,
          sample: workforceData[0]
        });
        fileLogger.log(`Sample workforceData: ${JSON.stringify(workforceData[0], null, 2)}`);

        // Delete existing records for all years we're updating
        const yearsToUpdate = new Set(workforceData.map(d => d.fiscal_year));
        log('DEBUG', transactionId, `Deleting existing records for years: ${Array.from(yearsToUpdate).join(', ')}`, { step: '2.6', context });
        fileLogger.log(`Deleting existing records for years: ${Array.from(yearsToUpdate).join(', ')}`);

        const { error: deleteError } = await supabase
          .from('department_workforce')
          .delete()
          .in('fiscal_year', Array.from(yearsToUpdate));

        if (deleteError) {
          log('ERROR', transactionId, 'Error deleting existing department workforce data', {
            step: '2.6',
            context,
            error: deleteError
          });
          fileLogger.error(`Error deleting existing department workforce data: ${deleteError.message}`);
          throw deleteError;
        }

        const { error: insertError } = await supabase
          .from('department_workforce')
          .upsert(workforceData, {
            onConflict: 'department_code,fiscal_year'
          });

        if (insertError) {
          log('ERROR', transactionId, 'Error inserting department workforce data', {
            step: '2.6',
            context,
            error: insertError,
            sampleData: workforceData.slice(0, 2),
            totalRecords: workforceData.length
          });
          fileLogger.error(`Error inserting department workforce data: ${insertError.message}`);
          throw insertError;
        }

        log('INFO', transactionId, `Successfully upserted ${workforceData.length} department workforce records`, {
          step: '2.6',
          context
        });
        fileLogger.log(`Successfully upserted ${workforceData.length} department workforce records`);
      }
    } catch (error) {
      log('ERROR', transactionId, 'Failed to update department workforce data', {
        step: '2.6',
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      fileLogger.error(`Failed to update department workforce data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    // Step 2.7: Update department distributions
    log('INFO', transactionId, 'Step 2.7: Updating department distributions', { step: '2.7', context });
    fileLogger.log('Step 2.7: Updating department distributions');

    try {
      // Create distribution data with deduplication
      const distributionDataMap = new Map<string, {
        department_code: string;
        fiscal_year: number;
        distribution_type: 'tenure' | 'salary' | 'age';
        distribution_data: any;
      }>();

      // Process and deduplicate distribution data
      departmentsData.departments
        .filter(dept => dept.organizationalCode)
        .forEach(dept => {
          const key = `${dept.organizationalCode}_tenure`;
          if (dept.tenureDistribution) {
            distributionDataMap.set(key, {
              department_code: dept.organizationalCode!,
              fiscal_year: config.currentYear,
              distribution_type: 'tenure',
              distribution_data: dept.tenureDistribution
            });
          }

          const salaryKey = `${dept.organizationalCode}_salary`;
          if (dept.salaryDistribution) {
            distributionDataMap.set(salaryKey, {
              department_code: dept.organizationalCode!,
              fiscal_year: config.currentYear,
              distribution_type: 'salary',
              distribution_data: dept.salaryDistribution
            });
          }

          const ageKey = `${dept.organizationalCode}_age`;
          if (dept.ageDistribution) {
            distributionDataMap.set(ageKey, {
              department_code: dept.organizationalCode!,
              fiscal_year: config.currentYear,
              distribution_type: 'age',
              distribution_data: dept.ageDistribution
            });
          }
        });

      const distributionData = Array.from(distributionDataMap.values());

      if (distributionData.length > 0) {
        const { error: upsertError } = await supabase
          .from('department_distributions')
          .upsert(distributionData, {
            onConflict: 'department_code,fiscal_year,distribution_type'
          });

        if (upsertError) {
          log('ERROR', transactionId, 'Error upserting department distributions', {
            step: '2.7',
            context,
            error: upsertError,
            sampleData: distributionData.slice(0, 2),
            totalRecords: distributionData.length
          });
          fileLogger.error(`Error upserting department distributions: ${upsertError.message}`);
          throw upsertError;
        }

        log('INFO', transactionId, `Successfully upserted ${distributionData.length} department distribution records`, {
          step: '2.7',
          context
        });
        fileLogger.log(`Successfully upserted ${distributionData.length} department distribution records`);
      }
    } catch (error) {
      log('ERROR', transactionId, 'Failed to update department distributions', {
        step: '2.7',
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      fileLogger.error(`Failed to update department distributions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    log('INFO', transactionId, 'Step 2: Department Update completed', { step: '2.0', context });
    fileLogger.log('Step 2: Department Update completed');
    return {
      success: true,
      message: 'Departments data update completed'
    };
  } catch (error) {
    log('ERROR', transactionId, 'Failed to process batches for updateDepartments', {
      step: '2.0',
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    fileLogger.error(`Failed to process batches for updateDepartments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      message: `Failed to process batches for updateDepartments: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Update programs data in the database
 * 
 * This function:
 * 1. Reads programs.json
 * 2. Validates the data structure
 * 3. Processes programs in batches:
 *    - Maps program data to database schema
 *    - Handles optional fields
 *    - Upserts programs with conflict handling
 * 
 * Data Structure:
 * - ProgramData: {
 *     projectCode: string,
 *     name: string,
 *     descriptions?: { default?: string },
 *     departmentCode?: string,
 *     fiscalYear?: number
 *   }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updatePrograms(): Promise<ProcessingResult> {
  const context = 'updatePrograms';
  
  // Step 3: Program Update
  log('INFO', transactionId, 'Starting Step 3: Program Update', { step: '3.0', context });
  fileLogger.log('Starting Step 3: Program Update');
  
  // Step 3.1: Read and validate programs.json
  log('INFO', transactionId, 'Step 3.1: Reading and validating programs.json', { step: '3.1', context });
  fileLogger.log('Step 3.1: Reading and validating programs.json');
  
  const filePath = path.join(config.dataDir, 'programs.json');
  
  if (!fs.existsSync(filePath)) {
    log('ERROR', transactionId, 'programs.json does not exist', { step: '3.1', context });
    fileLogger.error('programs.json does not exist');
    return {
      success: false,
      message: 'programs.json does not exist'
    };
  }
  
  log('INFO', transactionId, 'Reading program data from programs.json', { step: '3.1', context });
  fileLogger.log('Reading program data from programs.json');
  
  let data: ProgramsJSON;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    log('INFO', transactionId, 'Successfully read programs.json', { step: '3.1', context });
    fileLogger.log('Successfully read programs.json');
  } catch (error) {
    log('ERROR', transactionId, 'Failed to parse programs.json', { step: '3.1', context, error });
    fileLogger.error(`Failed to parse programs.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      message: 'Failed to parse programs.json'
    };
  }
  
  if (!data.programs || !Array.isArray(data.programs)) {
    log('ERROR', transactionId, 'Invalid programs data structure', { step: '3.1', context });
    fileLogger.error('Invalid programs data structure');
    return {
      success: false,
      message: 'Invalid programs data structure'
    };
  }

  // Step 3.2: Process programs in batches
  log('INFO', transactionId, 'Step 3.2: Processing programs in batches', { step: '3.2', context });
  fileLogger.log('Step 3.2: Processing programs in batches');
  
  const result = await processBatches(
    data.programs,
    config.batchSize,
    async (batch) => {
      // Step 3.3: Map program data to database schema
      log('INFO', transactionId, 'Step 3.3: Mapping program data to database schema', { step: '3.3', context });
      fileLogger.log('Step 3.3: Mapping program data to database schema');

      const programsToUpsert = batch.map((program: ProgramData) => {
        // Get all unique sources from program descriptions
        const sources = new Set<string>();
        program.programDescriptions?.forEach(desc => {
          if (Array.isArray(desc.source)) {
            desc.source.forEach(s => sources.add(s));
          } else if (typeof desc.source === 'string') {
            sources.add(desc.source);
          }
        });

        // Get the first description if available
        const description = program.programDescriptions?.[0]?.description || null;

        return {
          project_code: program.projectCode,
          name: program.name || 'Unnamed Program',
          description: description,
          sources: Array.from(sources)
        };
      });
      
      // Step 3.4: Upsert programs with conflict handling
      log('INFO', transactionId, 'Step 3.4: Upserting programs with conflict handling', { step: '3.4', context });
      fileLogger.log('Step 3.4: Upserting programs with conflict handling');
      
      const { error } = await supabase
        .from('programs')
        .upsert(programsToUpsert, {
          onConflict: 'project_code'
        });
        
      if (error) {
        log('ERROR', transactionId, `Error updating programs: ${error.message}`, { step: '3.4', context });
        fileLogger.error(`Error updating programs: ${error.message}`);
      } else {
        log('INFO', transactionId, `Successfully upserted ${programsToUpsert.length} programs`, { step: '3.4', context });
        fileLogger.log(`Successfully upserted ${programsToUpsert.length} programs`);
      }
    },
    context
  );
  
  if (!result.success) {
    log('ERROR', transactionId, 'Failed to update programs', { step: '3.0', context, error: result.message });
    fileLogger.error(`Failed to update programs: ${result.message}`);
    return result;
  }
  
  // Step 3.5: Handle optional fields and descriptions
  log('INFO', transactionId, 'Step 3.5: Handling optional fields and descriptions', { step: '3.5', context });
  fileLogger.log('Step 3.5: Handling optional fields and descriptions');

  log('INFO', transactionId, 'Step 3: Program Update completed', { step: '3.0', context });
  fileLogger.log('Step 3: Program Update completed');
  return {
    success: true,
    message: 'Programs data update completed'
  };
}

/**
 * Update search index in the database
 * 
 * This function:
 * 1. Ensures search_index table has full-text search column
 * 2. Fetches data from all tables:
 *    - departments
 *    - vendors
 *    - programs
 *    - funds
 * 3. Processes search items in batches:
 *    - Maps data to search index schema
 *    - Handles additional data fields
 *    - Upserts with conflict handling
 * 
 * Data Structure:
 * - SearchIndexItem: {
 *     term: string,
 *     type: 'department' | 'vendor' | 'program' | 'fund',
 *     source_id: string,
 *     additional_data: {
 *       display: string,
 *       context: string,
 *       [key: string]: any
 *     }
 *   }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updateSearchIndex(): Promise<ProcessingResult> {
  const context = 'updateSearchIndex';
  
  // Step 7: Search Index Update
  log('INFO', transactionId, 'Starting Step 7: Search Index Update', { step: '7.0', context });
  fileLogger.log('Starting Step 7: Search Index Update');
  
  try {
    // Step 7.1: Ensure search_index table has full-text search
    log('INFO', transactionId, 'Step 7.1: Ensuring search_index table has full-text search', { step: '7.1', context });
    fileLogger.log('Step 7.1: Ensuring search_index table has full-text search');
    
  const { error: alterError } = await supabase.rpc('ensure_search_index_fts');
  if (alterError) {
      log('ERROR', transactionId, 'Error ensuring search index structure', { step: '7.1', context, error: alterError });
      fileLogger.error(`Error ensuring search index structure: ${alterError.message}`);
    return {
      success: false,
      message: `Error ensuring search index structure: ${alterError.message}`
    };
  }

    // Step 7.2: Fetch data from all tables
    log('INFO', transactionId, 'Step 7.2: Fetching data from all tables', { step: '7.2', context });
    fileLogger.log('Step 7.2: Fetching data from all tables');
    
    const searchItems: Array<{
      term: string;
      type: 'department' | 'vendor' | 'program' | 'fund';
      source_id: string;
      additional_data: {
        display: string;
        context: string;
        [key: string]: any;
      };
    }> = [];

  // Process departments
    log('INFO', transactionId, 'Fetching departments data', { step: '7.2', context });
    fileLogger.log('Fetching departments data');
    
    const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');
      
    if (deptError) {
      log('ERROR', transactionId, 'Error fetching departments', { step: '7.2', context, error: deptError });
      fileLogger.error(`Error fetching departments: ${deptError.message}`);
      return {
        success: false,
        message: `Error fetching departments: ${deptError.message}`
      };
    }

  if (departments) {
    departments.forEach(dept => {
      if (!dept.organizational_code) {
        log('WARN', transactionId, 'Department missing organizational_code', { 
          step: '7.2', 
          context,
          department: {
            name: dept.name,
            id: dept.id,
            description: dept.description,
            has_organizational_code: !!dept.organizational_code,
            has_name: !!dept.name,
            has_description: !!dept.description
          }
        });
        return;
      }
      searchItems.push({
        term: dept.name,
        type: 'department',
        source_id: dept.organizational_code,
        additional_data: {
          display: dept.name,
          context: dept.description || dept.name
        }
      });
    });
  }

  // Process vendors
    log('INFO', transactionId, 'Fetching vendors data', { step: '7.2', context });
    fileLogger.log('Fetching vendors data');
    
    const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('*');
      
    if (vendorError) {
      log('ERROR', transactionId, 'Error fetching vendors', { step: '7.2', context, error: vendorError });
      fileLogger.error(`Error fetching vendors: ${vendorError.message}`);
      return {
        success: false,
        message: `Error fetching vendors: ${vendorError.message}`
      };
    }

  if (vendors) {
    vendors.forEach(vendor => {
      if (!vendor.id) {
        log('WARN', transactionId, 'Vendor missing id', { 
          step: '7.2', 
          context,
          vendor: {
            name: vendor.name,
            ein: vendor.ein,
            total_amount: vendor.total_amount,
            has_id: !!vendor.id,
            has_name: !!vendor.name,
            has_ein: !!vendor.ein
          }
        });
        return;
      }
      searchItems.push({
        term: vendor.name,
        type: 'vendor',
        source_id: vendor.id,
        additional_data: {
          display: vendor.name,
          context: `Vendor with EIN: ${vendor.ein || 'N/A'}`,
          total_amount: vendor.total_amount
        }
      });
    });
  }

  // Process programs
    log('INFO', transactionId, 'Fetching programs data', { step: '7.2', context });
    fileLogger.log('Fetching programs data');
    
    const { data: programs, error: programError } = await supabase
    .from('programs')
    .select('*');
      
    if (programError) {
      log('ERROR', transactionId, 'Error fetching programs', { step: '7.2', context, error: programError });
      fileLogger.error(`Error fetching programs: ${programError.message}`);
      return {
        success: false,
        message: `Error fetching programs: ${programError.message}`
      };
    }

  if (programs) {
    programs.forEach(program => {
      if (!program.project_code) {
        log('WARN', transactionId, 'Program missing project_code', { 
          step: '7.2', 
          context,
          program: {
            name: program.name,
            department_code: program.department_code,
            description: program.description,
            has_project_code: !!program.project_code,
            has_name: !!program.name,
            has_department_code: !!program.department_code
          }
        });
        return;
      }
      searchItems.push({
        term: program.name,
        type: 'program',
        source_id: program.project_code,
        additional_data: {
          display: program.name,
          context: program.description || program.name,
          department_code: program.department_code
        }
      });
    });
  }

  // Process funds
    log('INFO', transactionId, 'Fetching funds data', { step: '7.2', context });
    fileLogger.log('Fetching funds data');
    
    const { data: funds, error: fundError } = await supabase
    .from('funds')
    .select('*');
      
    if (fundError) {
      log('ERROR', transactionId, 'Error fetching funds', { step: '7.2', context, error: fundError });
      fileLogger.error(`Error fetching funds: ${fundError.message}`);
      return {
        success: false,
        message: `Error fetching funds: ${fundError.message}`
      };
    }

  if (funds) {
    funds.forEach(fund => {
      if (!fund.fund_code) {
        log('WARN', transactionId, 'Fund missing fund_code', { 
          step: '7.2', 
          context,
          fund: {
            name: fund.name,
            fund_group: fund.fund_group,
            description: fund.description,
            has_fund_code: !!fund.fund_code,
            has_name: !!fund.name,
            has_fund_group: !!fund.fund_group
          }
        });
        return;
      }
      searchItems.push({
        term: fund.name,
        type: 'fund',
        source_id: fund.fund_code,
        additional_data: {
          display: fund.name,
          context: fund.description || fund.name,
          fund_group: fund.fund_group
        }
      });
    });
  }

    // Step 7.3: Process search items in batches
    log('INFO', transactionId, 'Step 7.3: Processing search items in batches', { step: '7.3', context });
    fileLogger.log('Step 7.3: Processing search items in batches');
    
    // Step 7.4: Map data to search index schema
    log('INFO', transactionId, 'Step 7.4: Mapping data to search index schema', { step: '7.4', context });
    fileLogger.log('Step 7.4: Mapping data to search index schema');
    
    // Step 7.5: Handle additional data fields
    log('INFO', transactionId, 'Step 7.5: Handling additional data fields', { step: '7.5', context });
    fileLogger.log('Step 7.5: Handling additional data fields');
    
    // Step 7.6: Upsert with conflict handling
    log('INFO', transactionId, 'Step 7.6: Upserting with conflict handling', { step: '7.6', context });
    fileLogger.log('Step 7.6: Upserting with conflict handling');
    
  await processBatches(
    searchItems,
    100,
    async (batch) => {
      // Filter out any invalid records from the batch
      const validBatch = batch.filter(item => {
        if (!item.source_id) {
          log('WARN', transactionId, 'Invalid search item in batch', {
            step: '7.6',
            context,
            item: {
              type: item.type,
              term: item.term,
              has_source_id: !!item.source_id,
              has_term: !!item.term,
              has_type: !!item.type
            }
          });
          return false;
        }
        return true;
      });

      if (validBatch.length === 0) {
        log('WARN', transactionId, 'Batch contained no valid items', { step: '7.6', context });
        return;
      }

      const { error } = await supabase
        .from('search_index')
        .upsert(validBatch, {
          onConflict: 'term,type,source_id'
        });

      if (error) {
        log('ERROR', transactionId, 'Error updating search index batch', { 
          step: '7.6',
          context,
          error,
          batchSize: validBatch.length,
          firstItem: validBatch[0]
        });
        fileLogger.error(`Error updating search index batch: ${error.message}`);
      } else {
        log('INFO', transactionId, `Successfully upserted ${validBatch.length} search items`, { step: '7.6', context });
        fileLogger.log(`Successfully upserted ${validBatch.length} search items`);
      }
    },
    'search_index'
  );

    log('INFO', transactionId, 'Step 7: Search Index Update completed', { step: '7.0', context });
    fileLogger.log('Step 7: Search Index Update completed');
  return {
    success: true,
    message: 'Search index update completed'
  };
  } catch (error) {
    log('ERROR', transactionId, 'Error in updateSearchIndex', { 
      step: '7.0',
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    fileLogger.error(`Error in updateSearchIndex: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      message: `Error updating search index: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Update budgets data in the database
 * 
 * This function:
 * 1. Reads budgets.json
 * 2. Validates the data structure
 * 3. Deletes existing budget data for current year
 * 4. Processes each department's budget:
 *    - Inserts budget record
 *    - Processes line items in batches
 *    - Handles project codes and fund codes
 * 
 * Data Structure:
 * - BudgetsJSON: {
 *     budget: Array<{
 *       code: string,
 *       fiscalYear: Array<{
 *         year: number,
 *         projectCode: Array<{
 *           code: string,
 *           fundingType: Array<{
 *             type: number,
 *             fundCode: Array<{
 *               code: string,
 *               count: number,
 *               amount: number
 *             }>
 *           }>
 *         }>
 *       }>
 *     }>
 *   }
 * 
 * @returns ProcessingResult indicating success or failure
 */
async function updateBudgets(): Promise<ProcessingResult> {
  const context = 'updateBudgets';
  
  // Step 5: Budget Update
  log('INFO', transactionId, 'Starting Step 5: Budget Update', { step: '5.0', context });
  fileLogger.log('Starting Step 5: Budget Update');
  
  try {
    // Step 5.1: Read and validate budgets.json
    log('INFO', transactionId, 'Step 5.1: Reading and validating budgets.json', { step: '5.1', context });
    fileLogger.log('Step 5.1: Reading and validating budgets.json');
    
    const filePath = path.join(config.dataDir, 'budgets.json');
    if (!fs.existsSync(filePath)) {
      log('ERROR', transactionId, 'budgets.json does not exist', { step: '5.1', context });
      fileLogger.error('budgets.json does not exist');
      return {
        success: false,
        message: 'budgets.json does not exist'
      };
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BudgetsJSON;
    if (!data.budget || !Array.isArray(data.budget)) {
      log('ERROR', transactionId, 'Invalid budgets data structure', { step: '5.1', context });
      fileLogger.error('Invalid budgets data structure');
      return {
        success: false,
        message: 'Invalid budgets data structure'
      };
    }

    // Step 5.2: Delete existing database table records
    log('INFO', transactionId, 'Step 5.2: Deleting existing database table records', { step: '5.2', context });
    fileLogger.log('Step 5.2: Deleting existing database table records');

    // Get all fiscal years from the data
    const fiscalYears = new Set(data.budget.map(b => 
      Math.max(...b.fiscalYear.map(y => y.year))
    ));

    // Delete existing budget data for these fiscal years
    log('INFO', transactionId, `Deleting existing budget data for fiscal years: ${Array.from(fiscalYears).join(', ')}`, { 
      step: '5.2', 
      context 
    });
    fileLogger.log(`Deleting existing budget data for fiscal years: ${Array.from(fiscalYears).join(', ')}`);

    // First get all budget IDs for the fiscal years
    const { data: existingBudgets, error: fetchError } = await supabase
      .from('budgets')
      .select('id')
      .in('fiscal_year', Array.from(fiscalYears));

    if (fetchError) {
      log('ERROR', transactionId, 'Error fetching existing budgets', {
        step: '5.2',
        context,
        error: fetchError
      });
      fileLogger.error(`Error fetching existing budgets: ${fetchError.message}`);
      throw fetchError;
    }

    const budgetIds = existingBudgets?.map(b => b.id) || [];

    if (budgetIds.length > 0) {
      // Delete budget line items first (due to foreign key constraints)
      const { error: deleteLineItemsError } = await supabase
        .from('budget_line_items')
        .delete()
        .in('budget_id', budgetIds);

      if (deleteLineItemsError) {
        log('ERROR', transactionId, 'Error deleting existing budget line items', {
          step: '5.2',
          context,
          error: deleteLineItemsError
        });
        fileLogger.error(`Error deleting existing budget line items: ${deleteLineItemsError.message}`);
        throw deleteLineItemsError;
      }
    }

    // Then delete budget records
    const { error: deleteBudgetsError } = await supabase
      .from('budgets')
      .delete()
      .in('fiscal_year', Array.from(fiscalYears));

    if (deleteBudgetsError) {
      log('ERROR', transactionId, 'Error deleting existing budgets', {
        step: '5.2',
        context,
        error: deleteBudgetsError
      });
      fileLogger.error(`Error deleting existing budgets: ${deleteBudgetsError.message}`);
      throw deleteBudgetsError;
    }

    // Step 5.3: Process each department's budget
    log('INFO', transactionId, 'Step 5.3: Processing department budgets', { step: '5.3', context });
    fileLogger.log('Step 5.3: Processing department budgets');

    // Process each department's budget
    for (const deptBudget of data.budget) {
      // Debug: Log department code and available fiscal years
      const availableYears = deptBudget.fiscalYear.map(y => y.year);
      
      log('DEBUG', transactionId, `Processing department ${deptBudget.code}`, { 
        step: '5.3', 
        context,
        department_code: deptBudget.code,
        available_years: availableYears
      });
      fileLogger.log(`Processing department ${deptBudget.code} - Available years: ${availableYears.join(', ')}`);

      // Process each fiscal year for this department
      for (const yearData of deptBudget.fiscalYear) {
        log('DEBUG', transactionId, `Processing year ${yearData.year} for department ${deptBudget.code}`, { 
          step: '5.3', 
          context,
          department_code: deptBudget.code,
          fiscal_year: yearData.year
        });
        fileLogger.log(`Processing year ${yearData.year} for department ${deptBudget.code}`);

        // Step 5.4: Insert budget record
        log('INFO', transactionId, `Step 5.4: Inserting budget record for department ${deptBudget.code}, year ${yearData.year}`, { step: '5.4', context });
        fileLogger.log(`Step 5.4: Inserting budget record for department ${deptBudget.code}, year ${yearData.year}`);

        const { data: insertData, error: insertError } = await supabase
          .from('budgets')
          .insert({
            department_code: deptBudget.code,
            fiscal_year: yearData.year
          })
          .select('id')
          .single();

        if (insertError) {
          log('ERROR', transactionId, `Error inserting budget for ${deptBudget.code}, ${yearData.year}`, { 
            step: '5.4', 
            context, 
            error: insertError,
            department_code: deptBudget.code,
            fiscal_year: yearData.year
          });
          fileLogger.error(`Error inserting budget for ${deptBudget.code}, ${yearData.year}: ${insertError.message}`);
          continue;
        }

        const budgetId = insertData.id;

        log('INFO', transactionId, `Successfully inserted budget for ${deptBudget.code}, ${yearData.year}`, { 
          step: '5.4', 
          context,
          department_code: deptBudget.code,
          fiscal_year: yearData.year,
          budget_id: budgetId
        });
        fileLogger.log(`Successfully inserted budget for ${deptBudget.code}, ${yearData.year} with ID ${budgetId}`);

        // Step 5.5: Process line items in batches
        log('INFO', transactionId, `Step 5.5: Processing line items for department ${deptBudget.code}, year ${yearData.year}`, { step: '5.5', context });
        fileLogger.log(`Step 5.5: Processing line items for department ${deptBudget.code}, year ${yearData.year}`);
        
        const lineItems: Array<{
          budget_id: string;
          project_code: string;
          fund_code: string;
          fund_type: number;
          amount: number;
        }> = [];
        
        // Get all program codes for this department's budget
        const projectCodes = yearData.projectCode.map(pc => pc.code);
        
        // Verify program codes exist
        const { data: existingPrograms, error: programError } = await supabase
          .from('programs')
          .select('project_code')
          .in('project_code', projectCodes);

        if (programError) {
          log('ERROR', transactionId, `Error verifying program codes for department ${deptBudget.code}`, { 
            step: '5.5', 
            context,
            error: programError,
            department_code: deptBudget.code,
            project_codes: projectCodes
          });
          fileLogger.error(`Error verifying program codes for department ${deptBudget.code}: ${programError.message}`);
          continue;
        }

        // Create a set of existing program codes for quick lookup
        const existingProjectCodes = new Set(existingPrograms?.map(p => p.project_code) || []);
        
        // Create missing programs
        const missingPrograms = yearData.projectCode.filter(pc => !existingProjectCodes.has(pc.code));
        
        if (missingPrograms.length > 0) {
          log('INFO', transactionId, `Creating ${missingPrograms.length} missing programs`, { 
            step: '5.5', 
            context,
            department_code: deptBudget.code,
            missing_programs: missingPrograms.map(p => p.code)
          });
          fileLogger.log(`Creating ${missingPrograms.length} missing programs: ${missingPrograms.map(p => p.code).join(', ')}`);
          
          const { error: createError } = await supabase
            .from('programs')
            .upsert(missingPrograms.map(pc => ({
              project_code: pc.code,
              name: `Program ${pc.code}`,
              sources: ['budget_import']
            })), {
              onConflict: 'project_code'
            });
            
          if (createError) {
            log('ERROR', transactionId, `Error creating missing programs for ${deptBudget.code}`, { 
              step: '5.5', 
              context,
              error: createError,
              department_code: deptBudget.code,
              missing_programs: missingPrograms.map(p => p.code)
            });
            fileLogger.error(`Error creating missing programs for ${deptBudget.code}: ${createError.message}`);
            continue;
          }
        }
        
        // Create line items for all programs (now they all exist)
        for (const projectCode of yearData.projectCode) {
          for (const fundingType of projectCode.fundingType) {
            for (const fundCode of fundingType.fundCode) {
              lineItems.push({
                budget_id: budgetId,
                project_code: projectCode.code,
                fund_code: fundCode.code,
                fund_type: fundingType.type,
                amount: fundCode.amount
              });
            }
          }
        }

        if (lineItems.length === 0) {
          log('INFO', transactionId, `No line items to insert for department ${deptBudget.code}`, {
            step: '5.5',
            context,
            department_code: deptBudget.code
          });
          fileLogger.log(`No line items to insert for department ${deptBudget.code}`);
          continue;
        }

        // Step 5.6: Handle project codes and fund codes
        log('INFO', transactionId, `Step 5.6: Handling project codes and fund codes for department ${deptBudget.code}`, { step: '5.6', context });
        fileLogger.log(`Step 5.6: Handling project codes and fund codes for department ${deptBudget.code}`);
        
        await processBatches(
          lineItems,
          config.batchSize,
          async (batch) => {
            const { error } = await supabase
              .from('budget_line_items')
              .insert(batch);

            if (error) {
              log('ERROR', transactionId, 'Error updating budget line items', { 
                step: '5.6', 
                context, 
                error,
                department_code: deptBudget.code,
                batch_size: batch.length
              });
              fileLogger.error(`Error updating budget line items: ${error.message}`);
            } else {
              log('INFO', transactionId, `Successfully inserted ${batch.length} line items`, { step: '5.6', context });
              fileLogger.log(`Successfully inserted ${batch.length} line items`);
            }
          },
          'budget_line_items'
        );
      }
    }

    return {
      success: true,
      message: 'Successfully updated budgets'
    };
  } catch (error: any) {
    log('ERROR', transactionId, 'Error updating budgets', { 
      step: '5.0', 
      context, 
      error: error.message,
      stack: error.stack
    });
    fileLogger.error(`Error updating budgets: ${error.message}\n${error.stack}`);
    return {
      success: false,
      message: `Error updating budgets: ${error.message}`
    };
  }
}

/**
 * Run all database updates in sequence
 * 
 * This function:
 * 1. Updates departments first (required for foreign keys)
 * 2. Updates programs (depends on departments)
 * 3. Updates funds
 * 4. Updates budgets (depends on departments and programs)
 * 5. Updates vendors
 * 6. Updates search index (depends on all other data)
 * 
 * Each update is logged and errors are tracked.
 * The function ensures data integrity by running updates in the correct order.
 */
async function runUpdates() {
  const context = 'runUpdates';
  
  // Step 8: Cleanup and Logging
  log('INFO', transactionId, 'Starting Step 8: Cleanup and Logging', { step: '8.0', context });
  fileLogger.log('Starting Step 8: Cleanup and Logging');
  
  try {
    // Step 8.1: Log completion status
    log('INFO', transactionId, 'Step 8.1: Logging completion status', { step: '8.1', context });
    fileLogger.log('Step 8.1: Logging completion status');
    
    log('INFO', transactionId, 'Starting database updates', { context });
    fileLogger.log('Starting database updates');
    
    // Run updates sequentially to maintain data integrity
    const results: ProcessingResult[] = [];
    
    // First update departments
    log('INFO', transactionId, 'Updating departments...', { context });
    fileLogger.log('Updating departments...');
    results.push(await updateDepartments());
    
    // Then update programs
    log('INFO', transactionId, 'Updating programs...', { context });
    fileLogger.log('Updating programs...');
    results.push(await updatePrograms());
    
    // Then update funds
    log('INFO', transactionId, 'Updating funds...', { context });
    fileLogger.log('Updating funds...');
    results.push(await updateFunds());
    
    // Then update budgets (after departments exist)
    log('INFO', transactionId, 'Updating budgets...', { context });
    fileLogger.log('Updating budgets...');
    results.push(await updateBudgets());
    
    // Then update vendors
    log('INFO', transactionId, 'Updating vendors...', { context });
    fileLogger.log('Updating vendors...');
    results.push(await updateVendors());
    
    // Finally update search index
    log('INFO', transactionId, 'Updating search index...', { context });
    fileLogger.log('Updating search index...');
    results.push(await updateSearchIndex());
    
    // Step 8.2: Track failed updates
    log('INFO', transactionId, 'Step 8.2: Tracking failed updates', { step: '8.2', context });
    fileLogger.log('Step 8.2: Tracking failed updates');
    
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      log('INFO', transactionId, 'All updates completed successfully', { step: '8.2', context });
      fileLogger.log('All updates completed successfully');
    } else {
      const failedUpdates = results
        .filter(result => !result.success)
        .map(result => result.message);
      
      log('ERROR', transactionId, 'Some updates failed', { 
        step: '8.2',
        context,
        failedUpdates 
      });
      fileLogger.error(`Some updates failed: ${failedUpdates.join(', ')}`);
    }
  } catch (error: unknown) {
    // Step 8.3: Handle errors
    log('ERROR', transactionId, 'Step 8.3: Handling errors', { step: '8.3', context });
    fileLogger.log('Step 8.3: Handling errors');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', transactionId, `Update process failed: ${errorMessage}`, { 
      step: '8.3',
      context,
      error 
    });
    fileLogger.error(`Update process failed: ${errorMessage}`);
  } finally {
    // Step 8.4: Cleanup file logger
    log('INFO', transactionId, 'Step 8.4: Cleaning up file logger', { step: '8.4', context });
    fileLogger.log('Step 8.4: Cleaning up file logger');
    
    fileLogger.cleanup();
    
    log('INFO', transactionId, 'Step 8: Cleanup and Logging completed', { step: '8.0', context });
    fileLogger.log('Step 8: Cleanup and Logging completed');
  }
}

runUpdates();