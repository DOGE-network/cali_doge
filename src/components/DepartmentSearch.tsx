'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type Department = {
  id: string;
  code: string;
  name: string;
  date: string;
  excerpt: string;
  image?: string;
  workforceName?: string;
  hasWorkforceData?: boolean;
};

interface DepartmentSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepartmentSearch({ isOpen, onClose }: DepartmentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [recentDepartments, setRecentDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset auto-close timer
  const resetAutoCloseTimer = useCallback(() => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }
    if (isOpen || isHovering) {
      autoCloseTimeoutRef.current = setTimeout(() => {
        onClose();
        setIsHovering(false);
      }, 3000);
    }
  }, [isOpen, isHovering, onClose]);

  // Fetch departments on component mount or when opened
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/departments');
        const data = await response.json();
        
        // Debug code types
        console.log('Department codes:');
        data.slice(0, 5).forEach((dept: Department) => {
          console.log(`${dept.name}: code=${dept.code}, type=${typeof dept.code}`);
        });
        
        setDepartments(data);
        
        // Set recent departments (3 most recent)
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentDepartments(sorted.slice(0, 3));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setIsLoading(false);
      }
    };

    if (isOpen || isHovering) {
      fetchDepartments();
      resetAutoCloseTimer();
      // Focus the input when opened
      if (isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, isHovering, resetAutoCloseTimer]);

  // Filter departments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDepartments([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = departments.filter((dept) => {
      // Search by name
      if (dept.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by code - convert to string to handle numeric codes
      if (dept.code) {
        const codeStr = String(dept.code).toLowerCase();
        // Either the code includes the search term or the search term includes the code
        if (codeStr.includes(searchLower) || searchLower.includes(codeStr)) {
          return true;
        }
      }
      
      // Search by excerpt/description
      if (dept.excerpt && dept.excerpt.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search by workforce name
      if (dept.workforceName && dept.workforceName.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredDepartments(filtered);
    resetAutoCloseTimer();
  }, [searchTerm, departments, resetAutoCloseTimer]);

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
    };
  }, []);

  // Reset auto-close timer on user interaction
  const handleUserInteraction = () => {
    resetAutoCloseTimer();
  };

  if (!isOpen && !isHovering) return null;

  return (
    <div 
      ref={searchRef}
      className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border border-odi-gray-300 z-50 transition-all duration-200 ease-in-out"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleUserInteraction}
      onClick={handleUserInteraction}
      onKeyDown={handleUserInteraction}
    >
      <div className="p-4">
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-odi-blue"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-odi-blue"></div>
          </div>
        ) : searchTerm.trim() ? (
          <div className="max-h-80 overflow-y-auto">
            {filteredDepartments.length > 0 ? (
              <div className="space-y-3">
                {filteredDepartments.map((dept) => (
                  <div key={dept.id} className="flex flex-col space-y-2">
                    <div className="flex items-start p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      {dept.image && (
                        <div className="flex-shrink-0 mr-3">
                          <div className="relative w-12 h-12">
                            <Image
                              src={dept.image.replace('/assets/img/', '/')}
                              alt={dept.name}
                              fill
                              className="rounded object-cover"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/workforce?department=${encodeURIComponent(dept.workforceName || dept.name)}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                            onClick={onClose}
                          >
                            {dept.name}
                            {dept.code && (
                              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {dept.code}
                              </span>
                            )}
                          </Link>
                          <Link
                            href={`/departments/${dept.id}`}
                            className="text-sm text-gray-500 hover:text-blue-600 ml-2"
                            onClick={onClose}
                          >
                            Details →
                          </Link>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{dept.excerpt}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500">No departments found</p>
            )}
          </div>
        ) : (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Recent Departments</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentDepartments.map((dept) => (
                <div key={dept.id} className="flex flex-col space-y-2">
                  <div className="flex items-start p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    {dept.image && (
                      <div className="flex-shrink-0 mr-3">
                        <div className="relative w-12 h-12">
                          <Image
                            src={dept.image.replace('/assets/img/', '/')}
                            alt={dept.name}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/workforce?department=${encodeURIComponent(dept.workforceName || dept.name)}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                          onClick={onClose}
                        >
                          {dept.name}
                          {dept.code && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {dept.code}
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`/departments/${dept.id}`}
                          className="text-sm text-gray-500 hover:text-blue-600 ml-2"
                          onClick={onClose}
                        >
                          Details →
                        </Link>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{dept.excerpt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 