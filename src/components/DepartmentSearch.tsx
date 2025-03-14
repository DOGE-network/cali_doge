'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type Department = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  image?: string;
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

  // Fetch departments on component mount or when opened
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/departments');
        const data = await response.json();
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
      // Focus the input when opened
      if (isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, isHovering]);

  // Filter departments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDepartments([]);
      return;
    }

    const filtered = departments.filter(
      (dept) =>
        dept.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDepartments(filtered);
  }, [searchTerm, departments]);

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
    setIsHovering(true);
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen && !isHovering) return null;

  return (
    <div 
      ref={searchRef}
      className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border border-odi-gray-300 z-50 transition-all duration-200 ease-in-out"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="p-4">
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search departments..."
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
                  <Link
                    key={dept.id}
                    href={`/departments/${dept.id}`}
                    className="flex items-start p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    {dept.image && (
                      <div className="flex-shrink-0 mr-3">
                        <div className="relative w-12 h-12">
                          <Image
                            src={dept.image.replace('/assets/img/', '/')}
                            alt={dept.title}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{dept.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-1">{dept.excerpt}</p>
                    </div>
                  </Link>
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
                <Link
                  key={dept.id}
                  href={`/departments/${dept.id}`}
                  className="flex items-start p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={onClose}
                >
                  {dept.image && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="relative w-12 h-12">
                        <Image
                          src={dept.image.replace('/assets/img/', '/')}
                          alt={dept.title}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{dept.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-1">{dept.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 