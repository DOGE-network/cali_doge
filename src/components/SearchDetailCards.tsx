'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { SearchItem, KeywordItem } from '@/types/search';

interface DetailCardProps {
  item: SearchItem | KeywordItem;
  isSelected?: boolean;
  onSelect?: () => void;
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

export function DepartmentDetailCard({ item, isSelected }: DetailCardProps) {
  const [spendData, setSpendData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPage, setHasPage] = useState(false);

  useEffect(() => {
    if (item.type === 'department' && item.id) {
      // Check if department has a markdown page using API endpoint
      fetch('/api/departments/available')
        .then(res => res.json())
        .then(data => {
          setHasPage(data.slugs.includes(item.id));
        })
        .catch(console.error);
    }
    if (isSelected && item.type === 'department' && item.id) {
      setLoading(true);
      // Fetch department spending data
      fetch(`/api/spend?department=${encodeURIComponent(item.term)}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data.spending && data.spending.length > 0) {
            // Calculate summary stats
            const totalAmount = data.summary?.totalAmount || 0;
            const transactionCount = data.summary?.recordCount || 0;
            const topVendors: string[] = Array.from(new Set(data.spending.slice(0, 5).map((s: any) => String(s.vendor || ''))));
            const topPrograms: string[] = Array.from(new Set(data.spending.slice(0, 5).map((s: any) => String(s.program || ''))));
            const recentYear = Math.max(...data.spending.map((s: any) => s.year));
            setSpendData({
              totalAmount,
              transactionCount,
              topDepartments: topVendors,
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
  if (item.type !== 'department') return null;
  const departmentItem = item as SearchItem;
  
  // The item.id is already in the correct format for the URL
  const departmentSlug = departmentItem.id || 'unknown-department';

  return (
    <div className={`p-6 border rounded-lg transition-all ${
      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{departmentItem.term}</h3>
          <p className="text-sm text-gray-600">Department • ID: {departmentItem.id || 'N/A'}</p>
        </div>
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
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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
                <h4 className="font-medium text-gray-900 mb-2">Top Programs</h4>
                <div className="space-y-1 text-sm">
                  {spendData.topPrograms.slice(0, 3).map((program, index) => (
                    <div key={index} className="text-gray-600 truncate">{program}</div>
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

export function VendorDetailCard({ item, isSelected, onSelect }: DetailCardProps) {
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
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            ProPublica
          </a>
          <a
            href={`https://www.datarepublican.com/search?q=${encodeURIComponent(vendorItem.term)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Data Republican
          </a>
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

export function ProgramDetailCard({ item, isSelected, onSelect }: DetailCardProps) {
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

export function FundDetailCard({ item, isSelected, onSelect }: DetailCardProps) {
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

export function KeywordDetailCard({ item, isSelected, onSelect }: DetailCardProps) {
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