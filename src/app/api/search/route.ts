import { NextResponse, NextRequest } from 'next/server';
import { search as searchAccess } from '@/lib/api/dataAccess';
import type { SearchItem } from '@/types/search';
import { fuzzyMatch, formatMatchResult, type FuzzyMatchResult } from '@/lib/fuzzyMatching';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

interface SearchResponse {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds: SearchItem[];
  totalResults: number;
  query: string;
  appliedFilters: {
    types: string[];
    excludeCommon: boolean;
    limit: number;
  };
  details: {
    departments: Record<string, any>;
    vendors: Record<string, any>;
    programs: Record<string, any>;
    funds: Record<string, any>;
  };
}

// Common words to exclude from search
const COMMON_WORDS = new Set([
  'the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'as', 'at', 'from',
  'an', 'be', 'or', 'are', 'it', 'not', 'if', 'but', 'what', 'when', 'where', 'which', 'who', 'why', 'how'
]);

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase());
}

function normalizeSearchTerm(term: string): string {
  if (!term || typeof term !== 'string') {
    return '';
  }
  return term.toLowerCase().trim();
}

function calculateRelevanceScore(item: any, query: string): number {
  if (!item || !query) {
    return 0;
  }
  
  const normalizedQuery = normalizeSearchTerm(query);
  
  if (!normalizedQuery) {
    return 0;
  }
  
  let score = 0;
  
  // Score based on term (name) matches
  if (item.term) {
    const normalizedTerm = normalizeSearchTerm(item.term);
    
    if (normalizedTerm) {
      // Exact match gets highest score
      if (normalizedTerm === normalizedQuery) {
        score += 100;
      }
      
      // Starts with query gets high score
      if (normalizedTerm.startsWith(normalizedQuery)) {
        score += 50;
      }
      
      // Contains query gets medium score
      if (normalizedTerm.includes(normalizedQuery)) {
        score += 25;
      }
      
      // Word boundary matches get bonus
      const queryWords = normalizedQuery.split(/\s+/);
      const termWords = normalizedTerm.split(/\s+/);
      
      queryWords.forEach(queryWord => {
        termWords.forEach(termWord => {
          if (termWord === queryWord) {
            score += 10;
          } else if (termWord.startsWith(queryWord)) {
            score += 5;
          }
        });
      });
    }
  }
  
  // Score based on ID (code) matches
  if (item.source_id) {
    const normalizedId = item.source_id.toLowerCase();
    const normalizedQueryRaw = query.toLowerCase().trim();
    
    // Exact ID match gets very high score
    if (normalizedId === normalizedQueryRaw) {
      score += 150;
    }
    
    // Starts with ID gets high score
    if (normalizedId.startsWith(normalizedQueryRaw)) {
      score += 75;
    }
  }
  
  return score;
}

// Helper to get match info for a result with fuzzy matching
function getMatchInfo(item: any, query: string) {
  const q = query.toLowerCase();
  let bestMatch: { field: string; snippet: string; fuzzyResult?: FuzzyMatchResult } | null = null;
  let bestScore = 0;

  // Check different fields for matches
  const fieldsToCheck = [
    { field: 'name', value: item.term },
    { field: 'id', value: item.source_id },
    { field: 'description', value: item.additional_data?.context }
  ];

  for (const { field, value } of fieldsToCheck) {
    if (!value || typeof value !== 'string') continue;

    // First check for exact substring matches (existing logic)
    if (value.toLowerCase().includes(q)) {
      if (field === 'description') {
        const idx = value.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(value.length, idx + 30 + q.length);
        const snippet = value.substring(start, end);
        return { 
          matchField: field, 
          matchSnippet: snippet,
          fuzzyScore: 1.0,
          fuzzyResult: formatMatchResult({
            score: 1.0,
            confidence: 'high',
            algorithm: 'exact',
            matchType: 'exact'
          })
        };
      } else {
        return { 
          matchField: field, 
          matchSnippet: value,
          fuzzyScore: 1.0,
          fuzzyResult: formatMatchResult({
            score: 1.0,
            confidence: 'high',
            algorithm: 'exact',
            matchType: 'exact'
          })
        };
      }
    }

    // Then check for fuzzy matches
    const fuzzyResult = fuzzyMatch(query, value, { threshold: 0.5 });
    if (fuzzyResult.score > bestScore) {
      bestScore = fuzzyResult.score;
      bestMatch = {
        field,
        snippet: value,
        fuzzyResult
      };
    }
  }

  if (bestMatch && bestMatch.fuzzyResult) {
    return {
      matchField: bestMatch.field,
      matchSnippet: bestMatch.snippet,
      fuzzyScore: bestMatch.fuzzyResult.score,
      fuzzyResult: formatMatchResult(bestMatch.fuzzyResult)
    };
  }

  return { matchField: null, matchSnippet: null, fuzzyScore: 0, fuzzyResult: null };
}

