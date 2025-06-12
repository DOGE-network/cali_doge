// All props in SearchTypeFilterProps are required for the filter UI to function. Do not remove unless refactoring all usages.
import React from 'react';

interface SearchTypeFilterProps {
  selectedTypes: string[];
  onToggleType: (_type: string) => void;
  className?: string;
}

const SEARCH_TYPES = [
  { key: 'department', label: 'Departments' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'program', label: 'Programs' },
  { key: 'fund', label: 'Funds' },
  { key: 'keyword', label: 'Keywords' },
];

export const SearchTypeFilter: React.FC<SearchTypeFilterProps> = ({ selectedTypes, onToggleType, className = '' }) => (
  <div className={`flex flex-wrap gap-2 ${className}`}>
    {SEARCH_TYPES.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        onClick={() => onToggleType(key)}
        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
          selectedTypes.includes(key)
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
        }`}
        aria-pressed={selectedTypes.includes(key)}
      >
        {label}
      </button>
    ))}
  </div>
); 