'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { trackEvent as gaTrackEvent } from '@/components/GoogleAnalytics';
import type { SearchItem, KeywordItem } from '@/types/search';
import { SearchTypeFilter } from './SearchTypeFilter';

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
  message?: string;
}

interface EnhancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedSearch({ isOpen, onClose }: EnhancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['department', 'vendor', 'program', 'fund']);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();

  // Reset auto-close timer
  const resetAutoCloseTimer = useCallback(() => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }
    if (isOpen || isHovering) {
      autoCloseTimeoutRef.current = setTimeout(() => {
        onClose();
        setIsHovering(false);
      }, 15000); // 15 seconds for enhanced search
    }
  }, [isOpen, isHovering, onClose]);

  // Debounced search function
  const performSearch = useCallback(async (query: string, types: string[]) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('types', types.join(','));
      params.set('limit', '8'); // Show 8 results per type
      params.set('exclude_common', 'true');

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      
      setSearchResults(data);
      setIsLoading(false);
      
      // Track search analytics
      if (data) {
        const totalResults = (data.departments?.length || 0) + 
                           (data.vendors?.length || 0) + 
                           (data.programs?.length || 0) + 
                           (data.funds?.length || 0) + 
                           (data.keywords?.length || 0);
        analytics.search(query.trim(), totalResults, 'enhanced_search');
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setIsLoading(false);
      setSearchResults(null);
      
      // Track search errors
      analytics.error('search_error', error instanceof Error ? error.message : 'Unknown search error');
    }
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchTerm, selectedTypes);
      }, 300); // 300ms debounce
    } else {
      setSearchResults(null);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedTypes, performSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      resetAutoCloseTimer();
    }
  }, [isOpen, resetAutoCloseTimer]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle mouse enter/leave with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }
    setIsHovering(true);
    resetAutoCloseTimer();
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
      if (!isOpen) {
        setSearchTerm('');
        setSearchResults(null);
      }
    }, 300);
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Reset auto-close timer on user interaction
  const handleUserInteraction = () => {
    resetAutoCloseTimer();
  };

  // Handle type filter toggle
  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      
      // Track filter usage
      analytics.filterApplied('search_type', type, 'enhanced_search');
      
      return newTypes;
    });
  };

  // Handle result click
  const handleResultClick = (item: SearchItem | KeywordItem) => {
    // Track the click based on item type
    if (item.type === 'keyword') {
      // This is a KeywordItem
      gaTrackEvent('keyword_click', { keyword: item.term, sources_count: item.sources.length });
    } else {
      // This is a SearchItem
      switch (item.type) {
        case 'department':
          analytics.departmentView(item.term, item.id);
          break;
        case 'vendor':
          analytics.vendorView(item.term);
          break;
        case 'program':
          analytics.programView(item.id, item.term);
          break;
        case 'fund':
          gaTrackEvent('fund_view', { fund_name: item.term, fund_id: item.id });
          break;
      }
    }

    // Navigate to search results page
    const params = new URLSearchParams();
    params.set('q', item.term);
    params.set('view', 'details');
    if (item.type !== 'keyword') {
      params.set('id', item.id);
    }
    router.push(`/search?${params.toString()}`);
    onClose();
  };

  if (!isOpen && !isHovering) return null;

  const hasResults = searchResults && searchResults.totalResults > 0;
  const showMessage = searchResults?.message;

  return (
    <div 
      ref={searchRef}
      className="absolute right-0 top-12 w-[500px] bg-white rounded-lg shadow-lg border border-gray-300 z-50 transition-all duration-200 ease-in-out"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleUserInteraction}
      onClick={handleUserInteraction}
      onKeyDown={handleUserInteraction}
    >
      <div className="p-4">
        {/* Search Input */}
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search departments, vendors, programs, funds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          
          {/* Type Filter Button */}
          <button
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 hover:text-gray-600"
            title="Filter search types"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Type Filter */}
        {showTypeFilter && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Search in:</div>
            <SearchTypeFilter
              selectedTypes={selectedTypes}
              onToggleType={toggleType}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* No Query State */}
        {!searchTerm.trim() && !isLoading && (
          <div className="text-center py-6 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">Search across departments, vendors, programs, and funds</p>
            <p className="text-xs text-gray-400 mt-1">Start typing to see suggestions</p>
          </div>
        )}

        {/* Message State (e.g., common words filtered) */}
        {showMessage && (
          <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg">
            <p className="text-sm">{searchResults?.message}</p>
          </div>
        )}

        {/* Search Results */}
        {hasResults && !isLoading && (
          <div className="max-h-96 overflow-y-auto space-y-4">
            {/* Departments */}
            {searchResults.departments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Departments ({searchResults.departments.length})
                </h3>
                <div className="space-y-1">
                  {searchResults.departments.map((dept, index) => (
                    <button
                      key={`dept-${index}`}
                      onClick={() => handleResultClick(dept)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">{dept.term}</div>
                      <div className="text-xs text-gray-500">Department • ID: {dept.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vendors */}
            {searchResults.vendors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Vendors ({searchResults.vendors.length})
                </h3>
                <div className="space-y-1">
                  {searchResults.vendors.map((vendor, index) => (
                    <button
                      key={`vendor-${index}`}
                      onClick={() => handleResultClick(vendor)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">{vendor.term}</div>
                      <div className="text-xs text-gray-500">Vendor • ID: {vendor.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Programs */}
            {searchResults.programs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Programs ({searchResults.programs.length})
                </h3>
                <div className="space-y-1">
                  {searchResults.programs.map((program, index) => (
                    <button
                      key={`program-${index}`}
                      onClick={() => handleResultClick(program)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">{program.term}</div>
                      <div className="text-xs text-gray-500">Program • Code: {program.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Funds */}
            {searchResults.funds.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Funds ({searchResults.funds.length})
                </h3>
                <div className="space-y-1">
                  {searchResults.funds.map((fund, index) => (
                    <button
                      key={`fund-${index}`}
                      onClick={() => handleResultClick(fund)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">{fund.term}</div>
                      <div className="text-xs text-gray-500">Fund • Code: {fund.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {searchResults.keywords.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Keywords ({searchResults.keywords.length})
                </h3>
                <div className="space-y-1">
                  {searchResults.keywords.map((keyword, index) => (
                    <button
                      key={`keyword-${index}`}
                      onClick={() => handleResultClick(keyword)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">{keyword.term}</div>
                      <div className="text-xs text-gray-500">
                        Found in {keyword.sources.length} context{keyword.sources.length !== 1 ? 's' : ''}
                      </div>
                      {keyword.sources.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          &quot;{keyword.sources[0].context}&quot;
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {searchTerm.trim() && !isLoading && !hasResults && !showMessage && (
          <div className="text-center py-6 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
            <p className="text-sm">No results found for &quot;{searchTerm}&quot;</p>
            <p className="text-xs text-gray-400 mt-1">Try different keywords or check your spelling</p>
          </div>
        )}

        {/* Footer */}
        {searchTerm.trim() && (
          <div className="mt-4 pt-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              {searchResults?.totalResults || 0} result{(searchResults?.totalResults || 0) !== 1 ? 's' : ''} found
              {searchResults?.appliedFilters.excludeCommon && (
                <span className="ml-1">(common words excluded)</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 