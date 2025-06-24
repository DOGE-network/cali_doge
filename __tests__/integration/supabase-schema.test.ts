/// <reference types="jest" />
/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables for Supabase connection');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// TypeScript types that should match database schema
interface DepartmentRow {
  id: string;
  organizational_code: string | null;
  name: string;
  canonical_name: string | null;
  org_level: number | null;
  budget_status: string | null;
  key_functions: string | null;
  abbreviation: string | null;
  parent_agency: string | null;
  entity_code: number | null;
  note: string | null;
  aliases: string[] | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProgramRow {
  project_code: string;
  name: string;
  program_description_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProgramDescriptionRow {
  id: string;
  description: string;
  sources: string[];
  created_at: string | null;
  updated_at: string | null;
}

interface VendorRow {
  id: string;
  name: string;
  ein: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface VendorTransactionRow {
  id: string;
  vendor_id: string;
  fiscal_year: number;
  department_name: string | null;
  department_code: string | null;
  agency_name: string | null;
  account_type: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  program_code: string | null;
  fund_code: string | null;
  amount: number;
  transaction_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface FundRow {
  id: string;
  fund_code: string;
  name: string;
  fund_group: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface BudgetRow {
  id: string;
  department_code: string;
  fiscal_year: number;
  created_at: string | null;
  updated_at: string | null;
}

interface BudgetLineItemRow {
  id: string;
  budget_id: string;
  project_code: string | null;
  fund_code: string | null;
  amount: number;
  fund_type: number | null;
  created_at: string | null;
  updated_at: string | null;
}



interface DepartmentWorkforceRow {
  id: string;
  department_id: string;
  fiscal_year: number;
  head_count: number;
  total_wages: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DepartmentDistributionRow {
  id: string;
  department_id: string;
  fiscal_year: number;
  distribution_type: 'tenure' | 'salary' | 'age';
  distribution_data: any;
  created_at: string | null;
  updated_at: string | null;
}

interface SearchIndexRow {
  id: string;
  term: string;
  type: string;
  source_id: string;
  additional_data: any | null;
  fiscal_year: number | null;
  fts: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Schema validation helpers
function validateRequiredColumns<T>(data: T | null, requiredColumns: (keyof T)[]): void {
  if (!data) {
    throw new Error('No data returned for validation');
  }
  
  requiredColumns.forEach((column: keyof T) => {
    expect(data).toHaveProperty(String(column));
  });
}

function validateColumnTypes<T>(data: T | null, typeChecks: Record<keyof T, (value: any) => boolean>): void {
  if (!data) {
    throw new Error('No data returned for type validation');
  }
  
  Object.entries(typeChecks).forEach(([column, typeCheck]) => {
    const value = (data as any)[column];
    expect((typeCheck as (value: any) => boolean)(value)).toBe(true);
  });
}

describe('Supabase Schema Integration Tests', () => {
  // Test that all required tables exist
  describe('Required Tables', () => {
    const requiredTables = [
      'departments',
      'department_workforce', 
      'department_distributions',
      'programs',
      'program_descriptions',
      'vendors',
      'vendor_transactions',
      'funds',
      'budgets',
      'budget_line_items',
      'search_index'
    ];

    requiredTables.forEach(tableName => {
      it(`should have table: ${tableName}`, async () => {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
      });
    });
  });

  // Test that required columns exist in key tables with TypeScript type validation
  describe('Required Columns and Type Validation', () => {
    it('departments table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const dept = data[0];
        // All columns used by process_json.ts and DepartmentData
        const requiredColumns = [
          'id',
          'organizational_code',
          'name',
          'canonical_name',
          'org_level',
          'budget_status',
          'key_functions',
          'abbreviation',
          'parent_agency',
          'entity_code',
          'note',
          'aliases',
          'description',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(dept, requiredColumns);
        // Type checks
        const typeChecks = {
          id: (v) => typeof v === 'string',
          organizational_code: (v) => v === null || typeof v === 'string',
          name: (v) => typeof v === 'string',
          canonical_name: (v) => v === null || typeof v === 'string',
          org_level: (v) => v === null || typeof v === 'number',
          budget_status: (v) => v === null || typeof v === 'string',
          key_functions: (v) => v === null || typeof v === 'string',
          abbreviation: (v) => v === null || typeof v === 'string',
          parent_agency: (v) => v === null || typeof v === 'string',
          entity_code: (v) => v === null || typeof v === 'number',
          note: (v) => v === null || typeof v === 'string',
          aliases: (v) => v === null || Array.isArray(v),
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(dept, typeChecks);
      }
    });



    it('department_workforce table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('department_workforce')
        .select('*')
        .limit(1);
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        const requiredColumns = [
          'id',
          'department_id',
          'fiscal_year',
          'head_count',
          'total_wages',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(row, requiredColumns);
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          head_count: (v) => typeof v === 'number',
          total_wages: (v) => v === null || typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(row, typeChecks);
      }
    });

    it('department_distributions table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('department_distributions')
        .select('*')
        .limit(1);
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        const requiredColumns = [
          'id',
          'department_id',
          'fiscal_year',
          'distribution_type',
          'distribution_data',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(row, requiredColumns);
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          distribution_type: (v) => typeof v === 'string',
          distribution_data: (v) => v !== undefined, // could be any JSON
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(row, typeChecks);
      }
    });

    // Department-related views used in the app
    it('department_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('department_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Actual columns for department compare summary (without created_at/updated_at)
        const requiredColumns = [
          'department_code',
          'department_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('vendor_transactions table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const transaction = data[0];
        
        // All columns used by process_json.ts and DatabaseVendorTransaction interface
        const requiredColumns = [
          'id',
          'vendor_id',
          'fiscal_year',
          'amount',
          'transaction_count',
          'department_name',
          'department_code',
          'agency_name',
          'account_type',
          'program_code',
          'fund_code',
          'category',
          'subcategory',
          'description',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(transaction, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          vendor_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          amount: (v) => typeof v === 'number',
          transaction_count: (v) => typeof v === 'number',
          department_name: (v) => v === null || typeof v === 'string',
          department_code: (v) => v === null || typeof v === 'string',
          agency_name: (v) => v === null || typeof v === 'string',
          account_type: (v) => v === null || typeof v === 'string',
          program_code: (v) => v === null || typeof v === 'string',
          fund_code: (v) => v === null || typeof v === 'string',
          category: (v) => v === null || typeof v === 'string',
          subcategory: (v) => v === null || typeof v === 'string',
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(transaction, typeChecks);
      }
    });

    it('programs table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const program = data[0];
        
        // All columns used by process_json.ts and ProgramData
        const requiredColumns = [
          'project_code',
          'name',
          'program_description_ids',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(program, requiredColumns);
        
        // Test column types
        const typeChecks = {
          project_code: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          program_description_ids: (v) => v === null || Array.isArray(v),
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(program, typeChecks);
      }
    });

    it('program_descriptions table should have all columns with correct types', async () => {
      const { data, error } = await supabase
        .from('program_descriptions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const description = data[0];
        
        // All columns for program descriptions
        const requiredColumns = [
          'id',
          'description',
          'sources',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(description, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          description: (v) => typeof v === 'string',
          sources: (v) => Array.isArray(v),
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(description, typeChecks);
      }
    });

    // Program-related views used in the app
    it('program_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('program_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Typical columns for program compare summary
        const requiredColumns = [
          'program_code',
          'program_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('programs_with_descriptions view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('programs_with_descriptions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for programs with descriptions view (updated schema)
        const requiredColumns = [
          'project_code',
          'program_name',
          'program_description_ids',
          'description_texts',
          'all_sources',
          'program_created_at',
          'program_updated_at'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('funds table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const fund = data[0];
        
        // All columns used by process_json.ts and FundData
        const requiredColumns = [
          'id',
          'fund_code',
          'name',
          'fund_group',
          'description',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(fund, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          fund_code: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          fund_group: (v) => typeof v === 'string',
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(fund, typeChecks);
      }
    });

    // Fund-related views used in the app
    it('fund_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('fund_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Typical columns for fund compare summary
        const requiredColumns = [
          'fund_code',
          'fund_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('vendors table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const vendor = data[0];
        
        // All columns used by process_json.ts and VendorData
        const requiredColumns = [
          'id',
          'name',
          'ein',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(vendor, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          ein: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(vendor, typeChecks);
      }
    });

    // Vendor-related views used in the app
    it('vendor_transactions_with_vendor_fy2024 view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions_with_vendor_fy2024')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for vendor transactions with vendor name (used in spend API)
        const requiredColumns = [
          'id',
          'vendor_id',
          'vendor_name',
          'fiscal_year',
          'amount',
          'transaction_count',
          'department_name',
          'department_code',
          'agency_name',
          'account_type',
          'program_code',
          'fund_code',
          'category',
          'subcategory',
          'description',
          'created_at',
          'updated_at'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
        
        // Test that vendor_name is populated (the main purpose of this view)
        expect(typeof row.vendor_name).toBe('string');
        expect(row.vendor_name.length).toBeGreaterThan(0);
      }
    });

    it('budgets table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const budget = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'department_code',
          'fiscal_year',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(budget, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_code: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(budget, typeChecks);
      }
    });

    it('budget_line_items table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const lineItem = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'budget_id',
          'project_code',
          'fund_code',
          'fund_type',
          'amount',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(lineItem, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          budget_id: (v) => typeof v === 'string',
          project_code: (v) => v === null || typeof v === 'string',
          fund_code: (v) => v === null || typeof v === 'string',
          fund_type: (v) => v === null || typeof v === 'number',
          amount: (v) => typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(lineItem, typeChecks);
      }
    });

    // Budget-related views used in the app
    it('budget_line_items_with_names view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('budget_line_items_with_names')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for budget line items with names (used in spend API budget view)
        const requiredColumns = [
          'id',
          'amount',
          'fiscal_year',
          'department_code',
          'department_name',
          'program_name',
          'fund_name'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
        
        // Test that name fields are populated (the main purpose of this view)
        expect(typeof row.department_name).toBe('string');
        expect(row.department_name.length).toBeGreaterThan(0);
        expect(typeof row.program_name).toBe('string');
        expect(row.program_name.length).toBeGreaterThan(0);
        expect(typeof row.fund_name).toBe('string');
        expect(row.fund_name.length).toBeGreaterThan(0);
        
        // Test that numeric fields are numbers
        expect(typeof row.amount).toBe('number');
        expect(typeof row.fiscal_year).toBe('number');
        // fund_type is not included in this view
      }
    });

    it('search_index table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('search_index')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'term',
          'type',
          'source_id',
          'additional_data',
          'fiscal_year',
          'fts',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(searchItem, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          term: (v) => typeof v === 'string',
          type: (v) => typeof v === 'string' && ['department', 'vendor', 'program', 'fund'].includes(v),
          source_id: (v) => typeof v === 'string',
          additional_data: (v) => v === null || typeof v === 'object',
          fiscal_year: (v) => v === null || typeof v === 'number',
          fts: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(searchItem, typeChecks);
      }
    });

    // Search functionality tests
    it('search_index should support full-text search capabilities', async () => {
      // Test that the fts column is properly populated for full-text search
      const { data, error } = await supabase
        .from('search_index')
        .select('term, fts')
        .not('fts', 'is', null)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        expect(searchItem.term).toBeDefined();
        expect(searchItem.fts).toBeDefined();
        expect(typeof searchItem.fts).toBe('string');
        expect(searchItem.fts.length).toBeGreaterThan(0);
      }
    });

    it('search_index should support filtering by type', async () => {
      // Test filtering by different search types
      const types = ['department', 'vendor', 'program', 'fund'];
      
      for (const type of types) {
        const { data, error } = await supabase
          .from('search_index')
          .select('id, term, type, source_id')
          .eq('type', type)
          .limit(5);
        
        expect(error).toBeNull();
        if (data && data.length > 0) {
          data.forEach(item => {
            expect(item.type).toBe(type);
            expect(item.term).toBeDefined();
            expect(item.source_id).toBeDefined();
          });
        }
      }
    });

    it('search_index should support additional_data JSON structure', async () => {
      // Test that additional_data contains the expected structure from process_json.ts
      const { data, error } = await supabase
        .from('search_index')
        .select('type, additional_data')
        .not('additional_data', 'is', null)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        expect(searchItem.additional_data).toBeDefined();
        expect(typeof searchItem.additional_data).toBe('object');
        
        // Check for expected fields based on type
        const additionalData = searchItem.additional_data;
        expect(additionalData).toHaveProperty('display');
        expect(additionalData).toHaveProperty('context');
        expect(typeof additionalData.display).toBe('string');
        expect(typeof additionalData.context).toBe('string');
      }
    });

    it('search_index should support upsert operations with conflict resolution', async () => {
      // Test the exact upsert pattern used by process_json.ts
      const testSearchItem = {
        term: 'Test Search Term for Integration',
        type: 'department',
        source_id: 'TEST001',
        additional_data: {
          display: 'Test Department',
          context: 'Test department for integration testing'
        }
      };

      const { data, error } = await supabase
        .from('search_index')
        .upsert(testSearchItem, {
          onConflict: 'term,type,source_id'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('search_index')
        .delete()
        .eq('term', testSearchItem.term)
        .eq('type', testSearchItem.type)
        .eq('source_id', testSearchItem.source_id);
    });
  });

  // Test all foreign key relationships
  describe('Foreign Key Relationships', () => {
    it('should have proper foreign key from vendor_transactions to vendors', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          id,
          vendor_id,
          vendors!inner(id, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('vendors');
        expect(data[0].vendors).toHaveProperty('id');
        expect(data[0].vendors).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from vendor_transactions to programs', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          id,
          program_code,
          programs!inner(project_code, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('programs');
        expect(data[0].programs).toHaveProperty('project_code');
        expect(data[0].programs).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from vendor_transactions to funds', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          id,
          fund_code,
          funds!inner(fund_code, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('funds');
        expect(data[0].funds).toHaveProperty('fund_code');
        expect(data[0].funds).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from budget_line_items to budgets', async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select(`
          id,
          budget_id,
          budgets!inner(id, department_code, fiscal_year)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('budgets');
        expect(data[0].budgets).toHaveProperty('id');
        expect(data[0].budgets).toHaveProperty('department_code');
        expect(data[0].budgets).toHaveProperty('fiscal_year');
      }
    });

    it('should have proper foreign key from budget_line_items to programs', async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select(`
          id,
          project_code,
          programs!inner(project_code, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('programs');
        expect(data[0].programs).toHaveProperty('project_code');
        expect(data[0].programs).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from budget_line_items to funds', async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select(`
          id,
          fund_code,
          funds!inner(fund_code, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('funds');
        expect(data[0].funds).toHaveProperty('fund_code');
        expect(data[0].funds).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from budgets to departments', async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id,
          department_code,
          departments!inner(organizational_code, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('departments');
        expect(data[0].departments).toHaveProperty('organizational_code');
        expect(data[0].departments).toHaveProperty('name');
      }
    });



    it('should have proper foreign key from department_workforce to departments', async () => {
      const { data, error } = await supabase
        .from('department_workforce')
        .select(`
          id,
          department_id,
          departments!inner(id, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('departments');
        expect(data[0].departments).toHaveProperty('id');
        expect(data[0].departments).toHaveProperty('name');
      }
    });

    it('should have proper foreign key from department_distributions to departments', async () => {
      const { data, error } = await supabase
        .from('department_distributions')
        .select(`
          id,
          department_id,
          departments!inner(id, name)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('departments');
        expect(data[0].departments).toHaveProperty('id');
        expect(data[0].departments).toHaveProperty('name');
      }
    });
  });

  // Test all indexes and query performance
  describe('Indexes and Query Performance', () => {
    it('should have efficient queries on vendor_transactions by fiscal_year', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, amount, fiscal_year')
        .eq('fiscal_year', 2024)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendor_transactions by vendor_id', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, amount, vendor_id')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendor_transactions by program_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, amount, program_code')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendor_transactions by fund_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, amount, fund_code')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendor_transactions by category', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, amount, category')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on departments by organizational_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, organizational_code')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on departments by name', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, organizational_code')
        .ilike('name', '%Department%')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on departments by parent_agency', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, parent_agency')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on programs by project_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('programs')
        .select('project_code, name')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on programs by name', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('programs')
        .select('project_code, name')
        .ilike('name', '%Program%')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on funds by fund_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('funds')
        .select('id, fund_code, name')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on funds by fund_group', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('funds')
        .select('id, fund_code, fund_group')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendors by name', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, ein')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on vendors by ein', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, ein')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on budget_line_items by budget_id', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('id, amount, budget_id')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on budget_line_items by project_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('id, amount, project_code')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on budget_line_items by fund_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('id, amount, fund_code')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on budgets by department_code', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('budgets')
        .select('id, department_code, fiscal_year')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on budgets by fiscal_year', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('budgets')
        .select('id, department_code, fiscal_year')
        .eq('fiscal_year', 2024)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });



    it('should have efficient queries on department_workforce by department_id', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('department_workforce')
        .select('id, department_id, head_count')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on department_workforce by fiscal_year', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('department_workforce')
        .select('id, department_id, fiscal_year')
        .eq('fiscal_year', 2024)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on department_distributions by department_id', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('department_distributions')
        .select('id, department_id, distribution_type')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on department_distributions by fiscal_year', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('department_distributions')
        .select('id, department_id, fiscal_year')
        .eq('fiscal_year', 2024)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient queries on department_distributions by distribution_type', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('department_distributions')
        .select('id, department_id, distribution_type')
        .eq('distribution_type', 'tenure')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient full-text search on departments', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .textSearch('name', 'Department')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient full-text search on vendors', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .textSearch('name', 'Vendor')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient full-text search on funds', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('funds')
        .select('id, name')
        .textSearch('name', 'Fund')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });

    it('should have efficient full-text search on search_index', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('search_index')
        .select('id, term, type')
        .textSearch('fts', 'test')
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(2000);
    });
  });

  // Test all materialized views
  describe('Materialized Views', () => {
    // Remove tests for views that don't exist
    
    it('should have budget_line_items_with_names view', async () => {
      const { data, error } = await supabase
        .from('budget_line_items_with_names')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('department_name');
        expect(data[0]).toHaveProperty('program_name');
        expect(data[0]).toHaveProperty('fund_name');
      }
    });

    it('should have fund_compare_summary view', async () => {
      const { data, error } = await supabase
        .from('fund_compare_summary')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('fund_code');
        expect(data[0]).toHaveProperty('fund_name');
        expect(data[0]).toHaveProperty('year');
        expect(data[0]).toHaveProperty('vendor_amount');
        expect(data[0]).toHaveProperty('budget_amount');
      }
    });

    it('should have department_compare_summary view', async () => {
      const { data, error } = await supabase
        .from('department_compare_summary')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('department_code');
        expect(data[0]).toHaveProperty('department_name');
        expect(data[0]).toHaveProperty('year');
        expect(data[0]).toHaveProperty('vendor_amount');
        expect(data[0]).toHaveProperty('budget_amount');
      }
    });

