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
  
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    pagination: false,
    sorting: false
  });

  const CACHE_CONFIG = {
    ttl: 3 * 60 * 1000,
    maxCacheSize: 50,
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

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000);

    return () => clearInterval(interval);
  }, [categoryId]);

  const initializeCategoryPage = async () => {
    try {
      const cachedData = loadFromCache(currentPage, sortBy);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, pagination: false, sorting: false });
        console.log(`🚀 Category ${categoryId} loaded from cache`);
        
        const age = Date.now() - getCacheTimestamp(currentPage, sortBy);
        if (age > 60000) {
          await fetchCategoryProducts(false);
        }
      } else {
        await fetchCategoryProducts(true);
      }
    } catch (error) {
      console.error('Category initialization error:', error);
      await fetchCategoryProducts(true);
    }
  };

  const loadFromCache = (page: number, sort: SortOption): CategoryPageData | null => {
    try {
      const cacheKey = `studentstore_category_${categoryId}_p${page}_${sort}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for category ${categoryId}`);
          return data;
        } else {
          localStorage.removeItem(cacheKey);
          console.log(`⏰ Cache expired`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache loading error:', error);
      return null;
    }
  };

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
      cleanupOldCache();
      console.log(`💾 Cached category ${categoryId}`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  const cleanupOldCache = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`studentstore_category_${categoryId}_`)) {
          keys.push(key);
        }
      }
      
      const cacheEntries = keys.map(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const { timestamp } = JSON.parse(data);
          return { key, timestamp };
        }
        return null;
      }).filter(Boolean) as Array<{ key: string; timestamp: number }>;
      
      if (cacheEntries.length > CACHE_CONFIG.maxCacheSize) {
        cacheEntries.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = cacheEntries.slice(CACHE_CONFIG.maxCacheSize);
        
        toDelete.forEach(({ key }) => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  };

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

  const checkAndRefreshExpiredCache = useCallback(async () => {
    if (!data || !categoryId) return;
    
    const age = Date.now() - getCacheTimestamp(currentPage, sortBy);
    
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered');
      await fetchCategoryProducts(false);
    }
  }, [categoryId, currentPage, sortBy, data]);

  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh category ${categoryId}`);
    
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

  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type, categoryId: updatedCategoryId } = event.detail;
      
      if (type === 'category' || type === 'product' || 
          (updatedCategoryId && updatedCategoryId === categoryId)) {
        console.log('🔄 Admin update detected');
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [categoryId, forceRefresh]);

  const fetchCategoryProducts = async (showMainLoading: boolean = true) => {
    try {
      if (showMainLoading) {
        setLoading(true);
      } else if (currentPage !== (data?.pagination.current_page || 1)) {
        setLoadingStates(prev => ({ ...prev, pagination: true }));
      } else if (sortBy !== 'newest') {
        setLoadingStates(prev => ({ ...prev, sorting: true }));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
        
        saveToCache(pageData, currentPage, sortBy);
        console.log(`🔄 Category ${categoryId} updated`);
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

  const handlePageChange = (page: number) => {
    const cachedData = loadFromCache(page, sortBy);
    
    if (cachedData) {
      setData(cachedData);
      setCurrentPage(page);
      console.log(`⚡ Instant page change to ${page}`);
    } else {
      setLoadingStates(prev => ({ ...prev, pagination: true }));
      setCurrentPage(page);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: SortOption) => {
    const cachedData = loadFromCache(1, newSort);
    
    if (cachedData) {
      setData(cachedData);
      setSortBy(newSort);
      setCurrentPage(1);
      console.log(`⚡ Instant sort change to ${newSort}`);
    } else {
      setLoadingStates(prev => ({ ...prev, sorting: true }));
      setSortBy(newSort);
      setCurrentPage(1);
    }
  };

  const ProductGridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-32 sm:h-40 md:h-48 lg:h-64 rounded-lg mb-2 sm:mb-3 md:mb-4"></div>
          <div className="bg-gray-200 h-3 sm:h-4 rounded w-3/4 mb-1 sm:mb-2"></div>
          <div className="bg-gray-200 h-2 sm:h-3 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  if (loading && loadingStates.initial) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading category products...
            </p>
            <p className="text-student-secondary text-xs sm:text-sm mt-1 sm:mt-2">
              Setting up your personalized view
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="text-4 sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">😕</div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 px-2">
              Oops! Something went wrong
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
              {error}
            </p>
            <button
              onClick={() => fetchCategoryProducts(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
            >
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="text-4 sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">📂</div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 px-2">
              Category not found
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
              The category you're looking for doesn't exist.
            </p>
            <a
              href="/"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
            >
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

      {/* Breadcrumb - MOBILE RESPONSIVE */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 md:pt-8">
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 shadow-md overflow-x-auto">
          <a href="/" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex-shrink-0">
            🏠 StudentStore
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold whitespace-nowrap flex-shrink-0">
            📂 {data.category.name}
          </span>
        </nav>
      </div>

      {/* Header - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 mb-6 sm:mb-8 md:mb-12">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-student-blue to-student-green rounded-lg sm:rounded-xl md:rounded-2xl mb-2 sm:mb-3 md:mb-6 shadow-lg">
              <span className="text-lg sm:text-xl md:text-3xl text-white">📂</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 break-words px-2">
              {data.category.name}
            </h1>

            
            {data.category.description && (
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-student-secondary max-w-3xl mx-auto mb-4 sm:mb-6 leading-relaxed px-2">
                {data.category.description}
              </p>
            )}
            
            {/* Category Stats - MOBILE RESPONSIVE */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-blue">
                  {data.pagination.total}
                </div>
                <div className="text-xs sm:text-sm text-student-secondary">
                  Products
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-green">
                  {Math.floor(Math.random() * 1000) + 500}+
                </div>
                <div className="text-xs sm:text-sm text-student-secondary">
                  Students
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-orange">
                  4.{Math.floor(Math.random() * 9) + 1}
                </div>
                <div className="text-xs sm:text-sm text-student-secondary">
                  Rating
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-student-blue to-student-green h-1 w-16 sm:w-20 md:w-24 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Controls - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 mb-6 sm:mb-8">
        <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light">
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-0 md:flex-row md:justify-between md:items-center">
            
            {/* Results Info - MOBILE RESPONSIVE */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="text-student-secondary">
                Showing <span className="font-semibold text-student-primary">{data.products.length}</span> of{' '}
                <span className="font-semibold text-student-primary">{data.pagination.total}</span>
              </div>
              <div className="hidden sm:block h-3 w-px bg-border-light"></div>
              <div className="text-student-secondary">
                Page {data.pagination.current_page} of {data.pagination.total_pages}
              </div>
              
              {(loadingStates.pagination || loadingStates.sorting) && (
                <>
                  <div className="hidden sm:block h-3 w-px bg-border-light"></div>
                  <div className="flex items-center text-student-blue text-xs sm:text-sm">
                    <div className="animate-spin h-2.5 w-2.5 sm:h-3 sm:w-3 border border-current border-t-transparent rounded-full mr-1.5 flex-shrink-0"></div>
                    <span className="truncate">
                      {loadingStates.pagination ? 'Loading...' : 'Sorting...'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Controls - MOBILE RESPONSIVE */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sort Dropdown */}
              <div className="relative flex-1 sm:flex-none min-w-[150px]">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  disabled={loadingStates.sorting}
                  className="w-full appearance-none bg-student-light border border-border-light rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 pr-7 text-xs sm:text-sm text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue transition-all disabled:opacity-50"
                >
                  <option value="newest">🆕 Newest</option>
                  <option value="popular">🔥 Popular</option>
                  <option value="rating">⭐ Rating</option>
                  <option value="reviews">💬 Reviews</option>
                  <option value="oldest">📅 Oldest</option>
                </select>
                <svg className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-student-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-student-light rounded-lg p-0.5 sm:p-1 border border-border-light gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 sm:p-1.5 rounded transition-all text-xs sm:text-sm ${
                    viewMode === 'grid' 
                      ? 'bg-student-blue text-white shadow' 
                      : 'text-student-secondary hover:text-student-primary'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 sm:p-1.5 rounded transition-all text-xs sm:text-sm ${
                    viewMode === 'list' 
                      ? 'bg-student-blue text-white shadow' 
                      : 'text-student-secondary hover:text-student-primary'
                  }`}
                  title="List view"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 mb-6 sm:mb-8 md:mb-12 lg:mb-16">
        {(loadingStates.pagination || loadingStates.sorting) ? (
          <ProductGridSkeleton />
        ) : data.products.length > 0 ? (
          <>
            {/* Products Grid/List */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8' 
                : 'space-y-3 sm:space-y-4 md:space-y-6'
            } mb-6 sm:mb-8 md:mb-12`}>
              {data.products.map((product) => (
                <div key={product.id} className={viewMode === 'list' ? 'w-full' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Pagination - MOBILE RESPONSIVE */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light">
                <div className="flex flex-col gap-2 sm:gap-3 md:gap-0 md:flex-row md:justify-center md:items-center">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!data.pagination.has_prev || loadingStates.pagination}
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-border-light rounded-lg text-xs sm:text-sm text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1 overflow-x-auto justify-center flex-1 px-2 md:px-4">
                    {Array.from({ length: Math.min(data.pagination.total_pages, 5) }, (_, i) => {
                      let page;
                      if (data.pagination.total_pages <= 5) {
                        page = i + 1;
                      } else {
                        const start = Math.max(1, currentPage - 2);
                        page = start + i;
                        if (page > data.pagination.total_pages) return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={loadingStates.pagination}
                          className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg text-xs sm:text-sm transition-all font-medium flex-shrink-0 ${
                            page === currentPage
                              ? 'bg-student-blue text-white shadow transform scale-105'
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
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-border-light rounded-lg text-xs sm:text-sm text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Pagination Info */}
                <div className="text-center mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm text-student-secondary">
                  Page {currentPage} of {data.pagination.total_pages} • {data.pagination.total} products
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-3 sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 md:mb-6">
                📦
              </div>
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-student-primary mb-2 sm:mb-3 md:mb-4">
                No products found
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-4 sm:mb-6 md:mb-8 leading-relaxed">
                We couldn't find any products in this category yet. Check back soon!
              </p>
              <div className="space-y-2">
                <a
                  href="/"
                  className="block px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg font-medium hover:bg-student-green transition-colors text-xs sm:text-sm"
                >
                  Browse Other Categories
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tips Section - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 mb-6 sm:mb-8 md:mb-16">
        <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 border border-student-blue/20">
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-student-primary mb-1 sm:mb-2 flex items-center justify-center gap-1 sm:gap-2">
              <span>🎓</span>
              <span>Smart Shopping Tips</span>
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-student-secondary">
              Make the most of your budget
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-blue/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-base sm:text-lg">💰</span>
              </div>
              <h4 className="text-xs sm:text-sm md:text-base font-semibold text-student-primary mb-1">
                Compare Prices
              </h4>
              <p className="text-xs text-student-secondary">
                Check multiple sources
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-green/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-base sm:text-lg">⭐</span>
              </div>
              <h4 className="text-xs sm:text-sm md:text-base font-semibold text-student-primary mb-1">
                Read Reviews
              </h4>
              <p className="text-xs text-student-secondary">
                Learn from others
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-orange/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-base sm:text-lg">📋</span>
              </div>
              <h4 className="text-xs sm:text-sm md:text-base font-semibold text-student-primary mb-1">
                Use Wishlist
              </h4>
              <p className="text-xs text-student-secondary">
                Save for later
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
