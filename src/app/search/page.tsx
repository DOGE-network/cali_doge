'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
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
import { SearchTypeFilter } from '@/components/SearchTypeFilter';

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
  message?: string;
}

// Client component that uses useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}

function SearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for search and filters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['department', 'vendor', 'program', 'fund']);
  const [excludeCommon, setExcludeCommon] = useState(true);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading] = useState(false);

  // Build API URL based on current filters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (selectedTypes.length > 0) params.append('types', selectedTypes.join(','));
    if (excludeCommon !== undefined) params.append('exclude_common', excludeCommon.toString());
    if (limit) params.append('limit', limit.toString());
    return `/api/search?${params.toString()}`;
  };

  // Fetch search results
  const { data: searchData } = useSWR<SearchResponse>(
    query ? buildApiUrl() : null,
    async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching search results:', error);
        return {
          departments: [],
          vendors: [],
          programs: [],
          funds: [],
          keywords: [],
          totalResults: 0,
          query: query,
          appliedFilters: {
            types: selectedTypes,
            excludeCommon: excludeCommon,
            limit: limit
          },
          details: {
            departments: {},
            vendors: {},
            programs: {},
            funds: {}
          }
        };
      }
    }
  );

  // Track page view
  useEffect(() => {
    analytics.pageView('/search', 'Search California Government Data');
  }, []);

  // Auto-select first result when search data is loaded
  useEffect(() => {
    if (searchData) {
      const firstResult = searchData.departments?.[0] || 
                         searchData.vendors?.[0] || 
                         searchData.programs?.[0] || 
                         searchData.funds?.[0];
      if (firstResult) {
        setSelectedId(firstResult.id);
      }
    }
  }, [searchData]);

  // Initialize from URL params
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const typesParam = searchParams.get('types');
    const excludeParam = searchParams.get('exclude_common');
    const limitParam = searchParams.get('limit');
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

  const handleItemClick = (id: string) => {
    setSelectedId(id);
  };

  const renderResults = () => {
    if (!searchData) return null;

    const {
      departments = [],
      vendors = [],
      programs = [],
      funds = [],
      keywords = []
    } = searchData;

    interface Section {
      key: string;
      title: string;
      items: JSX.Element[];
    }

    const sections: Section[] = [
      departments.length > 0 && {
        key: 'departments-section',
        title: 'Departments',
        items: departments.map((dept, index) => (
          <DepartmentDetailCard
            key={`dept-${dept.id || index}`}
            item={dept}
            isSelected={selectedId === dept.id}
            onSelect={() => handleItemClick(dept.id)}
          />
        ))
      },
      vendors.length > 0 && {
        key: 'vendors-section',
        title: 'Vendors',
        items: vendors.map((vendor, index) => (
          <VendorDetailCard
            key={`vendor-${vendor.id || index}`}
            item={vendor}
            isSelected={selectedId === vendor.id}
            onSelect={() => handleItemClick(vendor.id)}
          />
        ))
      },
      programs.length > 0 && {
        key: 'programs-section',
        title: 'Programs',
        items: programs.map((program, index) => (
          <ProgramDetailCard
            key={`program-${program.id || index}`}
            item={program}
            isSelected={selectedId === program.id}
            onSelect={() => handleItemClick(program.id)}
          />
        ))
      },
      funds.length > 0 && {
        key: 'funds-section',
        title: 'Funds',
        items: funds.map((fund, index) => (
          <FundDetailCard
            key={`fund-${fund.id || index}`}
            item={fund}
            isSelected={selectedId === fund.id}
            onSelect={() => handleItemClick(fund.id)}
          />
        ))
      },
      keywords.length > 0 && {
        key: 'keywords-section',
        title: 'Keywords',
        items: keywords.map((keyword, index) => (
          <KeywordDetailCard
            key={`keyword-${keyword.term || index}`}
            item={keyword}
            isSelected={selectedId === keyword.term}
            onSelect={() => handleItemClick(keyword.term)}
          />
        ))
      }
    ].filter((section): section is Section => Boolean(section));

    return (
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search California Government Data</h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments, vendors, programs, funds..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4">
          <SearchTypeFilter
            selectedTypes={selectedTypes}
            onToggleType={toggleType}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        renderResults()
      )}
    </main>
  );
}