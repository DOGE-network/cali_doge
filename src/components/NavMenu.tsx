'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { DepartmentSearch } from './DepartmentSearch';

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/savings', label: 'Savings' },
  { href: '/payments', label: 'Payments' },
  { href: '/spend', label: 'Spend' },
  { href: '/workforce', label: 'Workforce' },
  { href: '/regulations', label: 'Regulations' },
  { href: '/network', label: 'Network' },
  { href: '/join', label: 'Join' },
  { href: '/about', label: 'About' },
];

export function NavMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchHovering, setIsSearchHovering] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  // Handle mouse enter/leave with delay for search
  const handleSearchMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsSearchHovering(true);
  };

  const handleSearchMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSearchHovering(false);
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

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        {/* Search Button */}
        <div
          ref={searchContainerRef}
          onMouseEnter={handleSearchMouseEnter}
          onMouseLeave={handleSearchMouseLeave}
        >
          <button
            ref={searchButtonRef}
            className="p-2 rounded-lg text-odi-black hover:bg-odi-gray-100 focus:outline-none focus:ring-2 focus:ring-odi-blue transition-colors"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search departments"
            aria-expanded={isSearchOpen}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                className="w-full h-full"
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
          </button>
        </div>

        {/* Menu Button */}
        <button
          className="p-2 rounded-lg text-odi-black hover:bg-odi-gray-100 focus:outline-none focus:ring-2 focus:ring-odi-blue transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-full h-full transition-transform duration-200"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </div>
        </button>
      </div>

      {/* Department Search */}
      <DepartmentSearch 
        isOpen={isSearchOpen || isSearchHovering} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Navigation Menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`absolute right-0 top-12 w-48 transition-all duration-200 ease-in-out transform z-50 ${
          isMenuOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <nav 
          className="flex flex-col space-y-1 py-2 bg-white rounded-lg shadow-lg border border-odi-gray-300"
          aria-label="Navigation menu"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-odi-black hover:bg-odi-gray-100 font-medium block px-4 py-2 mx-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-odi-blue transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
} 