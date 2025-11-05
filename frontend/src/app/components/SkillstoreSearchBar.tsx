'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: number;
  name: string;
  card_image_url: string;
  has_details: boolean;
  bookmark_count: string;
}

interface SkillstoreSearchBarProps {
  mobile?: boolean;
}

export default function SkillstoreSearchBar({ mobile = false }: SkillstoreSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isClient, setIsClient] = useState(false); // ✅ NEW: Hydration fix
  
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // ✅ NEW: Only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const performSearch = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/skillstore/search?q=${encodeURIComponent(query)}`
      );
      const result = await response.json();

      if (result.status === 'success') {
        setSuggestions(result.data.slice(0, 4));
        setShowSuggestions(result.data.length > 0);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedIndex(-1);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      performSearch(value.trim());
    }, 300);
  };

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery.trim();
    if (searchTerm.length === 0) return;

    setShowSuggestions(false);
    router.push(`/skillstore/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleSuggestionClick = (skillName: string) => {
    setSearchQuery(skillName);
    handleSearch(skillName);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex].name);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Don't render until client-side hydration complete
  if (!isClient) {
    return null;
  }

  if (mobile) {
    return (
      <div className="w-full px-4 py-3 border-t border-purple-100">
        <div className="relative" ref={searchRef}>
          <div className="flex items-center bg-white border border-purple-200 rounded-lg overflow-hidden focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
            <span className="px-3 py-2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>

            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
              className="flex-1 px-2 py-2 outline-none text-sm"
            />

            {searchQuery && (
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    handleSearch();
                  } else {
                    setSearchQuery('');
                    setSuggestions([]);
                  }
                }}
                className="px-3 py-2 text-purple-600 hover:bg-purple-50 transition-colors"
                title="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg shadow-lg z-50">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.name)}
                  className={`w-full px-4 py-3 text-left border-b last:border-b-0 transition-colors ${
                    index === selectedIndex
                      ? 'bg-purple-100'
                      : 'hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={suggestion.card_image_url}
                      alt={suggestion.name}
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect fill="%23f3f4f6" width="32" height="32"/%3E%3C/svg%3E';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ⭐ {suggestion.bookmark_count} bookmarks
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg p-3 text-center">
              <span className="text-sm text-gray-600">Searching...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 max-w-md" ref={searchRef}>
      <div className="flex items-center bg-white border border-purple-200 rounded-lg overflow-hidden focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
        <span className="px-3 py-2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>

        <input
          type="text"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
          className="flex-1 px-2 py-2 outline-none text-sm"
        />

        <button
          onClick={() => handleSearch()}
          className="px-3 py-2 text-purple-600 hover:bg-purple-50 transition-colors"
          title="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg shadow-lg z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.name)}
              className={`w-full px-4 py-3 text-left border-b last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-purple-100'
                  : 'hover:bg-purple-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={suggestion.card_image_url}
                  alt={suggestion.name}
                  className="w-8 h-8 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect fill="%23f3f4f6" width="32" height="32"/%3E%3C/svg%3E';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ⭐ {suggestion.bookmark_count} bookmarks
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg p-3 text-center">
          <span className="text-sm text-gray-600">Searching...</span>
        </div>
      )}
    </div>
  );
}
