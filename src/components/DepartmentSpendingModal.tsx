import React, { useState, useEffect } from 'react';
import { getAvailableColumns, BUDGET_SPENDING_COLUMNS, VENDOR_SPENDING_COLUMNS, downloadTSVWithLookups } from './SearchDetailCards';

export default function DepartmentSpendingModal({ 
  isOpen, 
  onClose, 
  title, 
  departmentName,
  query,
  departmentCode,
  type = 'budget',
}: { 
  isOpen: boolean;
  onClose: () => void;
  title: string;
  departmentName: string;
  query?: string;
  departmentCode?: string;
  type?: 'budget' | 'vendor';
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setPage(1);
  };

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

  const handleDownload = async () => {
    if (!departmentName || downloading) return;
    setDownloading(true);
    try {
      let code = departmentCode;
      if (!code) {
        let codeMatch = title.match(/\((\d{3,})\)$/);
        code = (codeMatch ? codeMatch[1] : undefined) as string | undefined;
      }
      let url: string;
      if (code) {
        url = `/api/spend?view=${type}&department_code=${encodeURIComponent(code)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
      } else {
        url = `/api/spend?view=${type}&department=${encodeURIComponent(departmentName)}&limit=10000&sort=${sortColumn}&order=${sortDirection}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      let allData = result.spending || [];
      if (allData.length === 0) {
        alert('No data to download');
        return;
      }
              allData = allData.map(row => {
          let fundValue = row.fund;
          if (typeof fundValue === 'number') {
            fundValue = String(fundValue);
          }
          return {
            ...row,
            fund: fundValue
          };
        });
      const availableColumns = getAvailableColumns(allData, type === 'budget' ? BUDGET_SPENDING_COLUMNS : VENDOR_SPENDING_COLUMNS);
      const safeDepName = departmentName.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}_spending_${safeDepName}_${timestamp}`;
      await downloadTSVWithLookups(allData, filename, availableColumns);
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !departmentName) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        let code = departmentCode;
        if (!code) {
          let codeMatch = title.match(/\((\d{3,})\)$/);
          code = (codeMatch ? codeMatch[1] : undefined) as string | undefined;
        }
        let url: string;
        if (code) {
          url = `/api/spend?view=${type}&department_code=${encodeURIComponent(code)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
        } else {
          url = `/api/spend?view=${type}&department=${encodeURIComponent(departmentName)}&page=${page}&limit=${limit}&sort=${sortColumn}&order=${sortDirection}`;
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
  }, [isOpen, departmentName, page, sortColumn, sortDirection, departmentCode, title, type]);

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
                  <th className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('year')}>Year{renderSortIndicator('year')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('department')}>Department{renderSortIndicator('department')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('program')}>Program{renderSortIndicator('program')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('fund')}>Fund{renderSortIndicator('fund')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('amount')}>Amount{renderSortIndicator('amount')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Match</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-3 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-3 py-8 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2">{item.year}</td>
                      <td className="border border-gray-300 px-3 py-2">{item.department}</td>
                      <td className="border border-gray-300 px-3 py-2">{item.program}</td>
                      <td className="border border-gray-300 px-3 py-2">{item.fund}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => (pagination && p < pagination.totalPages ? p + 1 : p))}
                  disabled={pagination && page >= pagination.totalPages}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 