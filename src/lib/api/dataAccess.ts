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

  async getDepartmentBudgets(departmentCode: string, fiscalYear: number) {
    const cacheKey = this.getCacheKey('budgets', departmentCode, fiscalYear);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_line_items (
          program_code,
          fund_code,
          amount,
          description
        )
      `)
      .eq('department_code', departmentCode)
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

    const { data, error } = await searchQuery.limit(limit);
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