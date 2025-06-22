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

describe('Supabase Schema Integration Tests', () => {
  // Test that all required tables exist
  describe('Required Tables', () => {
    const requiredTables = [
      'departments',
      'department_spending', 
      'department_workforce',
      'department_distributions',
      'programs',
      'funds',
      'vendors',
      'vendor_transactions',
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

  // Test that required columns exist in key tables
  describe('Required Columns', () => {
    it('should have required columns in departments table', async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, organizational_code, canonical_name, org_level, budget_status, key_functions, abbreviation, parent_agency, entity_code, aliases, description')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const dept = data[0];
        expect(dept).toHaveProperty('id');
        expect(dept).toHaveProperty('name');
        expect(dept).toHaveProperty('organizational_code');
        expect(dept).toHaveProperty('canonical_name');
        expect(dept).toHaveProperty('org_level');
        expect(dept).toHaveProperty('budget_status');
        expect(dept).toHaveProperty('key_functions');
        expect(dept).toHaveProperty('abbreviation');
        expect(dept).toHaveProperty('parent_agency');
        expect(dept).toHaveProperty('entity_code');
        expect(dept).toHaveProperty('aliases');
        expect(dept).toHaveProperty('description');
      }
    });

    it('should have required columns in vendor_transactions table', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('id, vendor_id, fiscal_year, amount, transaction_count, department_name, department_code, agency_name, account_type, program_code, fund_code, category, subcategory, description')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const transaction = data[0];
        expect(transaction).toHaveProperty('id');
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

    it('should have required columns in programs table', async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, project_code, name, description')
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        const program = data[0];
        expect(program).toHaveProperty('id');
        expect(program).toHaveProperty('project_code');
        expect(program).toHaveProperty('name');
        expect(program).toHaveProperty('description');
      }
    });
  });

  // Test that foreign key relationships work
  describe('Foreign Key Relationships', () => {
    it('should be able to join vendors and vendor_transactions', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          id,
          amount,
          fiscal_year,
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

    it('should be able to join departments and department_workforce', async () => {
      const { data, error } = await supabase
        .from('department_workforce')
        .select(`
          id,
          fiscal_year,
          head_count,
          total_wages,
          departments!inner(id, name, organizational_code)
        `)
        .limit(1);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('departments');
        expect(data[0].departments).toHaveProperty('id');
        expect(data[0].departments).toHaveProperty('name');
        expect(data[0].departments).toHaveProperty('organizational_code');
      }
    });
  });

  // Test that indexes exist (by checking query performance)
  describe('Indexes and Performance', () => {
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
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
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
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  // Test that materialized views exist and work
  describe('Materialized Views', () => {
    it('should have vendor_transactions_with_vendor view', async () => {
      const { data, error } = await supabase
        .from('vendor_transactions_with_vendor')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have vendor_totals_all_years view', async () => {
      const { data, error } = await supabase
        .from('vendor_totals_all_years')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have budget_line_items_with_names view', async () => {
      const { data, error } = await supabase
        .from('budget_line_items_with_names')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // Test that the schema supports process_json.ts operations
  describe('process_json.ts Compatibility', () => {
    it('should support upserting departments', async () => {
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

    it('should support upserting vendors', async () => {
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

    it('should support upserting programs', async () => {
      const testProgram = {
        project_code: 'TEST001',
        name: 'Test Program',
        description: 'Test program for integration testing'
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
  });
}); 