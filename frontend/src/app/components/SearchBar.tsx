'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchSuggestion {
  id: number;
  name: string;
  category_name: string;
}

interface SearchBarProps {
  className?: string;
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = (searchQuery || query).trim();
    if (finalQuery.length >= 2) {
      setShowSuggestions(false);
      setQuery('');
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }
  };

  // Handle input changes and fetch suggestions
  const handleInputChange = async (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (value.length >= 2) {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/public/search?q=${encodeURIComponent(value)}&limit=5`
        );
        const result = await response.json();

        if (result.status === 'success') {
          setSuggestions(result.data.results.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = suggestions[selectedIndex];
          router.push(`/products/${selectedSuggestion.id}`);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder="Search products..."
          className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
        />

        {/* Search Button */}
        <button
          onClick={() => handleSearch()}
          disabled={query.length < 2}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors duration-200"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
        </button>
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => router.push(`/products/${suggestion.id}`)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3 ${
                  index === selectedIndex ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600 text-xs font-semibold">
                      {suggestion.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    in {suggestion.category_name}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* View All Results */}
          <div className="border-t border-gray-200 px-4 py-3">
            <button
              onClick={() => handleSearch()}
              className="w-full text-left text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-150"
            >
              View all results for "{query}" →
            </button>
          </div>
        </div>
      )}

      {/* No Results */}
      {showSuggestions && query.length >= 2 && suggestions.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-6 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              No products found for "{query}"
            </p>
            <button
              onClick={() => handleSearch()}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Search anyway →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
