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
 * Represents the structure of search.json
 */
export interface SearchJSON {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds?: SearchItem[];
  lastUpdated?: string;
}

/**
 * Options for search operations
 */
export interface SearchOptions {
  types?: ('department' | 'vendor' | 'program' | 'fund')[];
  limit?: number;
  includeFunds?: boolean;
  includePrograms?: boolean;
}

/**
 * Search response structure
 */
export interface SearchResponse {
  departments: SearchItem[];
  vendors: SearchItem[];
  programs: SearchItem[];
  funds?: SearchItem[];
  lastUpdated?: string;
} 