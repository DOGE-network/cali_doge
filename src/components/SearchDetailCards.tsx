'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { SearchItem, KeywordItem } from '@/types/search';

interface DetailCardProps {
  item: SearchItem | KeywordItem;
  isSelected?: boolean;
  onSelect?: () => void;
  matchField?: string | null;
  matchSnippet?: string | null;
  query?: string;
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

// Add a MatchedFieldButton component
function MatchedFieldButton({ matchField, matchSnippet, query }: { matchField: string; matchSnippet: string; query?: string }) {
  const [hovered, setHovered] = useState(false);
  if (!matchField || !matchSnippet) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ml-2"
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
            minWidth: 200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          <span style={{ fontSize: '0.95em' }}>
            <HighlightMatch text={matchSnippet} query={query} />
          </span>
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
  type 
}: { 
  isOpen: boolean;
  onClose: () => void;
  title: string;
  departmentName: string;
  type: 'vendor' | 'budget';
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const limit = 50;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch data when modal opens or page changes
  useEffect(() => {
    if (!isOpen || !departmentName) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const url = type === 'vendor' 
          ? `/api/spend?department=${encodeURIComponent(departmentName)}&page=${page}&limit=${limit}`
          : `/api/spend?view=budget&department=${encodeURIComponent(departmentName)}&page=${page}&limit=${limit}`;
        
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
  }, [isOpen, departmentName, type, page]);

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
        className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {type === 'vendor' ? (
                    <>
                      <th className="border border-gray-300 px-3 py-2 text-left">Year</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Vendor</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Program</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Fund</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-300 px-3 py-2 text-left">Year</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Program</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Fund</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={type === 'vendor' ? 5 : 4} className="border border-gray-300 px-3 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={type === 'vendor' ? 5 : 4} className="border border-gray-300 px-3 py-8 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {type === 'vendor' ? (
                        <>
                          <td className="border border-gray-300 px-3 py-2">{item.year}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.vendor}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">{item.program || 'N/A'}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.fund || 'N/A'}</td>
                        </>
                      ) : (
                        <>
                          <td className="border border-gray-300 px-3 py-2">{item.year}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.program || 'N/A'}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.fund || 'N/A'}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {formatCurrency(item.amount)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
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
  vendorRecordCount,
  budgetRecordCount
}: DepartmentDetailCardProps) {
  const [hasPage, setHasPage] = useState(false);
  const [departmentSlug, setDepartmentSlug] = useState<string>('');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

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
            setDepartmentSlug(item.id || 'unknown-department');
          }
        })
        .catch(console.error);
    }
  }, [item]);

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
            <MatchedFieldButton matchField={matchField} matchSnippet={matchSnippet} query={query} />
          )}
        </div>
      </div>
      <div className="mt-2">
        <div className="space-y-1 text-sm">
          <div>
            Vendor Spend Total: 
            {vendorTotal !== null && vendorTotal !== undefined && vendorTotal > 0 ? (
              <span className="ml-1">
                <button
                  onClick={() => setShowVendorModal(true)}
                  className="font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  ${vendorTotal.toLocaleString()}
                </button>
                {vendorRecordCount && vendorRecordCount > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (click to view {vendorRecordCount.toLocaleString()} records)
                  </span>
                )}
              </span>
            ) : (
              <span className="font-medium ml-1">N/A</span>
            )}
          </div>
          <div>
            Budget Total: 
            {budgetTotal !== null && budgetTotal !== undefined && budgetTotal > 0 ? (
              <span className="ml-1">
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  ${budgetTotal.toLocaleString()}
                </button>
                {budgetRecordCount && budgetRecordCount > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (click to view {budgetRecordCount.toLocaleString()} records)
                  </span>
                )}
              </span>
            ) : (
              <span className="font-medium ml-1">N/A</span>
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
      />
      <DetailedDataModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={`Budget Details - ${departmentItem.term}`}
        departmentName={departmentItem.term}
        type="budget"
      />
    </div>
  );
}

export function VendorDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query }: DetailCardProps) {
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
            <MatchedFieldButton matchField={matchField} matchSnippet={matchSnippet} query={query} />
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

export function ProgramDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query }: DetailCardProps) {
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
            <MatchedFieldButton matchField={matchField} matchSnippet={matchSnippet} query={query} />
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

export function FundDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query }: DetailCardProps) {
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
            <MatchedFieldButton matchField={matchField} matchSnippet={matchSnippet} query={query} />
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

export function KeywordDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query }: DetailCardProps) {
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
            <MatchedFieldButton matchField={matchField} matchSnippet={matchSnippet} query={query} />
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