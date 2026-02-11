'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { SearchItem } from '@/types/search';
import { downloadTSVWithLookups, getAvailableColumns, VENDOR_SPENDING_COLUMNS, BUDGET_SPENDING_COLUMNS } from '@/lib/download';
import DepartmentSpendingModal from './DepartmentSpendingModal';
import VendorSpendingModal from './VendorSpendingModal';
import ProgramSpendingModal from './ProgramSpendingModal';
import FundSpendingModal from './FundSpendingModal';

interface DetailCardProps {
  item: SearchItem;
  isSelected?: boolean;
  onSelect?: () => void;
  matchField?: string | null;
  matchSnippet?: string | null;
  query?: string;
  fuzzyScore?: number;
  fuzzyResult?: string;
  years?: number[];
}

// HighlightMatch component
function HighlightMatch({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  // Escape special regex characters to prevent crashes on queries like "C++", "(test)", etc.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
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

interface DepartmentDetailCardProps extends DetailCardProps {
  vendorTotal?: number | null;
  budgetTotal?: number | null;
  vendorRecordCount?: number | null;
  budgetRecordCount?: number | null;
  vendorYears?: number[];
  budgetYears?: number[];
}

export function DepartmentDetailCard({ 
  item, 
  isSelected, 
  onSelect: _onSelect, 
  matchField, 
  matchSnippet, 
  query, 
  vendorTotal, 
  budgetTotal,
  vendorRecordCount,
  budgetRecordCount,
  fuzzyScore,
  fuzzyResult,
  vendorYears,
  budgetYears
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
            setDepartmentSlug(item.type === 'department' ? item.id : 'unknown-department');
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
            
            {/* Accurate total record count display */}
            {typeof vendorRecordCount === 'number' ? (
              <div className="text-xs text-gray-600">
                {vendorRecordCount > 0
                  ? `${vendorRecordCount.toLocaleString()} total records${vendorYears && vendorYears.length > 0 ? ` (${Math.min(...vendorYears)}–${Math.max(...vendorYears)})` : ''}`
                  : '0 records found'}
              </div>
            ) : null}
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
            
            {/* Accurate total record count display */}
            {typeof budgetRecordCount === 'number' ? (
              <div className="text-xs text-gray-600">
                {budgetRecordCount > 0
                  ? `${budgetRecordCount.toLocaleString()} total records${budgetYears && budgetYears.length > 0 ? ` (${Math.min(...budgetYears)}–${Math.max(...budgetYears)})` : ''}`
                  : '0 records found'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepartmentSpendingModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title={`Vendor Spending Details - ${departmentItem.term}`}
        departmentName={departmentItem.term}
        query={query}
        departmentCode={departmentItem.id}
        type="vendor"
      />
      <DepartmentSpendingModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={`Budget Details - ${departmentItem.term}`}
        departmentName={departmentItem.term}
        query={query}
        departmentCode={departmentItem.id}
        type="budget"
      />
    </div>
  );
}

export function VendorDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult, years }: DetailCardProps) {
  const [spendData, setSpendData] = useState<{
    totalAmount: number;
    transactionCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  useEffect(() => {
    if (item.type !== 'vendor') return;
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch vendor summary (totals, record count) only
        const summaryRes = await fetch(`/api/spend?vendor=${encodeURIComponent(item.term)}&limit=1`);
        const summaryData = await summaryRes.json();
        const totalAmount = summaryData.summary?.totalAmount || 0;
        const transactionCount = summaryData.summary?.recordCount || 0;

        setSpendData({
          totalAmount,
          transactionCount
        });
      } catch {
        setSpendData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [item.term, item.type]);

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
        <div className="flex gap-2 items-center">
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

      <div className="mt-4 space-y-3">
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Vendor Spending</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              {loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : spendData && spendData.totalAmount > 0 ? (
                <button
                  onClick={e => { e.stopPropagation(); setShowVendorModal(true); }}
                  className="font-medium text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  ${spendData.totalAmount.toLocaleString()}
                </button>
              ) : (
                <span className="font-medium text-sm text-gray-500">N/A</span>
              )}
            </div>
            {/* Accurate total record count display */}
            {typeof spendData?.transactionCount === 'number' ? (
              <div className="text-xs text-gray-600">
                {spendData.transactionCount > 0
                  ? `${spendData.transactionCount.toLocaleString()} total records${years && years.length > 0 ? ` (${Math.min(...years)}–${Math.max(...years)})` : ''}`
                  : '0 records found'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal */}
      <VendorSpendingModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title={`Vendor Spending Details - ${vendorItem.term}`}
        vendorName={vendorItem.term}
        query={query}
      />
    </div>
  );
}

export function ProgramDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult, years }: DetailCardProps) {
  const [spendData, setSpendData] = useState<{
    totalAmount: number;
    transactionCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);

  useEffect(() => {
    if (item.type !== 'program') return;
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch program spending summary (totals, record count) only
        const summaryRes = await fetch(`/api/spend?program=${encodeURIComponent(item.id)}&limit=1`);
        const summaryData = await summaryRes.json();
        const totalAmount = summaryData.summary?.totalAmount || 0;
        const transactionCount = summaryData.summary?.recordCount || 0;

        setSpendData({
          totalAmount,
          transactionCount
        });
      } catch {
        setSpendData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [item.id, item.type]);

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

      <div className="mt-4 space-y-3">
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Program Spending</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              {loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : spendData && spendData.totalAmount > 0 ? (
                <button
                  onClick={e => { e.stopPropagation(); setShowProgramModal(true); }}
                  className="font-medium text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  ${spendData.totalAmount.toLocaleString()}
                </button>
              ) : (
                <span className="font-medium text-sm text-gray-500">N/A</span>
              )}
            </div>
            {/* Accurate total record count display */}
            {typeof spendData?.transactionCount === 'number' ? (
              <div className="text-xs text-gray-600">
                {spendData.transactionCount > 0
                  ? `${spendData.transactionCount.toLocaleString()} total records${years && years.length > 0 ? ` (${Math.min(...years)}–${Math.max(...years)})` : ''}`
                  : '0 records found'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal */}
      <ProgramSpendingModal
        isOpen={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title={`Program Spending Details - ${programItem.term}`}
        programCode={programItem.id}
        programName={programItem.term}
        query={query}
      />
    </div>
  );
}

export function FundDetailCard({ item, isSelected, onSelect, matchField, matchSnippet, query, fuzzyScore, fuzzyResult, years }: DetailCardProps) {
  const [spendData, setSpendData] = useState<{
    totalAmount: number;
    transactionCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);

  useEffect(() => {
    if (item.type !== 'fund') return;
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch fund spending summary (totals, record count) only
        const summaryRes = await fetch(`/api/spend?fund=${encodeURIComponent(item.id)}&limit=1`);
        const summaryData = await summaryRes.json();
        const totalAmount = summaryData.summary?.totalAmount || 0;
        const transactionCount = summaryData.summary?.recordCount || 0;

        setSpendData({
          totalAmount,
          transactionCount
        });
      } catch {
        setSpendData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [item.id, item.type]);

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

      <div className="mt-4 space-y-3">
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fund Spending</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              {loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : spendData && spendData.totalAmount > 0 ? (
                <button
                  onClick={e => { e.stopPropagation(); setShowFundModal(true); }}
                  className="font-medium text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  ${spendData.totalAmount.toLocaleString()}
                </button>
              ) : (
                <span className="font-medium text-sm text-gray-500">N/A</span>
              )}
            </div>
            {/* Accurate total record count display */}
            {typeof spendData?.transactionCount === 'number' ? (
              <div className="text-xs text-gray-600">
                {spendData.transactionCount > 0
                  ? `${spendData.transactionCount.toLocaleString()} total records${years && years.length > 0 ? ` (${Math.min(...years)}–${Math.max(...years)})` : ''}`
                  : '0 records found'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal */}
      <FundSpendingModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        title={`Fund Spending Details - ${fundItem.term}`}
        fundCode={fundItem.id}
        fundName={fundItem.term}
        query={query}
      />
    </div>
  );
}

export { getAvailableColumns, VENDOR_SPENDING_COLUMNS, BUDGET_SPENDING_COLUMNS, downloadTSVWithLookups }; 