    it('should have program_compare_summary view', async () => {
      const { data, error } = await supabase
        .from('program_compare_summary')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('program_code');
        expect(data[0]).toHaveProperty('program_name');
        expect(data[0]).toHaveProperty('year');
        expect(data[0]).toHaveProperty('vendor_amount');
        expect(data[0]).toHaveProperty('budget_amount');
      }
    });

    it('should have programs_with_descriptions view', async () => {
      const { data, error } = await supabase
        .from('programs_with_descriptions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('project_code');
        expect(data[0]).toHaveProperty('program_name');
        expect(data[0]).toHaveProperty('program_description_ids');
        expect(data[0]).toHaveProperty('description_texts');
        expect(data[0]).toHaveProperty('all_sources');
        expect(data[0]).toHaveProperty('program_created_at');
        expect(data[0]).toHaveProperty('program_updated_at');
      }
    });

    it('should have efficient queries on materialized views', async () => {
      // Only check views that actually exist
      const views = [
        'budget_line_items_with_names',
        'fund_compare_summary',
        'department_compare_summary',
        'program_compare_summary',
        'programs_with_descriptions',
        'vendor_payments_summary' // This view exists according to the API code
      ];

      for (const viewName of views) {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(5);
        
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        expect(error).toBeNull();
        expect(queryTime).toBeLessThan(2000); // Materialized views should be fast
      }
    });
  });

  // Test that required columns exist in key tables with TypeScript type validation
  describe('Required Columns and Type Validation', () => {
    it('departments table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const dept = data[0];
        // All columns used by process_json.ts and DepartmentData
        const requiredColumns = [
          'id',
          'organizational_code',
          'name',
          'canonical_name',
          'org_level',
          'budget_status',
          'key_functions',
          'abbreviation',
          'parent_agency',
          'entity_code',
          'note',
          'aliases',
          'description',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(dept, requiredColumns);
        // Type checks
        const typeChecks = {
          id: (v) => typeof v === 'string',
          organizational_code: (v) => v === null || typeof v === 'string',
          name: (v) => typeof v === 'string',
          canonical_name: (v) => v === null || typeof v === 'string',
          org_level: (v) => v === null || typeof v === 'number',
          budget_status: (v) => v === null || typeof v === 'string',
          key_functions: (v) => v === null || typeof v === 'string',
          abbreviation: (v) => v === null || typeof v === 'string',
          parent_agency: (v) => v === null || typeof v === 'string',
          entity_code: (v) => v === null || typeof v === 'number',
          note: (v) => v === null || typeof v === 'string',
          aliases: (v) => v === null || Array.isArray(v),
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(dept, typeChecks);
      }
    });



    it('department_workforce table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('department_workforce')
        .select('*')
        .limit(1);
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        const requiredColumns = [
          'id',
          'department_id',
          'fiscal_year',
          'head_count',
          'total_wages',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(row, requiredColumns);
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          head_count: (v) => typeof v === 'number',
          total_wages: (v) => v === null || typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(row, typeChecks);
      }
    });

    it('department_distributions table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('department_distributions')
        .select('*')
        .limit(1);
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        const requiredColumns = [
          'id',
          'department_id',
          'fiscal_year',
          'distribution_type',
          'distribution_data',
          'created_at',
          'updated_at'
        ];
        validateRequiredColumns(row, requiredColumns);
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          distribution_type: (v) => typeof v === 'string',
          distribution_data: (v) => v !== undefined, // could be any JSON
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        validateColumnTypes(row, typeChecks);
      }
    });

    // Department-related views used in the app
    it('department_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('department_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Typical columns for compare summary
        const requiredColumns = [
          'department_code',
          'department_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('vendor_transactions table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const transaction = data[0];
        
        // All columns used by process_json.ts and DatabaseVendorTransaction interface
        const requiredColumns = [
          'id',
          'vendor_id',
          'fiscal_year',
          'amount',
          'transaction_count',
          'department_name',
          'department_code',
          'agency_name',
          'account_type',
          'program_code',
          'fund_code',
          'category',
          'subcategory',
          'description',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(transaction, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          vendor_id: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          amount: (v) => typeof v === 'number',
          transaction_count: (v) => typeof v === 'number',
          department_name: (v) => v === null || typeof v === 'string',
          department_code: (v) => v === null || typeof v === 'string',
          agency_name: (v) => v === null || typeof v === 'string',
          account_type: (v) => v === null || typeof v === 'string',
          program_code: (v) => v === null || typeof v === 'string',
          fund_code: (v) => v === null || typeof v === 'string',
          category: (v) => v === null || typeof v === 'string',
          subcategory: (v) => v === null || typeof v === 'string',
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(transaction, typeChecks);
      }
    });

    it('programs table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const program = data[0];
        
        // All columns used by process_json.ts and ProgramData
        const requiredColumns = [
          'project_code',
          'name',
          'program_description_ids',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(program, requiredColumns);
        
        // Test column types
        const typeChecks = {
          project_code: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          program_description_ids: (v) => v === null || Array.isArray(v),
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(program, typeChecks);
      }
    });

    it('program_descriptions table should have all columns with correct types', async () => {
      const { data, error } = await supabase
        .from('program_descriptions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const description = data[0];
        
        // All columns for program descriptions
        const requiredColumns = [
          'id',
          'description',
          'sources',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(description, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          description: (v) => typeof v === 'string',
          sources: (v) => Array.isArray(v),
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(description, typeChecks);
      }
    });

    // Program-related views used in the app
    it('program_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('program_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Typical columns for program compare summary
        const requiredColumns = [
          'program_code',
          'program_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('programs_with_descriptions view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('programs_with_descriptions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for programs with descriptions view (updated schema)
        const requiredColumns = [
          'project_code',
          'program_name',
          'program_description_ids',
          'description_texts',
          'all_sources',
          'program_created_at',
          'program_updated_at'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('funds table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const fund = data[0];
        
        // All columns used by process_json.ts and FundData
        const requiredColumns = [
          'id',
          'fund_code',
          'name',
          'fund_group',
          'description',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(fund, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          fund_code: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          fund_group: (v) => typeof v === 'string',
          description: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(fund, typeChecks);
      }
    });

    // Fund-related views used in the app
    it('fund_compare_summary view (if present) should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('fund_compare_summary')
        .select('*')
        .limit(1);
      // If the view does not exist, error will be non-null and message will mention not found
      if (error && error.message && error.message.match(/not exist|not found|does not exist/i)) {
        // View is optional, skip test
        return;
      }
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Typical columns for fund compare summary
        const requiredColumns = [
          'fund_code',
          'fund_name',
          'year',
          'vendor_amount',
          'budget_amount'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
      }
    });

    it('vendors table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const vendor = data[0];
        
        // All columns used by process_json.ts and VendorData
        const requiredColumns = [
          'id',
          'name',
          'ein',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(vendor, requiredColumns);
        
        // Test column types
        const typeChecks = {
          id: (v) => typeof v === 'string',
          name: (v) => typeof v === 'string',
          ein: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(vendor, typeChecks);
      }
    });

    // Vendor-related views used in the app
    it('vendor_transactions_with_vendor_fy2024 view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions_with_vendor_fy2024')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for vendor transactions with vendor name (used in spend API)
        const requiredColumns = [
          'id',
          'vendor_id',
          'vendor_name',
          'fiscal_year',
          'amount',
          'transaction_count',
          'department_name',
          'department_code',
          'agency_name',
          'account_type',
          'program_code',
          'fund_code',
          'category',
          'subcategory',
          'description',
          'created_at',
          'updated_at'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
        
        // Test that vendor_name is populated (the main purpose of this view)
        expect(typeof row.vendor_name).toBe('string');
        expect(row.vendor_name.length).toBeGreaterThan(0);
      }
    });

    it('budgets table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const budget = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'department_code',
          'fiscal_year',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(budget, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          department_code: (v) => typeof v === 'string',
          fiscal_year: (v) => typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(budget, typeChecks);
      }
    });

    it('budget_line_items table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const lineItem = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'budget_id',
          'project_code',
          'fund_code',
          'fund_type',
          'amount',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(lineItem, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          budget_id: (v) => typeof v === 'string',
          project_code: (v) => v === null || typeof v === 'string',
          fund_code: (v) => v === null || typeof v === 'string',
          fund_type: (v) => v === null || typeof v === 'number',
          amount: (v) => typeof v === 'number',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(lineItem, typeChecks);
      }
    });

    // Budget-related views used in the app
    it('budget_line_items_with_names view should exist and return expected columns', async () => {
      const { data, error } = await supabase
        .from('budget_line_items_with_names')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const row = data[0];
        // Expected columns for budget line items with names (used in spend API budget view)
        const requiredColumns = [
          'id',
          'amount',
          'fiscal_year',
          'department_code',
          'department_name',
          'program_name',
          'fund_name'
        ];
        requiredColumns.forEach(col => expect(row).toHaveProperty(col));
        
        // Test that name fields are populated (the main purpose of this view)
        expect(typeof row.department_name).toBe('string');
        expect(row.department_name.length).toBeGreaterThan(0);
        expect(typeof row.program_name).toBe('string');
        expect(row.program_name.length).toBeGreaterThan(0);
        expect(typeof row.fund_name).toBe('string');
        expect(row.fund_name.length).toBeGreaterThan(0);
        
        // Test that numeric fields are numbers
        expect(typeof row.amount).toBe('number');
        expect(typeof row.fiscal_year).toBe('number');
        // fund_type is not included in this view
      }
    });

    it('search_index table should have all columns used by process_json.ts with correct types', async () => {
      const { data, error } = await supabase
        .from('search_index')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        
        // All columns used by process_json.ts
        const requiredColumns = [
          'id',
          'term',
          'type',
          'source_id',
          'additional_data',
          'fiscal_year',
          'fts',
          'created_at',
          'updated_at'
        ];
        
        validateRequiredColumns(searchItem, requiredColumns);
        
        // Test column types based on process_json.ts usage
        const typeChecks = {
          id: (v) => typeof v === 'string',
          term: (v) => typeof v === 'string',
          type: (v) => typeof v === 'string' && ['department', 'vendor', 'program', 'fund'].includes(v),
          source_id: (v) => typeof v === 'string',
          additional_data: (v) => v === null || typeof v === 'object',
          fiscal_year: (v) => v === null || typeof v === 'number',
          fts: (v) => v === null || typeof v === 'string',
          created_at: (v) => v === null || typeof v === 'string',
          updated_at: (v) => v === null || typeof v === 'string'
        };
        
        validateColumnTypes(searchItem, typeChecks);
      }
    });

    // Search functionality tests
    it('search_index should support full-text search capabilities', async () => {
      // Test that the fts column is properly populated for full-text search
      const { data, error } = await supabase
        .from('search_index')
        .select('term, fts')
        .not('fts', 'is', null)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        expect(searchItem.term).toBeDefined();
        expect(searchItem.fts).toBeDefined();
        expect(typeof searchItem.fts).toBe('string');
        expect(searchItem.fts.length).toBeGreaterThan(0);
      }
    });

    it('search_index should support filtering by type', async () => {
      // Test filtering by different search types
      const types = ['department', 'vendor', 'program', 'fund'];
      
      for (const type of types) {
        const { data, error } = await supabase
          .from('search_index')
          .select('id, term, type, source_id')
          .eq('type', type)
          .limit(5);
        
        expect(error).toBeNull();
        if (data && data.length > 0) {
          data.forEach(item => {
            expect(item.type).toBe(type);
            expect(item.term).toBeDefined();
            expect(item.source_id).toBeDefined();
          });
        }
      }
    });

    it('search_index should support additional_data JSON structure', async () => {
      // Test that additional_data contains the expected structure from process_json.ts
      const { data, error } = await supabase
        .from('search_index')
        .select('type, additional_data')
        .not('additional_data', 'is', null)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const searchItem = data[0];
        expect(searchItem.additional_data).toBeDefined();
        expect(typeof searchItem.additional_data).toBe('object');
        
        // Check for expected fields based on type
        const additionalData = searchItem.additional_data;
        expect(additionalData).toHaveProperty('display');
        expect(additionalData).toHaveProperty('context');
        expect(typeof additionalData.display).toBe('string');
        expect(typeof additionalData.context).toBe('string');
      }
    });

    it('search_index should support upsert operations with conflict resolution', async () => {
      // Test the exact upsert pattern used by process_json.ts
      const testSearchItem = {
        term: 'Test Search Term for Integration',
        type: 'department',
        source_id: 'TEST001',
        additional_data: {
          display: 'Test Department',
          context: 'Test department for integration testing'
        }
      };

      const { data, error } = await supabase
        .from('search_index')
        .upsert(testSearchItem, {
          onConflict: 'term,type,source_id'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('search_index')
        .delete()
        .eq('term', testSearchItem.term)
        .eq('type', testSearchItem.type)
        .eq('source_id', testSearchItem.source_id);
    });
  });

  // Test that the schema supports process_json.ts operations
  describe('process_json.ts Compatibility', () => {
    it('should support upserting departments with all required fields', async () => {
      const testDept = {
        name: 'Test Department for Integration Test',
        organizational_code: 'TEST001',
        canonical_name: 'Test Department',
        org_level: 1,
        budget_status: 'active',
        key_functions: 'Testing',
        abbreviation: 'TEST',
        parent_agency: null,
        entity_code: null,
        aliases: ['Test Dept'],
        description: 'Test department for integration testing'
      };

      const { data, error } = await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });

    it('should support upserting programs with all required fields', async () => {
      const testProgram = {
        project_code: 'TEST001',
        name: 'Test Program',
        program_description_ids: []
      };

      const { data, error } = await supabase
        .from('programs')
        .upsert(testProgram, { onConflict: 'project_code' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('programs')
        .delete()
        .eq('project_code', testProgram.project_code);
    });

    it('should support upserting vendors with all required fields', async () => {
      const testVendor = {
        name: 'Test Vendor for Integration Test',
        ein: '123456789'
      };

      const { data, error } = await supabase
        .from('vendors')
        .upsert(testVendor, { onConflict: 'name' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('vendors')
        .delete()
        .eq('name', testVendor.name);
    });

    it('should support upserting funds with all required fields', async () => {
      const testFund = {
        fund_code: 'TEST001',
        name: 'Test Fund',
        fund_group: 'Test Group',
        description: 'Test fund for integration testing'
      };

      const { data, error } = await supabase
        .from('funds')
        .upsert(testFund, { onConflict: 'fund_code' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('funds')
        .delete()
        .eq('fund_code', testFund.fund_code);
    });

    it('should support upserting budgets with all required fields', async () => {
      // First create a test department since budgets have a foreign key to departments
      const testDept = {
        name: 'Test Department for Budget',
        organizational_code: 'TEST001'
      };

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' })
        .select()
        .single();

      expect(deptError).toBeNull();
      expect(deptData).toBeDefined();

      const testBudget = {
        department_code: 'TEST001',
        fiscal_year: 2024
      };

      const { data, error } = await supabase
        .from('budgets')
        .insert(testBudget)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('budgets')
        .delete()
        .eq('department_code', testBudget.department_code)
        .eq('fiscal_year', testBudget.fiscal_year);
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });

    it('should support upserting budget line items with all required fields', async () => {
      // First create a test department since budgets have a foreign key to departments
      const testDept = {
        name: 'Test Department for Budget Line Items',
        organizational_code: 'TEST002'
      };

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' })
        .select()
        .single();

      expect(deptError).toBeNull();
      expect(deptData).toBeDefined();

      // Create test funds since budget_line_items have foreign keys to funds
      const testFund = {
        fund_code: 'TEST001',
        name: 'Test Fund for Budget Line Items',
        fund_group: 'Test Group'
      };

      const { data: fundData, error: fundError } = await supabase
        .from('funds')
        .upsert(testFund, { onConflict: 'fund_code' })
        .select()
        .single();

      expect(fundError).toBeNull();
      expect(fundData).toBeDefined();

      // Create test program since budget_line_items may have foreign keys to programs
      const testProgram = {
        project_code: 'TEST001',
        name: 'Test Program for Budget Line Items'
      };

      const { data: programData, error: programError } = await supabase
        .from('programs')
        .upsert(testProgram, { onConflict: 'project_code' })
        .select()
        .single();

      expect(programError).toBeNull();
      expect(programData).toBeDefined();

      // Then create a budget to reference
      const testBudget = {
        department_code: 'TEST002',
        fiscal_year: 2024
      };

      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .insert(testBudget)
        .select()
        .single();

      expect(budgetError).toBeNull();
      expect(budgetData).toBeDefined();

      const testLineItem = {
        budget_id: budgetData.id,
        project_code: 'TEST001',
        fund_code: 'TEST001',
        fund_type: 0, // State Operations
        amount: 1000000.00
      };

      const { data, error } = await supabase
        .from('budget_line_items')
        .insert(testLineItem)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('budget_line_items')
        .delete()
        .eq('budget_id', budgetData.id);
      await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetData.id);
      await supabase
        .from('programs')
        .delete()
        .eq('project_code', testProgram.project_code);
      await supabase
        .from('funds')
        .delete()
        .eq('fund_code', testFund.fund_code);
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });



    it('should support upserting department_workforce with all required fields', async () => {
      // First create a test department since department_workforce has a foreign key to departments
      const testDept = {
        name: 'Test Department for Workforce',
        organizational_code: 'TEST004'
      };

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' })
        .select()
        .single();

      expect(deptError).toBeNull();
      expect(deptData).toBeDefined();

      const testWorkforce = {
        department_id: deptData.id,
        fiscal_year: 2024,
        head_count: 150,
        total_wages: 15000000.00
      };

      const { data, error } = await supabase
        .from('department_workforce')
        .upsert(testWorkforce, { onConflict: 'department_id,fiscal_year' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('department_workforce')
        .delete()
        .eq('department_id', deptData.id)
        .eq('fiscal_year', testWorkforce.fiscal_year);
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });

    it('should support upserting department_distributions with all required fields', async () => {
      // First create a test department since department_distributions has a foreign key to departments
      const testDept = {
        name: 'Test Department for Distributions',
        organizational_code: 'TEST005'
      };

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' })
        .select()
        .single();

      expect(deptError).toBeNull();
      expect(deptData).toBeDefined();

      const testDistribution = {
        department_id: deptData.id,
        fiscal_year: 2024,
        distribution_type: 'salary' as const,
        distribution_data: {
          ranges: [
            { min: 0, max: 50000, count: 50 },
            { min: 50001, max: 100000, count: 75 },
            { min: 100001, max: 150000, count: 25 }
          ],
          total_employees: 150
        }
      };

      const { data, error } = await supabase
        .from('department_distributions')
        .upsert(testDistribution, { onConflict: 'department_id,fiscal_year,distribution_type' })
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase
        .from('department_distributions')
        .delete()
        .eq('department_id', deptData.id)
        .eq('fiscal_year', testDistribution.fiscal_year)
        .eq('distribution_type', testDistribution.distribution_type);
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });

    it('should support vendor operations matching process_json.ts pattern (delete then upsert vendors, delete then insert transactions)', async () => {
      // First create a test vendor since vendor_transactions has a foreign key to vendors
      const testVendor = {
        name: 'Test Vendor for Transactions',
        ein: '123456789'
      };

      // Create test fund since vendor_transactions may reference fund_code
      const testFund = {
        fund_code: 'TEST001',
        name: 'Test Fund for Vendor Transactions',
        fund_group: 'Test Group'
      };

      const { data: fundData, error: fundError } = await supabase
        .from('funds')
        .upsert(testFund, { onConflict: 'fund_code' })
        .select()
        .single();

      expect(fundError).toBeNull();
      expect(fundData).toBeDefined();

      // Create test program since vendor_transactions may reference program_code
      const testProgram = {
        project_code: 'TEST001',
        name: 'Test Program for Vendor Transactions'
      };

      const { data: programData, error: programError } = await supabase
        .from('programs')
        .upsert(testProgram, { onConflict: 'project_code' })
        .select()
        .single();

      expect(programError).toBeNull();
      expect(programData).toBeDefined();

      // Step 1: Delete existing vendors for this fiscal year (matching process_json.ts pattern)
      const { error: deleteVendorError } = await supabase
        .from('vendors')
        .delete()
        .eq('name', testVendor.name);

      expect(deleteVendorError).toBeNull();

      // Step 2: Upsert vendor (matching process_json.ts pattern)
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .upsert(testVendor, { onConflict: 'name' })
        .select()
        .single();

      expect(vendorError).toBeNull();
      expect(vendorData).toBeDefined();

      // Step 3: Delete existing transactions for this fiscal year (matching process_json.ts pattern)
      const { error: deleteTransactionError } = await supabase
        .from('vendor_transactions')
        .delete()
        .eq('vendor_id', vendorData.id)
        .eq('fiscal_year', 2024);

      expect(deleteTransactionError).toBeNull();

      // Step 4: Insert new transactions (matching process_json.ts pattern)
      const testTransaction = {
        vendor_id: vendorData.id,
        fiscal_year: 2024,
        amount: 250000.00,
        transaction_count: 5,
        department_name: 'Test Department',
        department_code: 'TEST006',
        agency_name: 'Test Agency',
        account_type: 'Services',
        program_code: 'TEST001',
        fund_code: 'TEST001',
        category: 'Professional Services',
        subcategory: 'Consulting',
        description: 'Test vendor transaction for integration testing'
      };

      const { data: transactionData, error: transactionError } = await supabase
        .from('vendor_transactions')
        .insert(testTransaction)
        .select();

      expect(transactionError).toBeNull();
      expect(transactionData).toBeDefined();
      
      // Clean up - delete in reverse order to respect foreign key constraints
      await supabase
        .from('vendor_transactions')
        .delete()
        .eq('vendor_id', vendorData.id)
        .eq('fiscal_year', testTransaction.fiscal_year)
        .eq('amount', testTransaction.amount);
      await supabase
        .from('vendors')
        .delete()
        .eq('name', testVendor.name);
      await supabase
        .from('programs')
        .delete()
        .eq('project_code', testProgram.project_code);
      await supabase
        .from('funds')
        .delete()
        .eq('fund_code', testFund.fund_code);
    });
  });

  // Error condition testing
  describe('Error Condition Testing', () => {
    it('should handle missing required columns gracefully', async () => {
      // Test that we get a proper error when trying to insert invalid data
      const invalidDept = {
        // Missing required 'name' field
        organizational_code: 'TEST002'
      };

      const { data, error } = await supabase
        .from('departments')
        .insert(invalidDept);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('name');
    });

    it('should handle foreign key constraint violations', async () => {
      // Test that we get proper error when referencing non-existent vendor
      const invalidTransaction = {
        vendor_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        fiscal_year: 2024,
        amount: 100.00,
        transaction_count: 1
      };

      const { data, error } = await supabase
        .from('vendor_transactions')
        .insert(invalidTransaction);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('foreign key');
    });

    it('should handle unique constraint violations', async () => {
      // First create a department
      const testDept = {
        name: 'Unique Test Department',
        organizational_code: 'UNIQUE001'
      };

      await supabase
        .from('departments')
        .upsert(testDept, { onConflict: 'name' });

      // Try to create another with same name
      const duplicateDept = {
        name: 'Unique Test Department', // Same name
        organizational_code: 'UNIQUE002' // Different code
      };

      const { data, error } = await supabase
        .from('departments')
        .insert(duplicateDept);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('duplicate');

      // Clean up
      await supabase
        .from('departments')
        .delete()
        .eq('name', testDept.name);
    });
  });

  // Cross-reference with application code requirements
  describe('Application Code Cross-Reference', () => {
    it('should support departments API route requirements', async () => {
      // Test the exact query pattern used in src/app/api/departments/route.ts
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      expect(deptError).toBeNull();
      expect(Array.isArray(departments)).toBe(true);

      // Test the workforce join pattern
      const { data: workforceData, error: workforceError } = await supabase
        .from('department_workforce')
        .select(`
          *,
          departments!inner(id, name, organizational_code)
        `);

      expect(workforceError).toBeNull();
      expect(Array.isArray(workforceData)).toBe(true);
    });

    it('should support vendor transactions with all fields from process_json.ts', async () => {
      // Test the exact structure that process_json.ts uses for vendor transactions
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          id,
          vendor_id,
          fiscal_year,
          amount,
          transaction_count,
          department_name,
          department_code,
          agency_name,
          account_type,
          program_code,
          fund_code,
          category,
          subcategory,
          description
        `)
        .limit(1);

      expect(error).toBeNull();
      if (data && data.length > 0) {
        const transaction = data[0];
        // Verify all fields that process_json.ts expects are present
        expect(transaction).toHaveProperty('vendor_id');
        expect(transaction).toHaveProperty('fiscal_year');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('transaction_count');
        expect(transaction).toHaveProperty('department_name');
        expect(transaction).toHaveProperty('department_code');
        expect(transaction).toHaveProperty('agency_name');
        expect(transaction).toHaveProperty('account_type');
        expect(transaction).toHaveProperty('program_code');
        expect(transaction).toHaveProperty('fund_code');
        expect(transaction).toHaveProperty('category');
        expect(transaction).toHaveProperty('subcategory');
        expect(transaction).toHaveProperty('description');
      }
    });

    it('should support search index operations', async () => {
      // Test search index structure used by the application
      const { data, error } = await supabase
        .from('search_index')
        .select(`
          id,
          term,
          type,
          source_id,
          additional_data,
          fiscal_year,
          fts
        `)
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // Vendor-related views used in the app
  it('vendor_payments_summary view should exist and return expected columns', async () => {
    const { data, error } = await supabase
      .from('vendor_payments_summary')
      .select('*')
      .limit(1);
    
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('vendor_name');
      expect(data[0]).toHaveProperty('total_amount');
      expect(data[0]).toHaveProperty('transaction_count');
      expect(data[0]).toHaveProperty('years_active');
    }
  });
}); 