// --- Helper to fetch years for a batch of entities ---
async function fetchBatchYears(type, ids, terms) {
  if (!ids.length) return {};
  let url = '';
  if (type === 'vendor') url = `/api/spend?vendor=${encodeURIComponent(terms.join(','))}&limit=1`;
  else if (type === 'program') url = `/api/spend?program=${encodeURIComponent(ids.join(','))}&limit=1`;
  else if (type === 'fund') url = `/api/spend?fund=${encodeURIComponent(ids.join(','))}&limit=1`;
  if (!url) return {};
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(base + url);
    if (!res.ok) return {};
    const data = await res.json();
    // Assume batch result is keyed by id or term
    return data.batch || {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const types = searchParams.get('types')?.split(',') || ['department', 'vendor', 'program', 'fund'];
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const excludeCommon = searchParams.get('exclude_common') === 'true';
    
    // If no query provided, return all entries for requested types from search_index
    if (!query.trim()) {
      const supabase = getServiceSupabase();
      const results: Record<string, any[]> = {
        departments: [],
        vendors: [],
        programs: [],
        funds: []
      };
      for (const type of types) {
        // Map plural to singular for search_index type
        const dbType = type.replace(/s$/, '');
        if (["department", "vendor", "program", "fund"].includes(dbType)) {
          const { data } = await supabase
            .from('search_index')
            .select('*')
            .eq('type', dbType)
            .limit(limit);
          if (data) results[type] = data;
        }
      }
      return NextResponse.json({
        ...results,
        totalResults: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
        query: '',
        appliedFilters: {
          types,
          excludeCommon,
          limit
        },
        details: {
          departments: {},
          vendors: {},
          programs: {},
          funds: {}
        }
      });
    }
    
    // Check if query is a common word and should be excluded
    const queryWords = query.toLowerCase().split(/\s+/);
    if (excludeCommon && queryWords.length === 1 && isCommonWord(queryWords[0])) {
      return NextResponse.json({
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        totalResults: 0,
        query,
        appliedFilters: {
          types,
          excludeCommon,
          limit
        },
        details: {
          departments: {},
          vendors: {},
          programs: {},
          funds: {}
        },
        message: 'Query contains only common words that are excluded from search'
      });
    }
    
    // Normalize search terms
    const searchTerms = query.split(/\s+/).filter(term => 
      term.length > 0 && (!excludeCommon || !COMMON_WORDS.has(term))
    );

    if (searchTerms.length === 0) {
      return NextResponse.json({
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        totalResults: 0,
        query,
        appliedFilters: {
          types,
          excludeCommon,
          limit
        },
        details: {
          departments: {},
          vendors: {},
          programs: {},
          funds: {}
        }
      });
    }

    // Validate types and map to database types
    const validTypes = ['department', 'vendor', 'program', 'fund'];
    const filteredTypes = types.filter(type => validTypes.includes(type));
    
    console.log('Search API request:', { query, types: filteredTypes, limit, excludeCommon });
    
    // Use Supabase full-text search
    // For each type, run a separate search with its own limit
    const perTypeResults: Record<string, any[]> = {};
    for (const type of filteredTypes) {
      perTypeResults[type] = await searchAccess.search(query, {
        types: [type],
        limit
      });
    }

    // Transform results to match expected structure
    const transformedResults = {
      departments: [] as SearchItem[],
      vendors: [] as SearchItem[],
      programs: [] as SearchItem[],
      funds: [] as SearchItem[]
    };

    // Process and score results per type
    for (const type of filteredTypes) {
      const items = perTypeResults[type] || [];
      items.forEach(item => {
        const searchItem = {
          term: item.term,
          type: item.type,
          id: item.source_id,
          ...(item.additional_data as any)
        };
        const { matchField, matchSnippet, fuzzyScore, fuzzyResult } = getMatchInfo(item, query);
        const scoredItem = {
          ...searchItem,
          score: calculateRelevanceScore(item, query),
          matchField,
          matchSnippet,
          fuzzyScore,
          fuzzyResult
        };
        switch (item.type) {
          case 'department':
            transformedResults.departments.push(scoredItem as SearchItem);
            break;
          case 'vendor':
            transformedResults.vendors.push(scoredItem as SearchItem);
            break;
          case 'program':
            transformedResults.programs.push(scoredItem as SearchItem);
            break;
          case 'fund':
            transformedResults.funds.push(scoredItem as SearchItem);
            break;
        }
      });
    }

    // --- Batch fetch years for vendors, programs, and funds ---
    // Vendors: use term as key, programs/funds: use id
    const vendorTerms = transformedResults.vendors.map(item => item.term);
    const programIds = transformedResults.programs.map(item => item.id);
    const fundIds = transformedResults.funds.map(item => item.id);
    const [vendorBatch, programBatch, fundBatch] = await Promise.all([
      fetchBatchYears('vendor', [], vendorTerms),
      fetchBatchYears('program', programIds, []),
      fetchBatchYears('fund', fundIds, [])
    ]);
    transformedResults.vendors.forEach(item => {
      const batchData = vendorBatch[item.term];
      if (batchData && Array.isArray(batchData.years)) item.years = batchData.years;
    });
    transformedResults.programs.forEach(item => {
      const batchData = programBatch[item.id];
      if (batchData && Array.isArray(batchData.years)) item.years = batchData.years;
    });
    transformedResults.funds.forEach(item => {
      const batchData = fundBatch[item.id];
      if (batchData && Array.isArray(batchData.years)) item.years = batchData.years;
    });
    // --- End batch years injection ---

    // Sort by score and limit results per type
    const sortedResults = {
      departments: transformedResults.departments
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...item }: any) => item),
      vendors: transformedResults.vendors
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...item }: any) => item),
      programs: transformedResults.programs
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...item }: any) => item),
      funds: transformedResults.funds
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...item }: any) => item)
    };

    // Get details for each result (using the additional_data from search_index)
    const details = {
      departments: {} as Record<string, any>,
      vendors: {} as Record<string, any>,
      programs: {} as Record<string, any>,
      funds: {} as Record<string, any>
    };

    // Add details from search results
    if (perTypeResults && Object.values(perTypeResults).length > 0) {
      for (const type of filteredTypes) {
        const items = perTypeResults[type] || [];
        items.forEach(item => {
          if (item.additional_data) {
            switch (item.type) {
              case 'department':
                details.departments[item.source_id] = item.additional_data;
                break;
              case 'vendor':
                details.vendors[item.source_id] = item.additional_data;
                break;
              case 'program':
                details.programs[item.source_id] = item.additional_data;
                break;
              case 'fund':
                details.funds[item.source_id] = item.additional_data;
                break;
            }
          }
        });
      }
    }

    const totalResults = Object.values(sortedResults).reduce((sum, arr) => sum + arr.length, 0);
    
    const response: SearchResponse = {
      ...sortedResults,
      totalResults,
      query,
      appliedFilters: {
        types,
        excludeCommon,
        limit
      },
      details
    };
    
    console.log('Search API response:', {
      query,
      totalResults,
      departmentCount: sortedResults.departments.length,
      vendorCount: sortedResults.vendors.length,
      programCount: sortedResults.programs.length,
      fundCount: sortedResults.funds.length
    });
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=604800'
      }
    });
    
  } catch (error) {
    console.error('Error in Search API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform search.',
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        totalResults: 0,
        query: '',
        appliedFilters: {
          types: [],
          excludeCommon: true,
          limit: 10
        },
        details: {
          departments: {},
          vendors: {},
          programs: {},
          funds: {}
        }
      },
      { status: 500 }
    );
  }
} 