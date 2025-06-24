/**
 * Data Access Layer
 * 
 * This module provides functions for accessing data from PostgreSQL with Redis caching
 * for better performance.
 */

import { getServiceSupabase } from '@/lib/supabase';
import { getFromCache, setInCache, invalidateByTag } from '@/lib/cache';
import type { Database } from '@/types/supabase';

// Base class for all data access
// eslint-disable-next-line no-unused-vars
class QueryBuilder<T> {
  protected table: string;
  protected defaultTTL: number = 3600; // 1 hour default cache
  protected tags: string[] = [];

  constructor(table: string, tags: string[] = []) {
    this.table = table;
    this.tags = tags;
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    return getFromCache<T>(key);
  }

  protected async setInCache<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    await setInCache(key, data, { ex: ttl, tags: this.tags });
  }

  protected getCacheKey(...parts: (string | number)[]): string {
    return `${this.table}:${parts.join(':')}`;
  }

  protected async invalidateCache(): Promise<void> {
    for (const tag of this.tags) {
      await invalidateByTag(tag);
    }
  }
}

// Department data access
class DepartmentAccess extends QueryBuilder<Database['public']['Tables']['departments']['Row']> {
  constructor() {
    super('departments', ['departments']);
  }

  async getDepartments(fiscalYear?: number) {
    const cacheKey = this.getCacheKey('all', fiscalYear || 'all');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('departments').select('*');
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }

  async getDepartmentByCode(orgCode: string) {
    const cacheKey = this.getCacheKey('code', orgCode);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('organizational_code', orgCode)
      .single();

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }

  async getDepartmentBudgets(departmentName: string, fiscalYear: number) {
    const cacheKey = this.getCacheKey('budgets', departmentName, fiscalYear);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();

    // First, get the department's organizational_code from its name
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('organizational_code')
      .eq('name', departmentName)
      .single();

    if (deptError || !dept || !dept.organizational_code) {
      console.error('Failed to find department or department code by name for budget lookup:', departmentName);
      return []; // Return empty array if department not found
    }

    const { data, error } = await supabase
      .from('budgets')
      .select(
        `
        *,
        budget_line_items (
          program_code,
          fund_code,
          amount,
          description
        )
      `
      )
      .eq('department_code', dept.organizational_code)
      .eq('fiscal_year', fiscalYear);

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Vendor data access
class VendorAccess extends QueryBuilder<Database['public']['Tables']['vendors']['Row']> {
  constructor() {
    super('vendors', ['vendors']);
  }

  async getVendors(filters: {
    fiscalYear?: number;
    sortBy?: 'total_amount' | 'transaction_count';
    limit?: number;
  } = {}) {
    const { fiscalYear, sortBy = 'total_amount', limit = 10 } = filters;
    const cacheKey = this.getCacheKey('list', fiscalYear || 'all', sortBy, limit);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('vendors').select('*');

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    query = query.order(sortBy, { ascending: false }).limit(limit);
    const { data, error } = await query;

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }

  async getVendorTransactions(vendorId: string, fiscalYear?: number) {
    const cacheKey = this.getCacheKey('transactions', vendorId, fiscalYear || 'all');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase
      .from('vendor_transactions')
      .select('*')
      .eq('vendor_id', vendorId);

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Search data access
class SearchAccess extends QueryBuilder<Database['public']['Tables']['search_index']['Row']> {
  constructor() {
    super('search', ['search']);
  }

  async search(query: string, options: {
    types?: string[];
    limit?: number;
  } = {}) {
    const { types, limit = 10 } = options;
    const cacheKey = this.getCacheKey('query', query, types?.join(',') || 'all', limit);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    const normalizedQuery = query.trim();
    let data, error;

    if (normalizedQuery.length <= 3) {
      // Fuzzy match on term, abbreviation, and aliases
      let searchQuery = supabase
        .from('search_index')
        .select('*')
        .or([
          `term.ilike.%${normalizedQuery}%`,
          `additional_data->>abbreviation.ilike.%${normalizedQuery}%`,
          `additional_data->>aliases.ilike.%${normalizedQuery}%`
        ].join(','));
      if (types?.length) {
        searchQuery = searchQuery.in('type', types);
      }
      ({ data, error } = await searchQuery.limit(limit));
    } else {
      // Use FTS for longer queries
      let searchQuery = supabase
        .from('search_index')
        .select('*')
        .textSearch('fts', query, {
          type: 'websearch',
          config: 'english'
        });
      if (types?.length) {
        searchQuery = searchQuery.in('type', types);
      }
      ({ data, error } = await searchQuery.limit(limit));
    }

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Fund data access
class FundAccess extends QueryBuilder<Database['public']['Tables']['funds']['Row']> {
  constructor() {
    super('funds', ['funds']);
  }

  async getFunds(filters: {
    fundGroup?: string;
    fiscalYear?: number;
  } = {}) {
    const { fundGroup, fiscalYear } = filters;
    const cacheKey = this.getCacheKey('list', fundGroup || 'all', fiscalYear || 'all');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('funds').select('*');

    if (fundGroup) {
      query = query.eq('fund_group', fundGroup);
    }
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Program data access
class ProgramAccess extends QueryBuilder<Database['public']['Tables']['programs']['Row']> {
  constructor() {
    super('programs', ['programs']);
  }

  async getPrograms(filters: {
    departmentCode?: string;
    fiscalYear?: number;
  } = {}) {
    const { departmentCode, fiscalYear } = filters;
    const cacheKey = this.getCacheKey('list', departmentCode || 'all', fiscalYear || 'all');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    let query = supabase.from('programs').select('*');

    if (departmentCode) {
      query = query.eq('department_code', departmentCode);
    }
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    await this.setInCache(cacheKey, data);
    return data;
  }

  async getProgramByCode(programCode: string) {
    const cacheKey = this.getCacheKey('code', programCode);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('project_code', programCode)
      .single();

    if (error) throw error;
    await this.setInCache(cacheKey, data);
    return data;
  }
}

// Export singleton instances
export const departments = new DepartmentAccess();
export const vendors = new VendorAccess();
export const search = new SearchAccess();
export const funds = new FundAccess();
export const programs = new ProgramAccess();

// Legacy function for backward compatibility - now uses Supabase
export async function getSearchData() {
  const cacheKey = 'search:legacy:all';
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const supabase = getServiceSupabase();
  
  // Get all search index entries
  const { data: searchIndexData, error } = await supabase
    .from('search_index')
    .select('*')
    .order('term');

  if (error) {
    console.error('Error fetching search data from Supabase:', error);
    throw error;
  }

  // Transform the data to match the expected SearchJSON structure
  const transformedData = {
    departments: [] as any[],
    vendors: [] as any[],
    programs: [] as any[],
    funds: [] as any[],
    keywords: [] as any[],
    lastUpdated: new Date().toISOString()
  };

  // Group by type and transform
  searchIndexData?.forEach(item => {
    const searchItem = {
      term: item.term,
      type: item.type,
      id: item.source_id,
      ...(item.additional_data as any)
    };

    switch (item.type) {
      case 'department':
        transformedData.departments.push(searchItem);
        break;
      case 'vendor':
        transformedData.vendors.push(searchItem);
        break;
      case 'program':
        transformedData.programs.push(searchItem);
        break;
      case 'fund':
        transformedData.funds.push(searchItem);
        break;
      case 'keyword':
        transformedData.keywords.push(searchItem);
        break;
    }
  });

  // Cache for 1 hour
  await setInCache(cacheKey, transformedData, { ex: 3600, tags: ['search'] });
  return transformedData;
} 