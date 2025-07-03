'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { SearchItem, KeywordItem } from '@/types/search';
import { fuzzyMatch } from '@/lib/fuzzyMatching';
import { downloadTSVWithLookups, getAvailableColumns, VENDOR_SPENDING_COLUMNS, BUDGET_SPENDING_COLUMNS } from '@/lib/download';

interface DetailCardProps {
  item: SearchItem | KeywordItem;
  isSelected?: boolean;
  onSelect?: () => void;
  matchField?: string | null;
  matchSnippet?: string | null;
  query?: string;
  fuzzyScore?: number;
  fuzzyResult?: string;
}

interface SpendData {
  totalAmount: number;
  transactionCount: number;
  topDepartments: string[];
  topPrograms: string[];
  recentYear: number;
}

interface ProgramData {
  description: string;
  departments: string[];
  totalBudget: number;
  sources: string[];
}

// HighlightMatch component
function HighlightMatch({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query})`, 'ig');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: 'yellow', fontWeight: 600 }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Function to find how well this record matches the department using fuzzy logic
function findMatchInRecord(record: any, searchQuery?: string, contextDepartmentName?: string): {
  score: number;
  display: string;
  field: string;
  confidence: 'high' | 'medium' | 'low';
  matchedText: string;
} | null {
  if (!contextDepartmentName) return null;
  
  let bestMatch: any = null;
  let bestScore = 0;
  let bestField = '';
  let bestMatchedText = '';

  // First, try to get the department code from the record
  const recordDepartmentCode = record.departmentCode || record.organizational_code || record.org_code;
  const recordDepartmentName = record.department || record.departmentName;
  const expectedDepartmentCode = record.departmentCode; // This is set in the DepartmentDetailCard context

  // Check for exact code and name match (highest priority)
  const codeMatches = recordDepartmentCode && expectedDepartmentCode && recordDepartmentCode === expectedDepartmentCode;
  const nameMatches = recordDepartmentName && contextDepartmentName && recordDepartmentName.toLowerCase() === contextDepartmentName.toLowerCase();

  if (codeMatches && nameMatches) {
    return {
      score: 1.0,
      display: `🟢 100% via department code & name`,
      field: 'department code & name',
      confidence: 'high',
      matchedText: `${recordDepartmentCode} & ${recordDepartmentName}`
    };
  } else if (codeMatches) {
    return {
      score: 1.0,
      display: `🟢 100% via department code`,
      field: 'department code',
      confidence: 'high',
      matchedText: recordDepartmentCode
    };
  } else if (nameMatches) {
    return {
      score: 0.8,
      display: `🟢 80% via department name`,
      field: 'department name',
      confidence: 'high',
      matchedText: recordDepartmentName
    };
  }

  // Fields to check for fuzzy matching against the department name
  const fieldsToCheck = [
    { field: 'department', label: 'department', weight: 1.2 },
    { field: 'departmentName', label: 'department name', weight: 1.2 },
    { field: 'vendor', label: 'vendor', weight: 1.0 },
    { field: 'program', label: 'program', weight: 0.8 },
    { field: 'programName', label: 'program name', weight: 0.8 },
    { field: 'description', label: 'description', weight: 0.6 },
    { field: 'programDescription', label: 'program desc', weight: 0.6 }
  ];

  // Check each field against the department name using fuzzy matching
  fieldsToCheck.forEach(({ field, label, weight }) => {
    const fieldValue = record[field];
    if (fieldValue && typeof fieldValue === 'string') {
      // Check for exact name match first
      if (fieldValue.toLowerCase() === contextDepartmentName.toLowerCase()) {
        const exactScore = 0.8; // 80% for exact name match
        if (exactScore > bestScore) {
          bestScore = exactScore;
          bestMatch = {
            score: exactScore,
            confidence: 'high',
            algorithm: 'exact',
            matchType: 'exact'
          };
          bestField = label;
          bestMatchedText = fieldValue;
        }
      } else {
        // Use fuzzy matching for non-exact matches
        const fuzzyResult = fuzzyMatch(contextDepartmentName, fieldValue, { 
          threshold: 0.3, // Lower threshold to catch more matches
          usePhonetic: true,
          preferExact: true 
        });
        
        // Apply weight to the score, but cap at 0.7 for fuzzy matches
        const weightedScore = Math.min(fuzzyResult.score * weight, 0.7);
        
        if (weightedScore > bestScore) {
          bestScore = weightedScore;
          bestMatch = fuzzyResult;
          bestField = label;
          bestMatchedText = fieldValue;
        }
      }
    }
  });

  // If we have a decent match, return formatted result
  if (bestMatch && bestScore >= 0.3) {
    const percentage = Math.round(bestScore * 100);
    const confidenceIcon = bestMatch.confidence === 'high' ? '🟢' : 
                           bestMatch.confidence === 'medium' ? '🟡' : '🔴';
    
    return {
      score: bestScore,
      display: `${confidenceIcon} ${percentage}% via ${bestField}`,
      field: bestField,
      confidence: bestMatch.confidence,
      matchedText: bestMatchedText
    };
  }

  return null;
}

// Add a MatchedFieldButton component with fuzzy matching display
function MatchedFieldButton({ 
  matchField, 
  matchSnippet, 
  query, 
  fuzzyResult,
  fuzzyScore 
}: { 
  matchField: string; 
  matchSnippet: string; 
  query?: string;
  fuzzyResult?: string;
  fuzzyScore?: number;
}) {
  const [hovered, setHovered] = useState(false);
  if (!matchField || !matchSnippet) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="px-3 py-1 text-sm text-white rounded transition-colors ml-2 bg-blue-500 hover:bg-blue-600"
        style={{ minWidth: 90 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        Matched {matchField}
      </button>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            zIndex: 10,
            background: 'white',
            color: '#222',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 250,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          <div style={{ fontSize: '0.95em' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              Matched Field: {matchField}
            </div>
            {fuzzyScore && (
              <div style={{ marginBottom: '4px', color: '#666' }}>
                Fuzzy Score: {Math.round(fuzzyScore * 100)}%
                {fuzzyResult && (
                  <span className="ml-2">({fuzzyResult})</span>
                )}
              </div>
            )}
            <div>
              <HighlightMatch text={matchSnippet} query={query} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// DetailedDataModal component for displaying detailed spend/budget data
function DetailedDataModal({ 
  isOpen, 
  onClose, 
  title, 
  departmentName,
  type,
  query,
  departmentCode
}: { 
  isOpen: boolean;
  onClose: () => void;
  title: string;
  departmentName: string;
  type: 'vendor' | 'budget';
  query?: string;
  departmentCode?: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [sortColumn, setSortColumn] = useState<string>('amount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [downloading, setDownloading] = useState(false);
  const limit = 50;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to descending for new column
    }
    // Reset to first page when sorting changes
    setPage(1);
  };

  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return (
      <span className="text-blue-600 ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Download all data for the department
  const handleDownload = async () => {
    if (!departmentName || downloading) return;
    setDownloading(true);
    try {
      // Use departmentCode prop if available, else extract from title, else fallback to name
      let code = departmentCode;
      if (!code) {
        let codeMatch = title.match(/\((\d{3,})\)$/);
        code = (codeMatch ? codeMatch[1] : undefined) as string | undefined;
      }
      let url: string;
      if (type === 'vendor') {
        if (code) {
          url = `/api/spend?department_code=${encodeURIComponent(code)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
        } else {
          url = `/api/spend?department=${encodeURIComponent(departmentName)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
        }
      } else {
        if (code) {
          url = `/api/spend?view=budget&department_code=${encodeURIComponent(code)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
        } else {
          url = `/api/spend?view=budget&department=${encodeURIComponent(departmentName)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
        }
      }
      const response = await fetch(url);
      const result = await response.json();
      let allData = result.spending || [];

      if (allData.length === 0) {
        alert('No data to download');
        return;
      }

      // Re-run match logic for all rows before export
      allData = allData.map(row => {
        const match = findMatchInRecord(row, query, departmentName);
        // Ensure fund fields remain strings
        let fundValue = row.fund;
        if (typeof fundValue === 'number') {
          fundValue = String(fundValue);
        }
        return {
          ...row,
          fund: fundValue,
          matchField: match?.field,
          matchSnippet: match?.matchedText,
          fuzzyScore: match?.score,
          fuzzyResult: match?.confidence
        };
      });

      // Determine columns based on data type and available fields
      const predefinedColumns = type === 'vendor' ? VENDOR_SPENDING_COLUMNS : BUDGET_SPENDING_COLUMNS;
      const availableColumns = getAvailableColumns(allData, predefinedColumns);
      // Generate filename
      const safeDepName = departmentName.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}_spending_${safeDepName}_${timestamp}`;
      // Download the data
      await downloadTSVWithLookups(allData, filename, availableColumns);
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Fetch data when modal opens or page changes
  useEffect(() => {
    if (!isOpen || !departmentName) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Use departmentCode prop if available, else extract from title, else fallback to name
        let code = departmentCode;
        if (!code) {
          let codeMatch = title.match(/\((\d{3,})\)$/);
          code = (codeMatch ? codeMatch[1] : undefined) as string | undefined;
        }
        let url: string;
        if (type === 'vendor') {
          if (code) {
            url = `/api/spend?department_code=${encodeURIComponent(code)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
          } else {
            url = `/api/spend?department=${encodeURIComponent(departmentName)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
          }
        } else {
          if (code) {
            url = `/api/spend?view=budget&department_code=${encodeURIComponent(code)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
          } else {
            url = `/api/spend?view=budget&department=${encodeURIComponent(departmentName)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
          }
        }
        const response = await fetch(url);
        const result = await response.json();
        setData(result.spending || []);
        setPagination(result.pagination || null);
        setSummary(result.summary || null);
      } catch (error) {
        console.error('Error fetching detailed data:', error);
        setData([]);
        setPagination(null);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, departmentName, type, page, sortColumn, sortDirection, departmentCode, title]);

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
                          <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  {query && (
                    <p>
                      Search: <span className="font-medium text-gray-800">&quot;{query}&quot;</span>
                    </p>
                  )}
                  {summary && (
                    <p>
                      {summary.recordCount?.toLocaleString()} records • {formatCurrency(summary.totalAmount || 0)} total
                    </p>
                  )}
                </div>
              </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>Download TSV</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {type === 'vendor' ? (
                    <>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('year')}
                      >
                        Year{renderSortIndicator('year')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('vendor')}
                      >
                        Vendor{renderSortIndicator('vendor')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('amount')}
                      >
                        Amount{renderSortIndicator('amount')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('department')}
                      >
                        Department{renderSortIndicator('department')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('program')}
                      >
                        Program{renderSortIndicator('program')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('fund')}
                      >
                        Fund{renderSortIndicator('fund')}
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Match</th>
                    </>
                  ) : (
                    <>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('year')}
                      >
                        Year{renderSortIndicator('year')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('department')}
                      >
                        Department{renderSortIndicator('department')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('program')}
                      >
                        Program{renderSortIndicator('program')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('fund')}
                      >
                        Fund{renderSortIndicator('fund')}
                      </th>
                      <th 
                        className="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort('amount')}
                      >
                        Amount{renderSortIndicator('amount')}
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Match</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={(type === 'vendor' ? 7 : 6)} className="border border-gray-300 px-3 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={(type === 'vendor' ? 7 : 6)} className="border border-gray-300 px-3 py-8 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    const matchInfo = findMatchInRecord(item, query, departmentName);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        {type === 'vendor' ? (
                          <>
                            <td className="border border-gray-300 px-3 py-2">{item.year}</td>
                            <td className="border border-gray-300 px-3 py-2">
                              {query ? <HighlightMatch text={item.vendor} query={query} /> : item.vendor}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.department ? (
                                query ? <HighlightMatch text={item.department} query={query} /> : item.department
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.program ? (
                                query ? <HighlightMatch text={item.program} query={query} /> : item.program
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.fund ? (
                                query ? <HighlightMatch text={item.fund} query={query} /> : item.fund
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {matchInfo ? (
                                <span 
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    matchInfo.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                    matchInfo.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                  title={`Matched text: "${matchInfo.matchedText}" (${Math.round(matchInfo.score * 100)}% similarity)`}
                                >
                                  {matchInfo.display}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">no match</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border border-gray-300 px-3 py-2">{item.year}</td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.department ? (
                                query ? <HighlightMatch text={item.department} query={query} /> : item.department
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.program ? (
                                query ? <HighlightMatch text={item.program} query={query} /> : item.program
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {item.fund ? (
                                query ? <HighlightMatch text={item.fund} query={query} /> : item.fund
                              ) : 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              {matchInfo ? (
                                <span 
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    matchInfo.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                    matchInfo.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                  title={`Matched text: "${matchInfo.matchedText}" (${Math.round(matchInfo.score * 100)}% similarity)`}
                                >
                                  {matchInfo.display}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">no match</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={!pagination.hasPrevPage || loading}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {summary ? (
                <>
                  Total: {formatCurrency(summary.totalAmount || 0)} 
                  ({summary.recordCount?.toLocaleString() || 0} total records)
                </>
              ) : (
                <>
                  Page Total: {formatCurrency(data.reduce((sum, item) => sum + (item.amount || 0), 0))} 
                  ({data.length} records on this page)
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DepartmentDetailCardProps extends DetailCardProps {
  vendorTotal?: number | null;
  budgetTotal?: number | null;
  vendorRecordCount?: number | null;
  budgetRecordCount?: number | null;
}

export function DepartmentDetailCard({ 
  item, 
  isSelected, 
  // eslint-disable-next-line no-unused-vars
  onSelect, 
  matchField, 
  matchSnippet, 
  query, 
  vendorTotal, 
  budgetTotal,
  // eslint-disable-next-line no-unused-vars
  vendorRecordCount,
  // eslint-disable-next-line no-unused-vars
  budgetRecordCount,
  fuzzyScore,
  fuzzyResult
}: DepartmentDetailCardProps) {
  const [hasPage, setHasPage] = useState(false);
  const [departmentSlug, setDepartmentSlug] = useState<string>('');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [vendorMatchData, setVendorMatchData] = useState<{
    topMatches: Array<{
      score: number;
      display: string;
      field: string;
      confidence: 'high' | 'medium' | 'low';
      matchedText: string;
      vendor: string;
      amount: number;
    }>;
    totalMatches: number;
    avgScore: number;
  } | null>(null);
  const [budgetMatchData, setBudgetMatchData] = useState<{
    topMatches: Array<{
      score: number;
      display: string;
      field: string;
      confidence: 'high' | 'medium' | 'low';
      matchedText: string;
      program: string;
      amount: number;
    }>;
    totalMatches: number;
    avgScore: number;
  } | null>(null);
  const [loadingMatchData, setLoadingMatchData] = useState(false);

  useEffect(() => {
    if (item.type === 'department' && item.id) {
      // Check if department has a markdown page using API endpoint
      fetch('/api/departments/available')
        .then(res => res.json())
        .then(data => {
          // Find the matching slug that starts with the department ID
          const matchingSlug = data.slugs.find((slug: string) => slug.startsWith(item.id + '_'));
          if (matchingSlug) {
            setHasPage(true);
            setDepartmentSlug(matchingSlug);
          } else {
            setHasPage(false);
            setDepartmentSlug(item.type === 'department' ? item.id : 'unknown-department');
          }
        })
        .catch(console.error);
    }
  }, [item]);

  // Fetch matching data for vendor and budget records
  useEffect(() => {
    if (!item.term || item.type !== 'department') return;

    const fetchMatchData = async () => {
      setLoadingMatchData(true);
      try {
        // Prefer department_code if available
        const departmentCode = item.id;
        let vendorUrl = `/api/spend?department_code=${encodeURIComponent(departmentCode)}&limit=10`;
        let budgetUrl = `/api/spend?view=budget&department_code=${encodeURIComponent(departmentCode)}&limit=10`;
        console.log('[DepartmentDetailCard] Fetching vendor data:', vendorUrl);
        const vendorResponse = await fetch(vendorUrl);
        const vendorData = await vendorResponse.json();
        console.log('[DepartmentDetailCard] Vendor API response:', vendorData);
        console.log('[DepartmentDetailCard] Fetching budget data:', budgetUrl);
        const budgetResponse = await fetch(budgetUrl);
        const budgetData = await budgetResponse.json();
        console.log('[DepartmentDetailCard] Budget API response:', budgetData);

        // Analyze vendor matches with department code context
        const vendorMatches = vendorData.spending?.map((record: any) => {
          const recordWithCode = {
            ...record,
            departmentCode: departmentCode
          };
          const match = findMatchInRecord(recordWithCode, query, item.term);
          return {
            ...match,
            vendor: record.vendor,
            amount: record.amount
          };
        }).filter((match: any) => match !== null) || [];
        console.log('[DepartmentDetailCard] Vendor matches:', vendorMatches);

        // Analyze budget matches with department code context
        const budgetMatches = budgetData.spending?.map((record: any) => {
          const recordWithCode = {
            ...record,
            departmentCode: departmentCode
          };
          const match = findMatchInRecord(recordWithCode, query, item.term);
          return {
            ...match,
            program: record.program,
            amount: record.amount
          };
        }).filter((match: any) => match !== null) || [];
        console.log('[DepartmentDetailCard] Budget matches:', budgetMatches);

        // Calculate vendor match statistics
        const vendorAvgScore = vendorMatches.length > 0 
          ? vendorMatches.reduce((sum: number, m: any) => sum + m.score, 0) / vendorMatches.length 
          : 0;

        // Calculate budget match statistics
        const budgetAvgScore = budgetMatches.length > 0 
          ? budgetMatches.reduce((sum: number, m: any) => sum + m.score, 0) / budgetMatches.length 
          : 0;

        setVendorMatchData({
          topMatches: vendorMatches.slice(0, 3), // Top 3 matches
          totalMatches: vendorMatches.length,
          avgScore: vendorAvgScore
        });

        setBudgetMatchData({
          topMatches: budgetMatches.slice(0, 3), // Top 3 matches
          totalMatches: budgetMatches.length,
          avgScore: budgetAvgScore
        });

      } catch (error) {
        console.error('Error fetching match data:', error);
      } finally {
        setLoadingMatchData(false);
      }
    };

    fetchMatchData();
  }, [item.term, item.type, query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (item.type !== 'department') return null;
  const departmentItem = item as SearchItem;

  return (
    <div className={`p-6 border rounded-lg transition-all ${
      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{departmentItem.term}</h3>
          <p className="text-sm text-gray-600">Department • ID: {departmentItem.id || 'N/A'}</p>
        </div>
        <div className="flex gap-2 items-center">
          {hasPage ? (
            <Link
              href={`/departments/${departmentSlug}`}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              View Details
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded">
              Details Not Available
            </span>
          )}
          {matchField && matchSnippet && (
            <MatchedFieldButton 
              matchField={matchField} 
              matchSnippet={matchSnippet} 
              query={query}
              fuzzyScore={fuzzyScore}
              fuzzyResult={fuzzyResult}
            />
          )}
        </div>
      </div>

      {/* Vendor Spending Section */}
      <div className="mt-4 space-y-3">
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Vendor Spending</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              {vendorTotal !== null && vendorTotal !== undefined && vendorTotal > 0 ? (
                <button
                  onClick={() => setShowVendorModal(true)}
                  className="font-medium text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  ${vendorTotal.toLocaleString()}
                </button>
              ) : (
                <span className="font-medium text-sm text-gray-500">N/A</span>
              )}
            </div>
            
            {/* Vendor Match Analysis */}
            {loadingMatchData ? (
              <div className="text-xs text-gray-500">Analyzing matches...</div>
            ) : vendorMatchData && vendorMatchData.totalMatches > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Match Quality:</span>
                  <span className={`font-medium ${
                    vendorMatchData.avgScore >= 0.7 ? 'text-green-600' :
                    vendorMatchData.avgScore >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(vendorMatchData.avgScore * 100)}% avg
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {vendorMatchData.totalMatches} records with matches
                </div>
                {/* Top matches preview */}
                <div className="space-y-1">
                  {vendorMatchData.topMatches.map((match, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 p-1 rounded">
                      <div className="flex justify-between">
                        <span className="truncate">{match.vendor}</span>
                        <span className={`px-1 rounded text-xs ${
                          match.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          match.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(match.score * 100)}%
                        </span>
                      </div>
                      <div className="text-gray-500 truncate">
                        via {match.field}: &quot;{match.matchedText.substring(0, 30)}...&quot;
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No vendor matches found</div>
            )}
          </div>
        </div>

        {/* Budget Section */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Budget Allocation</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              {budgetTotal !== null && budgetTotal !== undefined && budgetTotal > 0 ? (
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="font-medium text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  ${budgetTotal.toLocaleString()}
                </button>
              ) : (
                <span className="font-medium text-sm text-gray-500">N/A</span>
              )}
            </div>
            
            {/* Budget Match Analysis */}
            {loadingMatchData ? (
              <div className="text-xs text-gray-500">Analyzing matches...</div>
            ) : budgetMatchData && budgetMatchData.totalMatches > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Match Quality:</span>
                  <span className={`font-medium ${
                    budgetMatchData.avgScore >= 0.7 ? 'text-green-600' :
                    budgetMatchData.avgScore >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(budgetMatchData.avgScore * 100)}% avg
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {budgetMatchData.totalMatches} records with matches
                </div>
                {/* Top matches preview */}
                <div className="space-y-1">
                  {budgetMatchData.topMatches.map((match, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 p-1 rounded">
                      <div className="flex justify-between">
                        <span className="truncate">{match.program}</span>
                        <span className={`px-1 rounded text-xs ${
                          match.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          match.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(match.score * 100)}%
                        </span>
                      </div>
                      <div className="text-gray-500 truncate">
                        via {match.field}: &quot;{match.matchedText.substring(0, 30)}...&quot;
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No budget matches found</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DetailedDataModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title={`Vendor Spending Details - ${departmentItem.term}`}
        departmentName={departmentItem.term}
        type="vendor"
        query={query}
        departmentCode={departmentItem.id}
      />
      <DetailedDataModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={`Budget Details - ${departmentItem.term}`}
        departmentName={departmentItem.term}
        type="budget"
        query={query}
        departmentCode={departmentItem.id}
      />
    </div>
  );
}

export function VendorDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult }: DetailCardProps) {
  const [spendData, setSpendData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSelected && item.type === 'vendor') {
      setLoading(true);
      // Fetch vendor spending data
      fetch(`/api/spend?vendor=${encodeURIComponent(item.term)}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data.spending && data.spending.length > 0) {
            const totalAmount = data.summary?.totalAmount || 0;
            const transactionCount = data.summary?.recordCount || 0;
            const topDepartments: string[] = Array.from(new Set(data.spending.slice(0, 5).map((s: any) => String(s.department || ''))));
            const topPrograms: string[] = Array.from(new Set(data.spending.slice(0, 5).map((s: any) => String(s.program || ''))));
            const recentYear = Math.max(...data.spending.map((s: any) => s.year));
            
            setSpendData({
              totalAmount,
              transactionCount,
              topDepartments,
              topPrograms,
              recentYear
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isSelected, item]);

  // Type guard to ensure we have a SearchItem
  if (item.type !== 'vendor') return null;
  const vendorItem = item as SearchItem;

  return (
    <div 
      className={`p-6 border rounded-lg transition-all cursor-pointer ${
        isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{vendorItem.term}</h3>
          <p className="text-sm text-gray-600">Vendor • ID: {vendorItem.id}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(vendorItem.term)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            ProPublica
          </a>
          <a
            href={`https://datarepublican.com/nonprofit/assets/?filter=${encodeURIComponent(vendorItem.term)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Data Republican
          </a>
          {matchField && matchSnippet && (
            <MatchedFieldButton 
              matchField={matchField} 
              matchSnippet={matchSnippet} 
              query={query}
              fuzzyScore={fuzzyScore}
              fuzzyResult={fuzzyResult}
            />
          )}
        </div>
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : spendData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Spending Overview</h4>
                <div className="space-y-1 text-sm">
                  <div>Total Amount: <span className="font-medium">${spendData.totalAmount.toLocaleString()}</span></div>
                  <div>Transactions: <span className="font-medium">{spendData.transactionCount.toLocaleString()}</span></div>
                  <div>Recent Year: <span className="font-medium">{spendData.recentYear}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Top Departments</h4>
                <div className="space-y-1 text-sm">
                  {spendData.topDepartments.slice(0, 3).map((dept, index) => (
                    <div key={`dept-${index}`} className="text-gray-600 truncate">{dept}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No spending data available</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProgramDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult }: DetailCardProps) {
  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSelected && item.type === 'program') {
      setLoading(true);
      // Fetch program data
      fetch(`/api/programs/${encodeURIComponent(item.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setProgramData({
              description: data.description || '',
              departments: data.departments || [],
              totalBudget: data.totalBudget || 0,
              sources: data.sources || []
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isSelected, item]);

  // Type guard to ensure we have a SearchItem
  if (item.type !== 'program') return null;
  const programItem = item as SearchItem;

  return (
    <div 
      className={`p-6 border rounded-lg transition-all cursor-pointer ${
        isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{programItem.term}</h3>
          <p className="text-sm text-gray-600">Program • ID: {programItem.id}</p>
        </div>
        <div className="flex gap-2 items-center">
          {matchField && matchSnippet && (
            <MatchedFieldButton 
              matchField={matchField} 
              matchSnippet={matchSnippet} 
              query={query}
              fuzzyScore={fuzzyScore}
              fuzzyResult={fuzzyResult}
            />
          )}
        </div>
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          ) : programData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Program Details</h4>
                <div className="space-y-1 text-sm">
                  <div>Total Budget: <span className="font-medium">${programData.totalBudget.toLocaleString()}</span></div>
                  <div>Departments: <span className="font-medium">{programData.departments.length}</span></div>
                  <div>Sources: <span className="font-medium">{programData.sources.length}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600">{programData.description}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No program data available</div>
          )}
        </div>
      )}
    </div>
  );
}

export function FundDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult }: DetailCardProps) {
  const [fundData, setFundData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSelected && item.type === 'fund') {
      setLoading(true);
      // Fetch fund data
      fetch(`/api/funds/${encodeURIComponent(item.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setFundData(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isSelected, item]);

  // Type guard to ensure we have a SearchItem
  if (item.type !== 'fund') return null;
  const fundItem = item as SearchItem;

  return (
    <div 
      className={`p-6 border rounded-lg transition-all cursor-pointer ${
        isSelected ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{fundItem.term}</h3>
          <p className="text-sm text-gray-600">Fund • ID: {fundItem.id}</p>
        </div>
        <div className="flex gap-2 items-center">
          {matchField && matchSnippet && (
            <MatchedFieldButton 
              matchField={matchField} 
              matchSnippet={matchSnippet} 
              query={query}
              fuzzyScore={fuzzyScore}
              fuzzyResult={fuzzyResult}
            />
          )}
        </div>
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          ) : fundData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Fund Details</h4>
                <div className="space-y-1 text-sm">
                  <div>Total Budget: <span className="font-medium">${fundData.totalBudget?.toLocaleString() || '0'}</span></div>
                  <div>Description: <span className="font-medium">{fundData.description || 'N/A'}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No fund data available</div>
          )}
        </div>
      )}
    </div>
  );
}

export function KeywordDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult }: DetailCardProps) {
  // Type guard to ensure we have a KeywordItem
  if (item.type !== 'keyword') return null;
  const keywordItem = item as KeywordItem;

  return (
    <div 
      className={`p-6 border rounded-lg transition-all cursor-pointer ${
        isSelected ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{keywordItem.term}</h3>
          <p className="text-sm text-gray-600">Keyword • Sources: {keywordItem.sources?.length || 0}</p>
        </div>
        <div className="flex gap-2 items-center">
          {matchField && matchSnippet && (
            <MatchedFieldButton 
              matchField={matchField} 
              matchSnippet={matchSnippet} 
              query={query}
              fuzzyScore={fuzzyScore}
              fuzzyResult={fuzzyResult}
            />
          )}
        </div>
      </div>

      {isSelected && keywordItem.sources && keywordItem.sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Context</h4>
          <div className="space-y-2">
            {keywordItem.sources.map((source, index) => (
              <div key={`source-${index}`} className="text-sm text-gray-600">
                <p className="font-medium">{source.type}: {source.id}</p>
                <p className="mt-1">{source.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 