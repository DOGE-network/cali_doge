import { NextResponse, NextRequest } from 'next/server';
const { getSearchData } = require('@/lib/api/dataAccess');
import type { SearchJSON, SearchItem, KeywordItem } from '@/types/search';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

interface SearchResponse {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds: SearchItem[];
  keywords: KeywordItem[];
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

function searchInText(text: string, query: string): boolean {
  if (!text || !query || typeof text !== 'string' || typeof query !== 'string') {
    return false;
  }
  
  const normalizedText = normalizeSearchTerm(text);
  const normalizedQuery = normalizeSearchTerm(query);
  
  if (!normalizedText || !normalizedQuery) {
    return false;
  }
  
  // Direct substring match
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }
  
  // Word-based matching
  const textWords = normalizedText.split(/\s+/);
  const queryWords = normalizedQuery.split(/\s+/);
  
  // Check if all query words are found in text
  return queryWords.every(queryWord => 
    textWords.some(textWord => textWord.includes(queryWord))
  );
}

function searchInItem(item: SearchItem, query: string): boolean {
  if (!item || !query) {
    return false;
  }
  
  // Search in the term (name)
  if (item.term && searchInText(item.term, query)) {
    return true;
  }
  
  // Search in the id (code) - exact match or starts with for codes
  if (item.id && typeof item.id === 'string') {
    const normalizedId = item.id.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();
    
    // Exact match for codes
    if (normalizedId === normalizedQuery) {
      return true;
    }
    
    // Starts with for partial code matches
    if (normalizedId.startsWith(normalizedQuery)) {
      return true;
    }
  }
  
  return false;
}

function calculateRelevanceScore(item: SearchItem | KeywordItem, query: string): number {
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
  
  // Score based on ID (code) matches - for SearchItem only
  if (item.type !== 'keyword' && (item as SearchItem).id) {
    const searchItem = item as SearchItem;
    const normalizedId = searchItem.id.toLowerCase();
    const normalizedQueryRaw = query.toLowerCase().trim();
    
    // Exact ID match gets very high score (higher than name matches for precision)
    if (normalizedId === normalizedQueryRaw) {
      score += 150;
    }
    
    // Starts with ID gets high score
    if (normalizedId.startsWith(normalizedQueryRaw)) {
      score += 75;
    }
  }
  
  // For keywords, add context relevance
  if (item.type === 'keyword') {
    const keywordItem = item as KeywordItem;
    if (keywordItem.sources && Array.isArray(keywordItem.sources)) {
      keywordItem.sources.forEach(source => {
        if (source && source.context && searchInText(source.context, query)) {
          score += 15;
        }
      });
    }
  }
  
  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const types = searchParams.get('types')?.split(',') || ['departments', 'vendors', 'programs', 'funds'];
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const excludeCommon = searchParams.get('exclude_common') === 'true';

    // Get search data
    const searchData = await getSearchData();
    if (!searchData) {
      return NextResponse.json({
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        keywords: [],
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
        keywords: [],
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

    // Validate types
    const validTypes = ['department', 'vendor', 'program', 'fund', 'keyword'];
    const filteredTypes = types.filter(type => validTypes.includes(type));
    
    console.log('Search API request:', { query, types: filteredTypes, limit, excludeCommon });
    
    // If no query provided, return empty results
    if (!query.trim()) {
      return NextResponse.json({
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        keywords: [],
        totalResults: 0,
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
        keywords: [],
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
    
    // Load search data - this will throw if search.json is not found
    const typedSearchData = await getSearchData() as SearchJSON;
    if (!typedSearchData || !typedSearchData.departments || !typedSearchData.vendors || 
        !typedSearchData.programs || !typedSearchData.funds || !typedSearchData.keywords) {
      throw new Error('Search index not found or invalid. Please run the generate_search_index script.');
    }
    
    let results: {
      departments: SearchItem[];
      vendors: SearchItem[];
      programs: SearchItem[];
      funds: SearchItem[];
      keywords: KeywordItem[];
    } = {
      departments: [],
      vendors: [],
      programs: [],
      funds: [],
      keywords: []
    };
    
    // Search in each category if requested
    if (filteredTypes.includes('department')) {
      results.departments = typedSearchData.departments
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (filteredTypes.includes('vendor')) {
      results.vendors = typedSearchData.vendors
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (filteredTypes.includes('program')) {
      results.programs = typedSearchData.programs
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (filteredTypes.includes('fund')) {
      results.funds = typedSearchData.funds
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (filteredTypes.includes('keyword')) {
      results.keywords = typedSearchData.keywords
        .filter(item => item && item.term && typeof item.term === 'string')
        .filter(item => {
          // Search in keyword term
          if (searchInText(item.term, query)) return true;
          
          // Search in keyword sources context
          return item.sources && item.sources.some(source => 
            source && source.context && searchInText(source.context, query)
          );
        })
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    // Remove score property from results (used only for sorting)
    const cleanResults = {
      departments: results.departments.map(({ score: _score, ...item }: any) => item),
      vendors: results.vendors.map(({ score: _score, ...item }: any) => item),
      programs: results.programs.map(({ score: _score, ...item }: any) => item),
      funds: results.funds.map(({ score: _score, ...item }: any) => item),
      keywords: results.keywords.map(({ score: _score, ...item }: any) => item)
    };
    
    // Get details for each result
    const details = {
      departments: {},
      vendors: {},
      programs: {},
      funds: {}
    };
    
    // Add details from search.json for each result
    cleanResults.departments.forEach(dept => {
      if (dept.id && typedSearchData.departments) {
        const detail = typedSearchData.departments.find(d => d.id === dept.id);
        if (detail) {
          details.departments[dept.id] = detail;
        }
      }
    });
    
    cleanResults.vendors.forEach(vendor => {
      if (vendor.id && typedSearchData.vendors) {
        const detail = typedSearchData.vendors.find(v => v.id === vendor.id);
        if (detail) {
          details.vendors[vendor.id] = detail;
        }
      }
    });
    
    cleanResults.programs.forEach(program => {
      if (program.id && typedSearchData.programs) {
        const detail = typedSearchData.programs.find(p => p.id === program.id);
        if (detail) {
          details.programs[program.id] = detail;
        }
      }
    });
    
    cleanResults.funds.forEach(fund => {
      if (fund.id && typedSearchData.funds) {
        const detail = typedSearchData.funds.find(f => f.id === fund.id);
        if (detail) {
          details.funds[fund.id] = detail;
        }
      }
    });
    
    const totalResults = Object.values(cleanResults).reduce((sum, arr) => sum + arr.length, 0);
    
    const response: SearchResponse = {
      ...cleanResults,
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
      departmentCount: cleanResults.departments.length,
      vendorCount: cleanResults.vendors.length,
      programCount: cleanResults.programs.length,
      fundCount: cleanResults.funds.length,
      keywordCount: cleanResults.keywords.length
    });
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
    
  } catch (error) {
    console.error('Error in Search API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform search. Search index not found or invalid.',
        departments: [],
        vendors: [],
        programs: [],
        funds: [],
        keywords: [],
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