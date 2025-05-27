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
}

// Common words to exclude from search
const COMMON_WORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'among', 'under', 'over', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'like', 'such', 'than',
  'so', 'very', 'just', 'now', 'then', 'here', 'there', 'where', 'when', 'why',
  'how', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
  'a', 'an', 'as', 'if', 'each', 'all', 'any', 'both', 'either', 'neither',
  'some', 'many', 'much', 'more', 'most', 'few', 'little', 'less', 'least'
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
    // Use NextRequest.nextUrl.searchParams instead of new URL(request.url)
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const query = searchParams.get('q') || '';
    const typesParam = searchParams.get('types');
    const limitParam = searchParams.get('limit');
    const excludeCommonParam = searchParams.get('exclude_common');
    
    // Validate and set defaults
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;
    const excludeCommon = excludeCommonParam !== 'false'; // Default to true
    const requestedTypes = typesParam ? typesParam.split(',') : ['department', 'vendor', 'program', 'fund', 'keyword'];
    
    // Validate types
    const validTypes = ['department', 'vendor', 'program', 'fund', 'keyword'];
    const types = requestedTypes.filter(type => validTypes.includes(type));
    
    console.log('Search API request:', { query, types, limit, excludeCommon });
    
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
        message: 'Query contains only common words that are excluded from search'
      });
    }
    
    // Load search data
    const typedSearchData = await getSearchData() as SearchJSON;
    
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
    if (types.includes('department') && typedSearchData.departments) {
      results.departments = typedSearchData.departments
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (types.includes('vendor') && typedSearchData.vendors) {
      results.vendors = typedSearchData.vendors
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (types.includes('program') && typedSearchData.programs) {
      results.programs = typedSearchData.programs
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (types.includes('fund') && typedSearchData.funds) {
      results.funds = typedSearchData.funds
        .filter(item => item && (item.term || item.id))
        .filter(item => searchInItem(item, query))
        .map(item => ({ ...item, score: calculateRelevanceScore(item, query) }))
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, limit);
    }
    
    if (types.includes('keyword') && typedSearchData.keywords) {
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
    
    const totalResults = Object.values(cleanResults).reduce((sum, arr) => sum + arr.length, 0);
    
    const response: SearchResponse = {
      ...cleanResults,
      totalResults,
      query,
      appliedFilters: {
        types,
        excludeCommon,
        limit
      }
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
        error: 'Failed to perform search',
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
        }
      },
      { status: 500 }
    );
  }
} 