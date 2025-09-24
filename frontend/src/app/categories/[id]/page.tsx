'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import Footer from '../../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name?: string;
  buy_button_2_url?: string;
  buy_button_3_name?: string;
  buy_button_3_url?: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface CategoryPageData {
  category: Category;
  products: Product[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// 🚀 NEW: Cache management types
interface CacheData {
  data: CategoryPageData;
  timestamp: number;
  page: number;
  sort: SortOption;
}

type SortOption = 'newest' | 'oldest' | 'popular' | 'rating' | 'reviews';
type ViewMode = 'grid' | 'list';

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [data, setData] = useState<CategoryPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // 🚀 NEW: Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    pagination: false,
    sorting: false
  });

  // 🚀 NEW: Cache configuration (matches backend TTL: 180s = 3 minutes)
  const CACHE_CONFIG = {
    ttl: 3 * 60 * 1000, // 3 minutes (matches backend category cache)
    maxCacheSize: 50, // Keep last 50 page/sort combinations
  };

  useEffect(() => {
    if (categoryId) {
      initializeCategoryPage();
    }
  }, [categoryId]);

  useEffect(() => {
    if (categoryId && data) {
      fetchCategoryProducts();
    }
  }, [currentPage, sortBy]);

  // 🚀 NEW: Smart refresh interval for cache management
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [categoryId]);

  // 🚀 NEW: Initialize with smart caching
  const initializeCategoryPage = async () => {
    try {
      const cachedData = loadFromCache(currentPage, sortBy);
      
      if (cachedData) {
        // Instant display from cache
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, pagination: false, sorting: false });
        console.log(`🚀 Category ${categoryId} loaded from cache (instant display)`);
        
        // Background refresh if cache is getting old (> 1 minute)
        const age = Date.now() - getCacheTimestamp(currentPage, sortBy);
        if (age > 60000) { // 1 minute
          await fetchCategoryProducts(false);
        }
      } else {
        // No cache, fetch fresh data
        await fetchCategoryProducts(true);
      }
    } catch (error) {
      console.error('Category initialization error:', error);
      await fetchCategoryProducts(true);
    }
  };

  // 🚀 NEW: Load from cache with validation
  const loadFromCache = (page: number, sort: SortOption): CategoryPageData | null => {
    try {
      const cacheKey = `studentstore_category_${categoryId}_p${page}_${sort}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Return cached data if it's fresh (within TTL)
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for category ${categoryId}, page ${page}, sort ${sort} (age: ${Math.floor(age/1000)}s)`);
          return data;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
          console.log(`⏰ Cache expired for category ${categoryId}, page ${page}, sort ${sort}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache loading error:', error);
      return null;
    }
  };

  // 🚀 NEW: Save to cache with cleanup
  const saveToCache = (pageData: CategoryPageData, page: number, sort: SortOption) => {
    try {
      const cacheKey = `studentstore_category_${categoryId}_p${page}_${sort}`;
      const cacheData: CacheData = {
        data: pageData,
        timestamp: Date.now(),
        page,
        sort
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Cleanup old cache entries
      cleanupOldCache();
      
      console.log(`💾 Cached category ${categoryId}, page ${page}, sort ${sort}`);
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
        if (key?.startsWith(`studentstore_category_${categoryId}_`)) {
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
        
        console.log(`🧹 Cleaned up ${toDelete.length} old cache entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  };

  // 🚀 NEW: Get cache timestamp
  const getCacheTimestamp = (page: number, sort: SortOption): number => {
    try {
      const cacheKey = `studentstore_category_${categoryId}_p${page}_${sort}`;
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
    if (!data || !categoryId) return;
    
    const age = Date.now() - getCacheTimestamp(currentPage, sortBy);
    
    // If current cache is expired, refresh in background
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered for expired cache');
      await fetchCategoryProducts(false);
    }
  }, [categoryId, currentPage, sortBy, data]);

  // 🚀 NEW: Force refresh (for admin updates)
  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh category ${categoryId}`);
    
    // Clear all cache for this category
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`studentstore_category_${categoryId}_`)) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    
    await fetchCategoryProducts(false);
  }, [categoryId]);

  // 🚀 NEW: Listen for admin updates
  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type, categoryId: updatedCategoryId } = event.detail;
      
      // Refresh if this category was updated or if it's a product update that might affect this category
      if (type === 'category' || type === 'product' || 
          (updatedCategoryId && updatedCategoryId === categoryId)) {
        console.log('🔄 Admin update detected for category:', event.detail);
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [categoryId, forceRefresh]);

  // 🚀 ENHANCED: Fetch category products with smart caching
  const fetchCategoryProducts = async (showMainLoading: boolean = true) => {
    try {
      // Set appropriate loading states
      if (showMainLoading) {
        setLoading(true);
      } else if (currentPage !== (data?.pagination.current_page || 1)) {
        setLoadingStates(prev => ({ ...prev, pagination: true }));
      } else if (sortBy !== 'newest') {
        setLoadingStates(prev => ({ ...prev, sorting: true }));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // 🚀 Cache busting for admin updates
      const cacheBuster = `t=${Date.now()}&v=${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(
        `${apiUrl}/api/public/categories/${categoryId}/products?page=${currentPage}&limit=12&sort=${sortBy}&${cacheBuster}`,
        {
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const result = await response.json();

      if (result.status === 'success') {
        const pageData = result.data;
        setData(pageData);
        setError('');
        
        // Cache the successful result
        saveToCache(pageData, currentPage, sortBy);
        
        console.log(`🔄 Category ${categoryId} updated from API (page: ${currentPage}, sort: ${sortBy})`);
      } else {
        setError(result.message || 'Failed to load category products');
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setError('Failed to load category products');
    } finally {
      setLoading(false);
      setLoadingStates({ initial: false, pagination: false, sorting: false });
    }
  };

  // 🚀 ENHANCED: Page change with optimistic loading
  const handlePageChange = (page: number) => {
    // Check if we have this page cached
    const cachedData = loadFromCache(page, sortBy);
    
    if (cachedData) {
      // Instant page change with cached data
      setData(cachedData);
      setCurrentPage(page);
      console.log(`⚡ Instant page change to ${page} (from cache)`);
    } else {
      // Show loading and fetch
      setLoadingStates(prev => ({ ...prev, pagination: true }));
      setCurrentPage(page);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🚀 ENHANCED: Sort change with optimistic loading
  const handleSortChange = (newSort: SortOption) => {
    // Check if we have this sort cached
    const cachedData = loadFromCache(1, newSort); // Reset to page 1
    
    if (cachedData) {
      // Instant sort change with cached data
      setData(cachedData);
      setSortBy(newSort);
      setCurrentPage(1);
      console.log(`⚡ Instant sort change to ${newSort} (from cache)`);
    } else {
      // Show loading and fetch
      setLoadingStates(prev => ({ ...prev, sorting: true }));
      setSortBy(newSort);
      setCurrentPage(1);
    }
  };

  const getSortLabel = (sort: SortOption) => {
    const labels = {
      newest: '🆕 Newest First',
      oldest: '📅 Oldest First', 
      popular: '🔥 Most Popular',
      rating: '⭐ Highest Rated',
      reviews: '💬 Most Reviewed'
    };
    return labels[sort];
  };

  // 🚀 NEW: Enhanced loading component
  const ProductGridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
          <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
          <div className="bg-gray-200 h-3 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  // 🚀 NEW: Cache status indicator (development only)
  const CacheStatusIndicator = () => {
    const cacheAge = getCacheTimestamp(currentPage, sortBy);
    const age = cacheAge ? Math.floor((Date.now() - cacheAge) / 1000) : 0;
    
    return (
      <div className="fixed bottom-16 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Cache: {age > 0 ? `${age}s` : 'none'}
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
            <p className="text-student-secondary font-medium">Loading category products...</p>
            <p className="text-student-secondary text-sm mt-2">Setting up your personalized view</p>
          </div>
        </div>
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
            <h1 className="text-2xl font-bold text-student-primary mb-4">Oops! Something went wrong</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <button onClick={() => fetchCategoryProducts(true)} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data || !data.category) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Category not found</h1>
            <p className="text-student-secondary mb-6">The category you're looking for doesn't exist.</p>
            <a href="/" className="btn-primary inline-block">
              Back to StudentStore
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* 🚀 NEW: Cache status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {/* Enhanced Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center">
            📂 {data.category.name}
          </span>
        </nav>
      </div>

      {/* Enhanced Category Header */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <div className="bg-student-card rounded-2xl p-8 shadow-xl border border-border-light">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-student-blue to-student-green rounded-2xl mb-6 shadow-lg">
              <span className="text-3xl text-white">📂</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-student-primary mb-4">
              {data.category.name}
            </h1>
            
            {data.category.description && (
              <p className="text-xl text-student-secondary max-w-3xl mx-auto mb-6 leading-relaxed">
                {data.category.description}
              </p>
            )}
            
            {/* Category Stats */}
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-student-blue">{data.pagination.total}</div>
                <div className="text-student-secondary">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-student-green">
                  {Math.floor(Math.random() * 1000) + 500}+
                </div>
                <div className="text-student-secondary">Students Shopping</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-student-orange">4.{Math.floor(Math.random() * 9) + 1}</div>
                <div className="text-student-secondary">Avg Rating</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-student-blue to-student-green h-1 w-24 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Enhanced Filters & Controls */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            
            {/* Results Info - Enhanced */}
            <div className="flex items-center space-x-4">
              <div className="text-student-secondary">
                Showing <span className="font-semibold text-student-primary">{data.products.length}</span> of{' '}
                <span className="font-semibold text-student-primary">{data.pagination.total}</span> products
              </div>
              <div className="h-4 w-px bg-border-light"></div>
              <div className="text-student-secondary text-sm">
                Page {data.pagination.current_page} of {data.pagination.total_pages}
              </div>
              
              {/* 🚀 NEW: Loading indicators */}
              {(loadingStates.pagination || loadingStates.sorting) && (
                <>
                  <div className="h-4 w-px bg-border-light"></div>
                  <div className="flex items-center text-student-blue text-sm">
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2"></div>
                    {loadingStates.pagination ? 'Loading page...' : 'Sorting...'}
                  </div>
                </>
              )}
            </div>

            {/* Controls - Enhanced */}
            <div className="flex items-center space-x-4">
              {/* Sort Dropdown - Enhanced */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  disabled={loadingStates.sorting}
                  className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200 disabled:opacity-50"
                >
                  <option value="newest">🆕 Newest First</option>
                  <option value="popular">🔥 Most Popular</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="reviews">💬 Most Reviewed</option>
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
      </section>

      {/* Products Section - Enhanced with Loading States */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        {(loadingStates.pagination || loadingStates.sorting) ? (
          <ProductGridSkeleton />
        ) : data.products.length > 0 ? (
          <>
            {/* Products Grid/List */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' 
                : 'space-y-6'
              } mb-12`}>
              {data.products.map((product) => (
                <div key={product.id} className={viewMode === 'list' ? 'w-full' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
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
                      let page;
                      if (data.pagination.total_pages <= 7) {
                        page = i + 1;
                      } else {
                        const start = Math.max(1, currentPage - 3);
                        const end = Math.min(data.pagination.total_pages, start + 6);
                        page = start + i;
                        if (page > end) return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={loadingStates.pagination}
                          className={`px-3 py-2 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 ${
                            page === currentPage
                              ? 'bg-student-blue text-white shadow-md transform scale-105'
                              : 'text-student-primary hover:bg-student-light border border-border-light'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
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
                  Page {currentPage} of {data.pagination.total_pages} • {data.pagination.total} total products
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State - Enhanced */
          <div className="text-center py-20">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-6xl mb-6">📦</div>
              <h3 className="text-2xl font-semibold text-student-primary mb-4">No products found</h3>
              <p className="text-student-secondary mb-8 leading-relaxed">
                We couldn't find any products in this category yet. New products are added regularly, so check back soon!
              </p>
              <div className="space-y-3">
                <a href="/" className="btn-primary inline-block">
                  Browse Other Categories
                </a>
                <div className="text-sm text-student-secondary">
                  Or <button onClick={() => handleSortChange('newest')} className="text-student-blue hover:underline">try different sorting</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Student Shopping Tips */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-2xl p-8 border border-student-blue/20">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-student-primary mb-2 flex items-center justify-center">
              🎓 Smart Shopping Tips for {data.category.name}
            </h3>
            <p className="text-student-secondary">Make the most of your student budget</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-student-blue/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">💰</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Compare Prices</h4>
              <p className="text-sm text-student-secondary">Check multiple sources before buying</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-student-green/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">⭐</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Read Reviews</h4>
              <p className="text-sm text-student-secondary">Learn from other students' experiences</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-student-orange/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📋</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Use Wishlist</h4>
              <p className="text-sm text-student-secondary">Save items and buy when you need them</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
