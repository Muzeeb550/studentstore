'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  category_id: number;
  buy_button_1_name: string;
  buy_button_1_url: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  product_count: number;
}

interface SearchResultsData {
  query: string;
  results: Product[];
  total: number;
  categories: Category[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: {
    category: number | null;
    sort: string;
    min_rating?: number;
  };
}

// 🚀 NEW: Cache management types
interface CacheData {
  data: SearchResultsData;
  timestamp: number;
}

type ViewMode = 'grid' | 'list';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category');
  const sortFilter = searchParams.get('sort') || 'relevance';
  const pageFilter = searchParams.get('page') || '1';
  const minRatingFilter = searchParams.get('min_rating');
  
  const [data, setData] = useState<SearchResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // 🚀 NEW: Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    filtering: false,
    sorting: false,
    pagination: false
  });

  // 🚀 NEW: Cache configuration (matches backend TTL: 180s = 3 minutes)
  const CACHE_CONFIG = {
    ttl: 3 * 60 * 1000, // 3 minutes (matches backend search cache)
    maxCacheSize: 100, // Keep last 100 search combinations
  };

  // Popular student searches (can be from API later)
  const popularSearches = [
    'laptop', 'textbooks', 'calculator', 'notebook', 'headphones', 
    'backpack', 'study guide', 'tablet', 'desk lamp', 'stationery'
  ];

  useEffect(() => {
    if (query.trim()) {
      initializeSearchPage();
    } else {
      setLoading(false);
      setError('Please enter a search query');
    }
  }, [query, categoryFilter, sortFilter, pageFilter, minRatingFilter]);

  // 🚀 NEW: Smart refresh interval for cache management
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [query, categoryFilter, sortFilter, pageFilter, minRatingFilter]);

  // 🚀 NEW: Initialize with smart caching
  const initializeSearchPage = async () => {
    try {
      const cachedData = loadFromCache();
      
      if (cachedData) {
        // Instant display from cache
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, filtering: false, sorting: false, pagination: false });
        console.log(`🚀 Search "${query}" loaded from cache (instant display)`);
        
        // Background refresh if cache is getting old (> 90 seconds)
        const age = Date.now() - getCacheTimestamp();
        if (age > 90000) { // 90 seconds
          await fetchSearchResults(false);
        }
      } else {
        // No cache, fetch fresh data
        await fetchSearchResults(true);
      }
    } catch (error) {
      console.error('Search initialization error:', error);
      await fetchSearchResults(true);
    }
  };

  // 🚀 NEW: Generate cache key for current search
  const getCacheKey = (): string => {
    const filters = [
      `q:${query}`,
      categoryFilter ? `cat:${categoryFilter}` : 'cat:all',
      `sort:${sortFilter}`,
      `page:${pageFilter}`,
      minRatingFilter ? `rating:${minRatingFilter}` : 'rating:any'
    ];
    return `studentstore_search_${filters.join('_')}`;
  };

  // 🚀 NEW: Load from cache with validation
  const loadFromCache = (): SearchResultsData | null => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Return cached data if it's fresh (within TTL)
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for search "${query}" (age: ${Math.floor(age/1000)}s)`);
          return data;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
          console.log(`⏰ Cache expired for search "${query}"`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache loading error:', error);
      return null;
    }
  };

  // 🚀 NEW: Save to cache with cleanup
  const saveToCache = (searchData: SearchResultsData) => {
    try {
      const cacheKey = getCacheKey();
      const cacheData: CacheData = {
        data: searchData,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Cleanup old cache entries
      cleanupOldCache();
      
      console.log(`💾 Cached search "${query}" with filters`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  // 🚀 NEW: Clean up old cache entries
  const cleanupOldCache = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('studentstore_search_')) {
          keys.push(key);
        }
      }
      
      // Sort by timestamp and keep only recent entries
      const cacheEntries = keys.map(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const { timestamp } = JSON.parse(data);
          return { key, timestamp };
        }
        return null;
      }).filter(Boolean) as Array<{ key: string; timestamp: number }>;
      
      // Keep only the most recent entries
      if (cacheEntries.length > CACHE_CONFIG.maxCacheSize) {
        cacheEntries.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = cacheEntries.slice(CACHE_CONFIG.maxCacheSize);
        
        toDelete.forEach(({ key }) => {
          localStorage.removeItem(key);
        });
        
        console.log(`🧹 Cleaned up ${toDelete.length} old search cache entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  };

  // 🚀 NEW: Get cache timestamp
  const getCacheTimestamp = (): number => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        return timestamp;
      }
    } catch (error) {
      console.error('Cache timestamp error:', error);
    }
    return 0;
  };

  // 🚀 NEW: Check and refresh expired cache
  const checkAndRefreshExpiredCache = useCallback(async () => {
    if (!data || !query.trim()) return;
    
    const age = Date.now() - getCacheTimestamp();
    
    // If current cache is expired, refresh in background
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered for expired search cache');
      await fetchSearchResults(false);
    }
  }, [query, data]);

  // 🚀 NEW: Force refresh (for admin updates)
  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh search "${query}"`);
    
    // Clear all search caches (products might have changed)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('studentstore_search_')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    
    await fetchSearchResults(false);
  }, [query]);

  // 🚀 NEW: Listen for admin updates
  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type } = event.detail;
      
      // Refresh if products or categories were updated (affects search results)
      if (type === 'product' || type === 'category') {
        console.log('🔄 Admin update detected, refreshing search results');
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [forceRefresh]);

  // 🚀 ENHANCED: Fetch search results with smart caching
  const fetchSearchResults = async (showMainLoading: boolean = true) => {
    try {
      // Set appropriate loading states
      if (showMainLoading) {
        setLoading(true);
        setLoadingStates({ initial: true, filtering: false, sorting: false, pagination: false });
      } else if (pageFilter !== '1') {
        setLoadingStates(prev => ({ ...prev, pagination: true }));
      } else if (sortFilter !== 'relevance') {
        setLoadingStates(prev => ({ ...prev, sorting: true }));
      } else {
        setLoadingStates(prev => ({ ...prev, filtering: true }));
      }

      // Build search URL with filters
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const searchUrl = new URL(`${apiUrl}/api/public/search`);
      
      // 🚀 Cache busting for admin updates
      const cacheBuster = `t=${Date.now()}&v=${Math.random().toString(36).substr(2, 9)}`;
      
      searchUrl.searchParams.set('q', query);
      if (categoryFilter) searchUrl.searchParams.set('category', categoryFilter);
      if (sortFilter) searchUrl.searchParams.set('sort', sortFilter);
      if (pageFilter) searchUrl.searchParams.set('page', pageFilter);
      if (minRatingFilter) searchUrl.searchParams.set('min_rating', minRatingFilter);
      searchUrl.searchParams.set('limit', '12');
      searchUrl.searchParams.set('cache_bust', cacheBuster);

      const response = await fetch(searchUrl.toString(), {
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const result = await response.json();

      if (result.status === 'success') {
        const searchData = result.data;
        setData(searchData);
        setError('');
        
        // Cache the successful result
        saveToCache(searchData);
        
        console.log(`🔄 Search "${query}" updated from API`);
      } else {
        setError(result.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setError('Failed to search products');
    } finally {
      setLoading(false);
      setLoadingStates({ initial: false, filtering: false, sorting: false, pagination: false });
    }
  };

  // 🚀 ENHANCED: Update filters with optimistic loading
  const updateFilters = useCallback((newCategory?: string, newSort?: string, newPage?: string, newMinRating?: string) => {
    // Build new URL
    const url = new URL(window.location.href);
    
    if (newCategory !== undefined) {
      if (newCategory) {
        url.searchParams.set('category', newCategory);
      } else {
        url.searchParams.delete('category');
      }
    }
    if (newSort) url.searchParams.set('sort', newSort);
    if (newMinRating !== undefined) {
      if (newMinRating) {
        url.searchParams.set('min_rating', newMinRating);
      } else {
        url.searchParams.delete('min_rating');
      }
    }
    if (newPage) {
      url.searchParams.set('page', newPage);
    } else {
      url.searchParams.delete('page');
    }
    
    // Check if we have this filter combination cached
    const tempParams = new URLSearchParams(url.search);
    const cacheKey = `studentstore_search_q:${tempParams.get('q') || query}_cat:${tempParams.get('category') || 'all'}_sort:${tempParams.get('sort') || 'relevance'}_page:${tempParams.get('page') || '1'}_rating:${tempParams.get('min_rating') || 'any'}`;
    
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_CONFIG.ttl) {
          // Instant filter change with cached data
          setData(cachedData);
          window.history.pushState({}, '', url.toString());
          console.log(`⚡ Instant filter change (from cache)`);
          return;
        }
      } catch (error) {
        console.error('Filter cache check error:', error);
      }
    }
    
    // No cache, show loading and navigate
    if (newPage) {
      setLoadingStates(prev => ({ ...prev, pagination: true }));
    } else if (newSort) {
      setLoadingStates(prev => ({ ...prev, sorting: true }));
    } else {
      setLoadingStates(prev => ({ ...prev, filtering: true }));
    }
    
    window.history.pushState({}, '', url.toString());
    window.location.reload();
  }, [query]);

  const handlePageChange = (page: number) => {
    updateFilters(undefined, undefined, page.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSortLabel = (sort: string) => {
    const labels: { [key: string]: string } = {
      relevance: '🎯 Most Relevant',
      newest: '🆕 Newest First',
      oldest: '📅 Oldest First',
      name_asc: '📝 Name A-Z',
      name_desc: '📝 Name Z-A',
      rating: '⭐ Highest Rated',
      popular: '🔥 Most Popular',
      trending: '📈 Trending',
      views: '👁️ Most Viewed'
    };
    return labels[sort] || sort;
  };

  // 🚀 NEW: Enhanced loading components
  const SearchSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:w-1/4">
          <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
        </div>
        
        {/* Results skeleton */}
        <div className="lg:w-3/4">
          <div className="animate-pulse bg-gray-200 h-16 rounded-xl mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 🚀 NEW: Cache status indicator (development only)
  const CacheStatusIndicator = () => {
    const cacheAge = getCacheTimestamp();
    const age = cacheAge ? Math.floor((Date.now() - cacheAge) / 1000) : 0;
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Search Cache: {age > 0 ? `${age}s` : 'none'}
        <button 
          onClick={forceRefresh} 
          className="ml-2 text-yellow-300 hover:text-yellow-100"
          title="Force refresh"
        >
          ↻
        </button>
      </div>
    );
  };

  if (loading && loadingStates.initial) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Searching for "{query}"...</p>
            <p className="text-student-secondary text-sm mt-2">Finding the best products for students</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !query.trim()) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-6">🔍</div>
            <h1 className="text-3xl font-bold text-student-primary mb-4">Start Your StudentStore Search</h1>
            <p className="text-student-secondary mb-8 max-w-2xl mx-auto text-lg">
              Find exactly what you need for your student life - from textbooks to tech gear, all curated by fellow students
            </p>
            
            {/* Popular Searches */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-student-primary mb-4">🔥 Popular Student Searches:</h3>
              <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                {popularSearches.map((search) => (
                  <a
                    key={search}
                    href={`/search?q=${encodeURIComponent(search)}`}
                    className="bg-student-card hover:bg-student-light text-student-primary px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-border-light hover:border-student-blue hover:shadow-md"
                  >
                    {search}
                  </a>
                ))}
              </div>
            </div>

            <a href="/" className="btn-primary inline-block">
              🏠 Browse Categories
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Search Error</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <button onClick={() => fetchSearchResults(true)} className="btn-primary mr-4">
              Try Again
            </button>
            <a href="/" className="btn-secondary inline-block">
              Back to StudentStore
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <SearchSkeleton />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* 🚀 NEW: Cache status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {/* Enhanced Search Header - StudentStore Style */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center">
            🔍 Search Results
          </span>
        </nav>

        {/* Search Results Header */}
        <div className="bg-student-card rounded-2xl p-8 shadow-xl border border-border-light mb-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-student-primary mb-4">
              Search Results
            </h1>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-student-blue to-student-green rounded-xl flex items-center justify-center">
                <span className="text-xl text-white">🔍</span>
              </div>
              <div className="text-left">
                {data.total > 0 ? (
                  <p className="text-lg text-student-primary">
                    Found <span className="font-bold text-student-green">{data.total}</span> student-verified products
                  </p>
                ) : (
                  <p className="text-lg text-student-primary">No products found</p>
                )}
                <p className="text-student-secondary">
                  for "<span className="font-semibold text-student-blue">{query}</span>"
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            {data.total > 0 && (
              <div className="flex justify-center items-center space-x-6 text-sm mt-4">
                <div className="text-center">
                  <div className="text-student-blue font-bold">{data.categories.length}</div>
                  <div className="text-student-secondary">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-student-green font-bold">{data.pagination.total_pages}</div>
                  <div className="text-student-secondary">Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-student-orange font-bold">
                    {Math.floor(Math.random() * 500 + 200)}
                  </div>
                  <div className="text-student-secondary">Students Searched</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Controls - Enhanced */}
        {data.total > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Left Sidebar - Category Filters */}
            <div className="lg:w-1/4">
              <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-student-primary flex items-center">
                    📂 Filter by Category
                  </h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden text-student-secondary hover:text-student-primary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showFilters ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                  </button>
                </div>
                
                <div className={`space-y-2 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                  <button
                    onClick={() => updateFilters('')}
                    disabled={loadingStates.filtering}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex justify-between items-center disabled:opacity-50 ${
                      !data.filters.category 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-primary hover:bg-student-light border border-border-light'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">🔗</span>
                      All Categories
                      {loadingStates.filtering && !data.filters.category && (
                        <div className="ml-2 animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                      )}
                    </span>
                    <span className="text-sm opacity-75">({data.total})</span>
                  </button>
                  
                  {data.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => updateFilters(category.id.toString())}
                      disabled={loadingStates.filtering}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex justify-between items-center disabled:opacity-50 ${
                        data.filters.category === category.id
                          ? 'bg-student-green text-white shadow-md' 
                          : 'text-student-primary hover:bg-student-light border border-border-light'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2">📂</span>
                        {category.name}
                        {loadingStates.filtering && data.filters.category === category.id && (
                          <div className="ml-2 animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                        )}
                      </span>
                      <span className="text-sm opacity-75">({category.product_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content - Results and Controls */}
            <div className="lg:w-3/4">
              {/* Top Controls Bar */}
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  {/* Results Info */}
                  <div className="flex items-center space-x-4">
                    <p className="text-student-secondary">
                      Showing <span className="font-semibold text-student-primary">{data.results.length}</span> of{' '}
                      <span className="font-semibold text-student-primary">{data.total}</span> results
                    </p>
                    <div className="h-4 w-px bg-border-light"></div>
                    <p className="text-student-secondary text-sm">
                      Page {data.pagination.current_page} of {data.pagination.total_pages}
                    </p>
                    
                    {/* 🚀 NEW: Loading indicators */}
                    {(loadingStates.filtering || loadingStates.sorting || loadingStates.pagination) && (
                      <>
                        <div className="h-4 w-px bg-border-light"></div>
                        <div className="flex items-center text-student-blue text-sm">
                          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2"></div>
                          {loadingStates.pagination ? 'Loading page...' : 
                           loadingStates.sorting ? 'Sorting...' : 'Filtering...'}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-4">
                    {/* Sort Dropdown - Enhanced */}
                    <div className="relative">
                      <select
                        value={data.filters.sort}
                        onChange={(e) => updateFilters(undefined, e.target.value)}
                        disabled={loadingStates.sorting}
                        className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200 disabled:opacity-50"
                      >
                        <option value="relevance">🎯 Most Relevant</option>
                        <option value="newest">🆕 Newest First</option>
                        <option value="rating">⭐ Highest Rated</option>
                        <option value="popular">🔥 Most Popular</option>
                        <option value="trending">📈 Trending</option>
                        <option value="name_asc">📝 Name A-Z</option>
                        <option value="name_desc">📝 Name Z-A</option>
                        <option value="oldest">📅 Oldest First</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        {loadingStates.sorting ? (
                          <div className="animate-spin h-4 w-4 border border-student-blue border-t-transparent rounded-full"></div>
                        ) : (
                          <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-student-light rounded-xl p-1 border border-border-light">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          viewMode === 'grid' 
                            ? 'bg-student-blue text-white shadow-md' 
                            : 'text-student-secondary hover:text-student-primary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          viewMode === 'list' 
                            ? 'bg-student-blue text-white shadow-md' 
                            : 'text-student-secondary hover:text-student-primary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid/List - Enhanced with Loading States */}
              {loadingStates.filtering || loadingStates.sorting ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <div className={`${
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-6'
                  } mb-8`}>
                  {data.results.map((product) => (
                    <div key={product.id} className={viewMode === 'list' ? 'w-full' : ''}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}

              {/* Enhanced Pagination - StudentStore Style */}
              {data.pagination.total_pages > 1 && (
                <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
                  <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(data.pagination.current_page - 1)}
                      disabled={!data.pagination.has_prev || loadingStates.pagination}
                      className="flex items-center px-4 py-2 border border-border-medium rounded-xl text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex space-x-2">
                      {Array.from({ length: Math.min(data.pagination.total_pages, 7) }, (_, i) => {
                        let pageNum;
                        if (data.pagination.total_pages <= 7) {
                          pageNum = i + 1;
                        } else {
                          const current = data.pagination.current_page;
                          const total = data.pagination.total_pages;
                          if (current <= 4) {
                            pageNum = i + 1;
                          } else if (current >= total - 3) {
                            pageNum = total - 6 + i;
                          } else {
                            pageNum = current - 3 + i;
                          }
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loadingStates.pagination}
                            className={`px-3 py-2 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 ${
                              pageNum === data.pagination.current_page
                                ? 'bg-student-blue text-white shadow-md transform scale-105'
                                : 'text-student-primary hover:bg-student-light border border-border-light'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(data.pagination.current_page + 1)}
                      disabled={!data.pagination.has_next || loadingStates.pagination}
                      className="flex items-center px-4 py-2 border border-border-medium rounded-xl text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                    >
                      Next
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Pagination Info */}
                  <div className="text-center mt-4 text-sm text-student-secondary">
                    Page {data.pagination.current_page} of {data.pagination.total_pages} • {data.total} total results
                    {loadingStates.pagination && (
                      <div className="flex items-center justify-center mt-2">
                        <div className="animate-spin h-4 w-4 border border-student-blue border-t-transparent rounded-full mr-2"></div>
                        <span className="text-student-blue">Loading page...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced No Results - StudentStore Style */}
        {data.total === 0 && (
          <div className="text-center py-16">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-6xl mb-6">📭</div>
              <h3 className="text-2xl font-semibold text-student-primary mb-4">
                No products found for "{query}"
              </h3>
              
              <div className="space-y-6">
                <p className="text-student-secondary leading-relaxed">
                  We couldn't find any student-verified products matching your search. But don't worry - we're here to help!
                </p>
                
                {/* Search Suggestions */}
                <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-6">
                  <h4 className="font-semibold text-student-blue mb-4 flex items-center justify-center">
                    💡 Try These Student Search Tips:
                  </h4>
                  <ul className="text-sm text-student-primary space-y-2 text-left max-w-md mx-auto">
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Check your spelling and try different keywords
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Use more general terms (e.g., "laptop" instead of "MacBook Pro 16")
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Browse categories to discover what's available
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Check out trending student searches below
                    </li>
                  </ul>
                </div>

                {/* Popular Searches */}
                <div>
                  <h4 className="font-semibold text-student-primary mb-4">🔥 Popular Student Searches:</h4>
                  <div className="flex flex-wrap justify-center gap-3">
                    {popularSearches.slice(0, 6).map((search) => (
                      <a
                        key={search}
                        href={`/search?q=${encodeURIComponent(search)}`}
                        className="bg-student-light hover:bg-student-blue hover:text-white text-student-primary px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-border-light hover:border-student-blue"
                      >
                        {search}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="/" className="btn-primary">
                    🏠 Browse Categories
                  </a>
                  <a href="/search" className="btn-success">
                    🔍 Try New Search
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
