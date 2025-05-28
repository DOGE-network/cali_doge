'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { analytics } from '@/lib/analytics';
import useSWR from 'swr';
import type { SearchItem, KeywordItem } from '@/types/search';
import { 
  DepartmentDetailCard, 
  VendorDetailCard, 
  ProgramDetailCard, 
  FundDetailCard, 
  KeywordDetailCard 
} from '@/components/SearchDetailCards';

const fetcher = (url: string) => fetch(url).then(res => res.json());

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

// Client component that uses useSearchParams
function SearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for search and filters
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['department', 'vendor', 'program', 'fund', 'keyword']);
  const [excludeCommon, setExcludeCommon] = useState(true);
  const [limit, setLimit] = useState(20);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track page view
  useEffect(() => {
    analytics.pageView('/search', 'Search California Government Data');
  }, []);

  // Build API URL based on current filters
  const buildApiUrl = () => {
    if (!query.trim()) return null;
    
    const params = new URLSearchParams();
    params.set('q', query.trim());
    params.set('types', selectedTypes.join(','));
    params.set('limit', limit.toString());
    params.set('exclude_common', excludeCommon.toString());
    
    return `/api/search?${params.toString()}`;
  };

  // Fetch search results
  const { data: searchData, error, isLoading } = useSWR<SearchResponse>(
    buildApiUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000
    }
  );

  // Initialize from URL params
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const typesParam = searchParams.get('types');
    const excludeParam = searchParams.get('exclude_common');
    const limitParam = searchParams.get('limit');
    const viewParam = searchParams.get('view');
    const idParam = searchParams.get('id');
    
    if (queryParam) {
      setQuery(queryParam);
    }
    if (typesParam) {
      const types = typesParam.split(',').filter(type => 
        ['department', 'vendor', 'program', 'fund', 'keyword'].includes(type)
      );
      if (types.length > 0) {
        setSelectedTypes(types);
      }
    }
    if (excludeParam === 'false') {
      setExcludeCommon(false);
    }
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (parsedLimit >= 5 && parsedLimit <= 100) {
        setLimit(parsedLimit);
      }
    }
    if (viewParam === 'details') {
      setViewMode('details');
    }
    if (idParam) {
      setSelectedId(idParam);
    }
  }, [searchParams]);

  // Update URL when filters change
  const updateUrl = (newParams: Record<string, string>) => {
    const params = new URLSearchParams();
    
    // Always include query if it exists
    if (query.trim()) {
      params.set('q', query.trim());
    }
    
    // Add other parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    
    // Set defaults for missing params
    if (!params.has('types') && selectedTypes.length > 0) {
      params.set('types', selectedTypes.join(','));
    }
    if (!params.has('exclude_common')) {
      params.set('exclude_common', excludeCommon.toString());
    }
    if (!params.has('limit')) {
      params.set('limit', limit.toString());
    }
    
    router.push(`/search?${params.toString()}`);
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Track search submission
      analytics.search(query.trim(), 0, 'search_page_form');
      
      updateUrl({
        q: query.trim(),
        types: selectedTypes.join(','),
        exclude_common: excludeCommon.toString(),
        limit: limit.toString()
      });
    }
  };

  // Handle type filter toggle
  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    // Track filter usage
    analytics.filterApplied('search_type', type, 'search_page');
    
    setSelectedTypes(newTypes);
    if (query.trim()) {
      updateUrl({
        types: newTypes.join(','),
        exclude_common: excludeCommon.toString(),
        limit: limit.toString()
      });
    }
  };

  // Handle exclude common toggle
  const handleExcludeCommonChange = (value: string) => {
    const newExcludeCommon = value === 'true';
    
    // Track filter usage
    analytics.filterApplied('exclude_common', value, 'search_page');
    
    setExcludeCommon(newExcludeCommon);
    if (query.trim()) {
      updateUrl({
        types: selectedTypes.join(','),
        exclude_common: newExcludeCommon.toString(),
        limit: limit.toString()
      });
    }
  };

  // Handle limit change
  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value, 10);
    
    // Track filter usage
    analytics.filterApplied('results_limit', value, 'search_page');
    
    setLimit(newLimit);
    if (query.trim()) {
      updateUrl({
        types: selectedTypes.join(','),
        exclude_common: excludeCommon.toString(),
        limit: newLimit.toString()
      });
    }
  };

  // Handle result click navigation
  const getResultLink = (item: SearchItem | KeywordItem) => {
    switch (item.type) {
      case 'department':
        // Try to navigate to department page first
        const departmentSlug = item.id.toString().toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `/departments/${departmentSlug}`;
      case 'vendor':
        return `/search?q=${encodeURIComponent(item.term)}&types=vendor&view=details&id=${encodeURIComponent(item.id)}`;
      case 'program':
        return `/search?q=${encodeURIComponent(item.id)}&types=program&view=details&id=${encodeURIComponent(item.id)}`;
      case 'fund':
        return `/search?q=${encodeURIComponent(item.id)}&types=fund&view=details&id=${encodeURIComponent(item.id)}`;
      case 'keyword':
        return `/search?q=${encodeURIComponent(item.term)}&view=details`;
      default:
        return '#';
    }
  };

  const hasResults = searchData && searchData.totalResults > 0;
  const showMessage = searchData?.message;

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search California Government Data</h1>
        <p className="text-gray-600">
          Search across departments, vendors, programs, funds, and keywords
        </p>
        
        {/* Breadcrumb Navigation */}
        {viewMode === 'details' && query && (
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Link href="/search" className="hover:text-blue-600">Search Results</Link>
            <span className="mx-2">›</span>
            <span className="font-medium">&quot;{query}&quot; Details</span>
            {selectedId && (
              <>
                <span className="mx-2">›</span>
                <span className="text-gray-400">ID: {selectedId}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search departments, vendors, programs, funds..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg p-4"
            />
          </div>
          <Button type="submit" size="lg" disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search in:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'department', label: 'Departments', color: 'blue' },
                { key: 'vendor', label: 'Vendors', color: 'green' },
                { key: 'program', label: 'Programs', color: 'purple' },
                { key: 'fund', label: 'Funds', color: 'orange' },
                { key: 'keyword', label: 'Keywords', color: 'red' }
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleType(key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTypes.includes(key)
                      ? `bg-${color}-500 text-white border-${color}-500`
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Common Words Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Common words:
            </label>
            <Select value={excludeCommon.toString()} onValueChange={handleExcludeCommonChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Exclude (recommended)</SelectItem>
                <SelectItem value="false">Include</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Results per type:
            </label>
            <Select value={limit.toString()} onValueChange={handleLimitChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" className="mb-4" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg mb-8">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>Failed to perform search. Please try again.</p>
        </div>
      )}

      {/* No Query State */}
      {!query.trim() && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Start your search</h2>
          <p>Enter keywords to search across California government data</p>
        </div>
      )}

      {/* Message State (e.g., common words filtered) */}
      {showMessage && (
        <div className="text-center py-6 text-amber-600 bg-amber-50 rounded-lg mb-8">
          <p>{searchData?.message}</p>
        </div>
      )}

      {/* Search Results */}
      {hasResults && !isLoading && (
        <div className="space-y-8">
          {/* Results Summary and View Toggle */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Found {searchData.totalResults} result{searchData.totalResults !== 1 ? 's' : ''} for &quot;{searchData.query}&quot;
              {searchData.appliedFilters.excludeCommon && (
                <span className="ml-1">(common words excluded)</span>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('details')}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewMode === 'details'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Details
                </button>
              </div>
            </div>
          </div>

          {/* Departments */}
          {searchData.departments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                Departments ({searchData.departments.length})
              </h2>
              <div className="grid gap-4">
                {searchData.departments.map((dept, index) => (
                  viewMode === 'details' ? (
                    <DepartmentDetailCard
                      key={`dept-${index}`}
                      item={dept}
                      isSelected={selectedId === dept.id}
                    />
                  ) : (
                    <Link
                      key={`dept-${index}`}
                      href={getResultLink(dept)}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{dept.term}</h3>
                      <p className="text-sm text-gray-600">Department • ID: {dept.id}</p>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Vendors */}
          {searchData.vendors.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                Vendors ({searchData.vendors.length})
              </h2>
              <div className="grid gap-4">
                {searchData.vendors.map((vendor, index) => (
                  viewMode === 'details' ? (
                    <VendorDetailCard
                      key={`vendor-${index}`}
                      item={vendor}
                      isSelected={selectedId === vendor.id}
                    />
                  ) : (
                    <Link
                      key={`vendor-${index}`}
                      href={getResultLink(vendor)}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{vendor.term}</h3>
                      <p className="text-sm text-gray-600">Vendor • ID: {vendor.id}</p>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Programs */}
          {searchData.programs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                Programs ({searchData.programs.length})
              </h2>
              <div className="grid gap-4">
                {searchData.programs.map((program, index) => (
                  viewMode === 'details' ? (
                    <ProgramDetailCard
                      key={`program-${index}`}
                      item={program}
                      isSelected={selectedId === program.id}
                    />
                  ) : (
                    <Link
                      key={`program-${index}`}
                      href={getResultLink(program)}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{program.term}</h3>
                      <p className="text-sm text-gray-600">Program • Code: {program.id}</p>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Funds */}
          {searchData.funds.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
                Funds ({searchData.funds.length})
              </h2>
              <div className="grid gap-4">
                {searchData.funds.map((fund, index) => (
                  viewMode === 'details' ? (
                    <FundDetailCard
                      key={`fund-${index}`}
                      item={fund}
                      isSelected={selectedId === fund.id}
                    />
                  ) : (
                    <Link
                      key={`fund-${index}`}
                      href={getResultLink(fund)}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{fund.term}</h3>
                      <p className="text-sm text-gray-600">Fund • Code: {fund.id}</p>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {searchData.keywords.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
                Keywords ({searchData.keywords.length})
              </h2>
              <div className="grid gap-4">
                {searchData.keywords.map((keyword, index) => (
                  viewMode === 'details' ? (
                    <KeywordDetailCard
                      key={`keyword-${index}`}
                      item={keyword}
                      isSelected={true} // Keywords always show details in detail view
                    />
                  ) : (
                    <Link
                      key={`keyword-${index}`}
                      href={getResultLink(keyword)}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">{keyword.term}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Found in {keyword.sources.length} context{keyword.sources.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1">
                        {keyword.sources.slice(0, 3).map((source, sourceIndex) => (
                          <div key={sourceIndex} className="text-xs text-gray-500">
                            <span className="font-medium capitalize">{source.type}:</span> &quot;{source.context}&quot;
                          </div>
                        ))}
                        {keyword.sources.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{keyword.sources.length - 3} more context{keyword.sources.length - 3 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {query.trim() && !isLoading && !hasResults && !showMessage && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p>No results found for &quot;{query}&quot;. Try different keywords or check your spelling.</p>
        </div>
      )}

      {/* Sources */}
      <div className="mt-16 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold mb-4">Data Sources</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>
            <a 
              href="https://www.ebudget.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://www.ebudget.ca.gov/', 'search_sources')}
            >
              California State Budget (ebudget.ca.gov)
            </a>
          </li>
          <li>
            <a 
              href="https://fiscal.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://fiscal.ca.gov/', 'search_sources')}
            >
              California Fiscal Transparency (fiscal.ca.gov)
            </a>
          </li>
          <li>
            <a 
              href="https://publicpay.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={() => analytics.externalLinkClick('https://publicpay.ca.gov/', 'search_sources')}
            >
              California Public Pay (publicpay.ca.gov)
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}

// Wrapper component for suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageClient />
    </Suspense>
  );
} 