/**
 * Type definitions for search functionality
 */

/**
 * Represents a basic search item
 */
export interface SearchItem {
  term: string;
  type: 'department' | 'vendor' | 'program' | 'fund';
  id: string;
  // Enhanced fields for financial and temporal information
  totalAmount?: number;
  transactionCount?: number;
  years?: number[];
  lastUpdated?: string;
}

/**
 * Represents a source for a keyword search result
 */
export interface KeywordSource {
  type: 'department' | 'program';
  id: string;
  context: string; // Short phrase containing the keyword for context
}

/**
 * Represents a keyword search item
 */
export interface KeywordItem {
  term: string;
  type: 'keyword';
  sources: KeywordSource[];
}

/**
 * Represents the structure of search.json
 */
export interface SearchJSON {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds?: SearchItem[];
  keywords: KeywordItem[];
  lastUpdated?: string;
}

/**
 * Search query options
 */
export interface SearchOptions {
  types?: ('department' | 'vendor' | 'program' | 'fund' | 'keyword')[];
  limit?: number;
  includeFunds?: boolean;
  includePrograms?: boolean;
  includeKeywords?: boolean;
}

/**
 * Search response structure
 */
export interface SearchResponse {
  departments?: SearchItem[];
  vendors?: SearchItem[];
  programs?: SearchItem[];
  funds?: SearchItem[];
  keywords?: KeywordItem[];
} 